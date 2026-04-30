// app/api/production/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Role yang termasuk "Jewelry Expert"
const EXPERT_ROLES = [
  "jewelry_expert_lebur_bahan",
  "jewelry_expert_pembentukan_awal",
  "jewelry_expert_finishing",
  "micro_setting",
] as const;

// Mapping role → stage default (yang dikerjakan role tersebut)
const ROLE_DEFAULT_STAGE: Record<string, string> = {
  jewelry_expert_lebur_bahan: "lebur_bahan",
  jewelry_expert_pembentukan_awal: "pembentukan_cincin",
  jewelry_expert_finishing: "finishing",
  micro_setting: "pemasangan_permata",
};

// Stage yang dipakai untuk deteksi "active order" per expert
const EXPERT_STAGES = [
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "laser",
  "finishing",
] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // ========== AUTH ==========
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    if ((profile?.role as any)?.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Helper tanggal
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // ========== 1. DAFTAR EXPERT USERS ==========
    const { data: expertUsers, error: expertUsersError } = await admin
      .from("users")
      .select(
        `
        id,
        full_name,
        status,
        role:roles!users_role_id_fkey ( name )
      `,
      )
      .eq("status", "active")
      .is("deleted_at", null);

    if (expertUsersError) {
      console.error(
        "[GET /api/production] expert users:",
        expertUsersError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data expert" },
        { status: 500 },
      );
    }

    const expertUserList = (expertUsers || [])
      .filter((u: any) => EXPERT_ROLES.includes((u.role as any)?.name))
      .map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        roleName: (u.role as any)?.name as string,
      }));
    const expertUserIds = expertUserList.map((u) => u.id);

    // ========== 2. SCAN EVENTS HARI INI ==========
    const { data: todayScans, error: scansError } =
      expertUserIds.length > 0
        ? await admin
            .from("scan_events")
            .select("user_id, order_id")
            .in("user_id", expertUserIds)
            .gte("scanned_at", todayStartISO)
        : { data: [], error: null };

    if (scansError) {
      console.error("[GET /api/production] scans:", scansError.message);
      return NextResponse.json(
        { error: "Gagal mengambil data scan" },
        { status: 500 },
      );
    }

    const scanStats = new Map<
      string,
      { totalScans: number; orderSet: Set<string> }
    >();
    (todayScans || []).forEach((s: any) => {
      const stat = scanStats.get(s.user_id) ?? {
        totalScans: 0,
        orderSet: new Set(),
      };
      stat.totalScans += 1;
      if (s.order_id) stat.orderSet.add(s.order_id);
      scanStats.set(s.user_id, stat);
    });

    // ========== 3. ACTIVE ORDERS PER EXPERT ==========
    const { data: activeWork, error: activeWorkError } =
      expertUserIds.length > 0
        ? await admin
            .from("stage_results")
            .select(
              `
              user_id,
              stage,
              started_at,
              orders!stage_results_order_id_fkey ( order_number )
            `,
            )
            .in("user_id", expertUserIds)
            .in("stage", EXPERT_STAGES as unknown as string[])
            .is("finished_at", null)
            .order("started_at", { ascending: false })
        : { data: [], error: null };

    if (activeWorkError) {
      console.error(
        "[GET /api/production] active work:",
        activeWorkError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data aktif produksi" },
        { status: 500 },
      );
    }

    const activeByUser = new Map<
      string,
      { orderNumber: string; startedAt: string; stage: string }
    >();
    (activeWork || []).forEach((row: any) => {
      if (!activeByUser.has(row.user_id)) {
        activeByUser.set(row.user_id, {
          orderNumber: row.orders?.order_number ?? null,
          startedAt: row.started_at,
          stage: row.stage,
        });
      }
    });

    // ========== 4. METRIK SUSUT/DEVIASI PER EXPERT ==========
    const { data: recentResults, error: recentResultsError } =
      expertUserIds.length > 0
        ? await admin
            .from("stage_results")
            .select("user_id, stage, data")
            .in("user_id", expertUserIds)
            .in("stage", ["lebur_bahan", "pembentukan_cincin", "pemolesan"])
            .gte("finished_at", thirtyDaysAgoISO)
            .not("finished_at", "is", null)
        : { data: [], error: null };

    if (recentResultsError) {
      console.error(
        "[GET /api/production] recent results:",
        recentResultsError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil metrik susut" },
        { status: 500 },
      );
    }

    const susutByUser = new Map<string, { sum: number; count: number }>();
    (recentResults || []).forEach((row: any) => {
      const stat = susutByUser.get(row.user_id) ?? { sum: 0, count: 0 };
      let deviation: number | null = null;

      if (row.stage === "lebur_bahan") {
        const sp = parseFloat(row.data?.shrinkage_percent);
        if (!isNaN(sp)) deviation = sp;
      } else if (row.stage === "pembentukan_cincin") {
        const lost = parseFloat(row.data?.weight_lost);
        const input = parseFloat(row.data?.weight_input);
        if (!isNaN(lost) && !isNaN(input) && input > 0) {
          deviation = (lost / input) * 100;
        }
      } else if (row.stage === "pemolesan") {
        const lost = parseFloat(row.data?.weight_lost);
        const before = parseFloat(row.data?.weight_before_polish);
        if (!isNaN(lost) && !isNaN(before) && before > 0) {
          deviation = (lost / before) * 100;
        }
      }

      if (deviation != null) {
        stat.sum += deviation;
        stat.count += 1;
        susutByUser.set(row.user_id, stat);
      }
    });

    // ========== 5. TARGET SUSUT DARI WORK_INSTRUCTIONS ==========
    const { data: targetRows } = await admin
      .from("work_instructions")
      .select("stage, parameters")
      .in("stage", ["lebur_bahan", "pembentukan_cincin", "pemolesan"])
      .eq("is_active", true);

    const targetMap: Record<string, number> = {};
    (targetRows || []).forEach((row: any) => {
      const params = row.parameters || {};
      const target =
        parseFloat(params.shrinkage_buffer_percent) ||
        parseFloat(params.max_shrinkage_percent);
      if (!isNaN(target)) {
        targetMap[row.stage] = target;
      }
    });

    // ========== 6. SUSUN FINAL EXPERTS ARRAY ==========
    const experts = expertUserList
      .map((expert) => {
        const stats = scanStats.get(expert.id) ?? {
          totalScans: 0,
          orderSet: new Set(),
        };
        const active = activeByUser.get(expert.id);
        const susut = susutByUser.get(expert.id);

        const activeStage =
          active?.stage ?? ROLE_DEFAULT_STAGE[expert.roleName];
        const rataSusut =
          susut && susut.count > 0 ? susut.sum / susut.count : null;
        const targetSusut = activeStage
          ? (targetMap[activeStage] ?? null)
          : null;

        return {
          userId: expert.id,
          fullName: expert.fullName,
          roleName: expert.roleName,
          stage: activeStage,
          totalScans: stats.totalScans,
          ordersHandled: stats.orderSet.size,
          activeOrder: active
            ? { orderNumber: active.orderNumber, startedAt: active.startedAt }
            : null,
          rataSusut,
          targetSusut,
        };
      })
      .sort((a, b) => b.ordersHandled - a.ordersHandled);

    // ========== 7. MICRO SETTING ==========
    const { data: microOrders, error: microOrdersError } = await admin
      .from("orders")
      .select(
        `
        id,
        order_number,
        gemstone_info,
        has_gemstone,
        current_stage,
        status
      `,
      )
      .is("deleted_at", null)
      .eq("has_gemstone", true)
      .not("status", "in", "(completed,cancelled)")
      .in("current_stage", ["pemasangan_permata", "pemolesan", "qc_1"])
      .limit(10);

    if (microOrdersError) {
      console.error(
        "[GET /api/production] micro orders:",
        microOrdersError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data micro setting" },
        { status: 500 },
      );
    }

    const microOrderIds = (microOrders || []).map((o: any) => o.id);

    const { data: microResults } =
      microOrderIds.length > 0
        ? await admin
            .from("stage_results")
            .select(
              `
              order_id,
              started_at,
              finished_at,
              attempt_number,
              data,
              users!stage_results_user_id_fkey ( full_name )
            `,
            )
            .eq("stage", "pemasangan_permata")
            .in("order_id", microOrderIds)
            .order("attempt_number", { ascending: false })
        : { data: [] };

    const latestMicroByOrder = new Map<string, any>();
    (microResults || []).forEach((row: any) => {
      if (!latestMicroByOrder.has(row.order_id)) {
        latestMicroByOrder.set(row.order_id, row);
      }
    });

    const microSetting = (microOrders || [])
      .map((o: any) => {
        const result = latestMicroByOrder.get(o.id);
        const weightBefore = result
          ? parseFloat(result.data?.weight_before_setting)
          : null;
        const weightAfter = result
          ? parseFloat(result.data?.weight_after_setting)
          : null;

        let status: "waiting" | "in_progress" | "completed";
        if (!result) {
          status = "waiting";
        } else if (result.finished_at) {
          status = "completed";
        } else {
          status = "in_progress";
        }

        return {
          order_id: o.id,
          order_number: o.order_number,
          gemstone_info: o.gemstone_info,
          current_stage: o.current_stage,
          staff_name: result?.users?.full_name ?? null,
          started_at: result?.started_at ?? null,
          finished_at: result?.finished_at ?? null,
          weight_before: isNaN(weightBefore as number) ? null : weightBefore,
          weight_after: isNaN(weightAfter as number) ? null : weightAfter,
          status,
        };
      })
      .sort((a: any, b: any) => {
        const order = { in_progress: 0, waiting: 1, completed: 2 };
        const ao = order[a.status as keyof typeof order];
        const bo = order[b.status as keyof typeof order];
        if (ao !== bo) return ao - bo;
        const at = a.started_at ? new Date(a.started_at).getTime() : 0;
        const bt = b.started_at ? new Date(b.started_at).getTime() : 0;
        return bt - at;
      })
      .slice(0, 20);

    // ========== 8. YIELD MATERIAL ==========
    const { data: completedOrders, error: completedError } = await admin
      .from("orders")
      .select("id, order_number, created_at, target_weight, completed_at")
      .eq("status", "completed")
      .gte("completed_at", sevenDaysAgoISO)
      .order("completed_at", { ascending: false })
      .limit(20);

    if (completedError) {
      console.error(
        "[GET /api/production] completed orders:",
        completedError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data yield" },
        { status: 500 },
      );
    }

    const completedOrderIds = (completedOrders || []).map((o: any) => o.id);

    const { data: qc2Results } =
      completedOrderIds.length > 0
        ? await admin
            .from("stage_results")
            .select("order_id, data")
            .eq("stage", "qc_2")
            .in("order_id", completedOrderIds)
            .order("attempt_number", { ascending: false })
        : { data: [] };

    const qc2ByOrder = new Map<string, number>();
    (qc2Results || []).forEach((row: any) => {
      if (!qc2ByOrder.has(row.order_id)) {
        const weight = parseFloat(row.data?.weight_final_label);
        if (!isNaN(weight)) qc2ByOrder.set(row.order_id, weight);
      }
    });

    const yieldData = (completedOrders || [])
      .map((o: any) => {
        const target = parseFloat(o.target_weight);
        const actual = qc2ByOrder.get(o.id) ?? null;
        const susut = actual != null && !isNaN(target) ? target - actual : null;

        return {
          order_date: o.created_at,
          order_number: o.order_number,
          target,
          actual,
          susut,
        };
      })
      .slice(0, 10);

    // ========== RESPONSE ==========
    return NextResponse.json({
      data: {
        experts,
        microSetting,
        yieldData,
      },
    });
  } catch (error) {
    console.error("[GET /api/production] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
