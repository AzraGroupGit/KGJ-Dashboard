// app/api/bottleneck/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCTION_STAGES = [
  "racik_bahan",
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "finishing",
  "laser",
  "qc_2",
  "kelengkapan",
  "qc_3",
  "packing",
  "pelunasan",
  "pengiriman",
] as const;

const STAGE_LABELS: Record<string, string> = {
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  finishing: "Finishing",
  laser: "Laser Engraving",
  qc_2: "QC 2",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  packing: "Packing",
  pelunasan: "Pelunasan",
  pengiriman: "Pengiriman",
};

const STAGE_GROUPS: Record<string, "production" | "operational"> = {
  racik_bahan: "production",
  lebur_bahan: "production",
  pembentukan_cincin: "production",
  pemasangan_permata: "production",
  pemolesan: "production",
  qc_1: "operational",
  finishing: "production",
  laser: "production",
  qc_2: "operational",
  kelengkapan: "operational",
  qc_3: "operational",
  packing: "operational",
  pelunasan: "operational",
  pengiriman: "operational",
};

interface StageBottleneck {
  stage: string;
  stage_label: string;
  stage_group: string;
  order_count: number;
  waiting_orders: number;
  in_progress_orders: number;
  avg_hours: number | null;
  longest_hours: number | null;
  bottlenecks: {
    order_number: string;
    product_name: string;
    hours_waiting: number | null;
    status: string;
  }[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role:roles!users_role_id_fkey(name, role_group)")
      .eq("id", user.id)
      .single();

    const roleName = (profile?.role as any)?.name;
    const roleGroup = (profile?.role as any)?.role_group;

    // Allow superadmin, management, and supervisor
    if (
      roleName !== "superadmin" &&
      roleGroup !== "management" &&
      roleName !== "supervisor"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    // Get all active orders grouped by current_stage
    const { data: orders, error: ordersError } = await admin // ← CHANGE
      .from("orders")
      .select(
        "id, order_number, product_name, current_stage, status, updated_at",
      )
      .not("status", "in", "(completed,cancelled)")
      .in("current_stage", PRODUCTION_STAGES as unknown as string[])
      .is("deleted_at", null)
      .order("updated_at", { ascending: true });

    if (ordersError) {
      return NextResponse.json(
        { error: "Gagal mengambil data" },
        { status: 500 },
      );
    }

    const orderIds = (orders || []).map((o: any) => o.id);
    let latestResults: any[] = [];
    if (orderIds.length > 0) {
      const { data: results } = await admin
        .from("stage_results")
        .select("order_id, finished_at")
        .in("order_id", orderIds)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false });
      latestResults = results || [];
    }

    const latestByOrder = new Map<string, string>();
    for (const r of latestResults) {
      if (!latestByOrder.has(r.order_id)) {
        latestByOrder.set(r.order_id, r.finished_at);
      }
    }

    // Group by stage
    const stageMap = new Map<string, any[]>();
    for (const order of orders || []) {
      const stage = order.current_stage;
      if (!stageMap.has(stage)) stageMap.set(stage, []);
      stageMap.get(stage)!.push(order);
    }

    const bottlenecks: StageBottleneck[] = PRODUCTION_STAGES.map((stage) => {
      const stageOrders = stageMap.get(stage) || [];
      const waitingOrders = stageOrders.filter(
        (o: any) => o.status === "waiting_approval",
      );
      const inProgressOrders = stageOrders.filter(
        (o: any) => o.status !== "waiting_approval",
      );

      // Calculate hours waiting
      const ordersWithHours = inProgressOrders.map((o: any) => {
        const arrivedAt =
          latestByOrder.get(o.id) || o.updated_at || o.created_at;
        const hours =
          (now.getTime() - new Date(arrivedAt).getTime()) / 3_600_000;
        return { ...o, hours_waiting: hours };
      });

      const hoursValues = ordersWithHours
        .map((o: any) => o.hours_waiting)
        .filter((h: number) => h > 0);
      const avgHours =
        hoursValues.length > 0
          ? hoursValues.reduce((a: number, b: number) => a + b, 0) /
            hoursValues.length
          : null;
      const longestHours =
        hoursValues.length > 0 ? Math.max(...hoursValues) : null;

      // Top bottleneck items (longest waiting)
      const topBottlenecks = ordersWithHours
        .sort((a: any, b: any) => b.hours_waiting - a.hours_waiting)
        .slice(0, 3)
        .map((o: any) => ({
          order_id: o.id,
          order_number: o.order_number,
          product_name: o.product_name,
          hours_waiting: Math.round(o.hours_waiting * 10) / 10,
          status: o.status,
        }));

      return {
        stage,
        stage_label: STAGE_LABELS[stage] || stage,
        stage_group: STAGE_GROUPS[stage] || "production",
        order_count: stageOrders.length,
        waiting_orders: waitingOrders.length,
        in_progress_orders: inProgressOrders.length,
        avg_hours: avgHours ? Math.round(avgHours * 10) / 10 : null,
        longest_hours: longestHours ? Math.round(longestHours * 10) / 10 : null,
        bottlenecks: topBottlenecks,
      };
    }).filter((b) => b.order_count > 0);

    return NextResponse.json({
      success: true,
      data: {
        bottlenecks,
        summary: {
          total_stages_with_orders: bottlenecks.length,
          total_orders: (orders || []).length,
          busiest_stage:
            bottlenecks.length > 0
              ? bottlenecks.reduce((a, b) =>
                  a.order_count > b.order_count ? a : b,
                )
              : null,
          slowest_stage:
            bottlenecks.filter((b) => b.avg_hours).length > 0
              ? bottlenecks
                  .filter((b) => b.avg_hours)
                  .reduce((a, b) =>
                    (a.avg_hours || 0) > (b.avg_hours || 0) ? a : b,
                  )
              : null,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/bottleneck] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
