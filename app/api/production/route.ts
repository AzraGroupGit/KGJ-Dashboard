// app/api/production/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_GROUP } from "@/lib/stages";
import { getRoleProps } from "@/lib/auth/session";

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

const EXPERT_STAGES = Object.entries(STAGE_GROUP)
  .filter(([_, group]) => group === "production")
  .map(([stage]) => stage);

export async function GET(request?: NextRequest) {
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

    if (getRoleProps(profile).name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse date params from query
    const url = request?.url ? new URL(request.url) : null;
    const fromParam = url?.searchParams.get("from");
    const toParam = url?.searchParams.get("to");

    // Helper tanggal
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = fromParam ? new Date(fromParam).toISOString() : sevenDaysAgo.toISOString();

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = fromParam ? new Date(fromParam).toISOString() : thirtyDaysAgo.toISOString();
    const _toDateISO = toParam ? new Date(toParam + "T23:59:59").toISOString() : now.toISOString();

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
      .filter((u) => EXPERT_ROLES.includes(getRoleProps(u).name as typeof EXPERT_ROLES[number]))
      .map((u) => ({
        id: u.id,
        fullName: u.full_name,
        roleName: getRoleProps(u).name,
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
    (todayScans || []).forEach((s) => {
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
              cs_orders!stage_results_order_id_fkey ( order_number )
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
    (activeWork || []).forEach((row) => {
      if (!activeByUser.has(row.user_id)) {
        activeByUser.set(row.user_id, {
          orderNumber: (row as any).orders?.order_number ?? null,
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
    (recentResults || []).forEach((row) => {
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
    (targetRows || []).forEach((row) => {
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
      .from("cs_orders")
      .select("id, order_number, current_stage, status")
      .is("deleted_at", null)
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

    const microOrderIds = (microOrders || []).map((o) => o.id);

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

    const latestMicroByOrder = new Map<string, Record<string, unknown>>();
    (microResults || []).forEach((row) => {
      if (!latestMicroByOrder.has(row.order_id)) {
        latestMicroByOrder.set(row.order_id, row as unknown as Record<string, unknown>);
      }
    });

    const microSetting = (microOrders || [])
      .map((o) => {
        const result = latestMicroByOrder.get(o.id);
        const data = result?.data as Record<string, unknown> | undefined;
        const weightBefore = result
          ? parseFloat(String(data?.weight_before_setting ?? ""))
          : null;
        const weightAfter = result
          ? parseFloat(String(data?.weight_after_setting ?? ""))
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
          gemstone_info: null,
          current_stage: o.current_stage,
          staff_name: (result as any)?.users?.full_name ?? null,
          started_at: (result as any)?.started_at ?? null,
          finished_at: (result as any)?.finished_at ?? null,
          weight_before: isNaN(weightBefore as number) ? null : weightBefore,
          weight_after: isNaN(weightAfter as number) ? null : weightAfter,
          status,
        };
      })
      .sort((a, b) => {
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
      .from("cs_orders")
      .select("id, order_number, created_at, completed_at")
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

    const completedOrderIds = (completedOrders || []).map((o) => o.id);

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
    (qc2Results || []).forEach((row) => {
      if (!qc2ByOrder.has(row.order_id)) {
        const weight = parseFloat(row.data?.weight_final_label);
        if (!isNaN(weight)) qc2ByOrder.set(row.order_id, weight);
      }
    });

    const yieldData = (completedOrders || [])
      .map((o) => {
        const actual = qc2ByOrder.get(o.id) ?? null;

        return {
          order_date: o.created_at,
          order_number: o.order_number,
          target: null,
          actual,
          susut: null,
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
