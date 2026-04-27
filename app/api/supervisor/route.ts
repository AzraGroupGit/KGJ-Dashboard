// app/api/supervisor/route.ts — monitoring data

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCTION_STAGES = new Set([
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "finishing",
]);

const OPERATIONAL_STAGES = new Set([
  "qc_awal",
  "racik_bahan",
  "qc_1",
  "konfirmasi_awal",
  "laser",
  "qc_2",
  "pelunasan",
  "kelengkapan",
  "qc_3",
  "packing",
  "pengiriman",
]);

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Order Masuk",
  qc_awal: "QC Awal",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Bentuk Cincin",
  pemasangan_permata: "Setting Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  konfirmasi_awal: "Konfirmasi",
  finishing: "Finishing",
  laser: "Laser",
  qc_2: "QC 2",
  pelunasan: "Pelunasan",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  packing: "Packing",
  pengiriman: "Pengiriman",
};

async function verifySupervisor(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, full_name, role:roles!users_role_id_fkey(name, role_group)")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  const roleName = (data.role as any)?.name;
  const roleGroup = (data.role as any)?.role_group;
  if (roleName !== "superadmin" && roleGroup !== "management") return null;
  return data;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supervisor = await verifySupervisor(authUser.id);
    if (!supervisor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admin client bypasses RLS for cross-user monitoring queries
    const admin = createAdminClient();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Fetch in parallel
    const [ordersResult, submissionsTodayResult, pendingCountResult] =
      await Promise.allSettled([
        // Active orders with customer info
        admin
          .from("orders")
          .select(
            "id, order_number, product_name, current_stage, status, created_at, deadline, customers!orders_customer_id_fkey(name)",
          )
          .not("status", "in", "(completed,cancelled)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200),

        // Submissions today
        admin
          .from("stage_results")
          .select("id, stage, user_id, finished_at, users!inner(full_name)", { count: "exact" })
          .gte("finished_at", todayStart.toISOString())
          .not("finished_at", "is", null)
          .limit(1),

        // Pending approvals count
        admin
          .from("stage_results")
          .select("id, stage, order_id, data, orders!inner(current_stage, status)", {
            count: "exact",
          })
          .not("finished_at", "is", null)
          .gte("finished_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
          .limit(200),
      ]);

    const orders =
      ordersResult.status === "fulfilled" ? ordersResult.value.data || [] : [];
    const submissionsToday =
      submissionsTodayResult.status === "fulfilled"
        ? submissionsTodayResult.value.count || 0
        : 0;
    const pendingRaw =
      pendingCountResult.status === "fulfilled"
        ? pendingCountResult.value.data || []
        : [];

    // Filter pending: stage matches current_stage, not yet processed by supervisor
    const pendingCount = pendingRaw.filter((r: any) => {
      const order = r.orders;
      if (!order) return false;
      if (order.status === "completed" || order.status === "cancelled") return false;
      if (r.stage !== order.current_stage) return false;
      const svAction = r.data?._sv_action;
      return !svAction; // Not yet processed
    }).length;

    // Get latest stage_results per order (for "last worker" info)
    const orderIds = orders.map((o: any) => o.id);
    let latestResults: any[] = [];
    if (orderIds.length > 0) {
      const { data: results } = await admin
        .from("stage_results")
        .select("order_id, stage, finished_at, started_at, users!inner(full_name)")
        .in("order_id", orderIds)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false });
      latestResults = results || [];
    }

    // Build a map: orderId -> latest result
    const latestByOrder = new Map<string, any>();
    for (const r of latestResults) {
      if (!latestByOrder.has(r.order_id)) {
        latestByOrder.set(r.order_id, r);
      }
    }

    // Enrich orders
    const enrichedOrders = orders.map((o: any) => {
      const latest = latestByOrder.get(o.id);
      const group = PRODUCTION_STAGES.has(o.current_stage)
        ? "production"
        : OPERATIONAL_STAGES.has(o.current_stage)
          ? "operational"
          : "other";

      const stageStartedAt = latest?.started_at || o.created_at;
      const hoursAtStage = stageStartedAt
        ? Math.floor((now.getTime() - new Date(stageStartedAt).getTime()) / 3_600_000)
        : null;

      return {
        id: o.id,
        order_number: o.order_number,
        product_name: o.product_name,
        current_stage: o.current_stage,
        stage_label: STAGE_LABELS[o.current_stage] || o.current_stage,
        stage_group: group,
        deadline: o.deadline,
        customer_name: (o as any).customers?.name || null,
        last_worker: (latest?.users as any)?.full_name || null,
        last_submission_at: latest?.finished_at || null,
        hours_at_stage: hoursAtStage,
      };
    });

    const productionCount = enrichedOrders.filter(
      (o: any) => o.stage_group === "production",
    ).length;
    const operationalCount = enrichedOrders.filter(
      (o: any) => o.stage_group === "operational",
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalActive: orders.length,
          productionCount,
          operationalCount,
          submissionsToday,
          pendingApprovals: pendingCount,
        },
        orders: enrichedOrders,
      },
    });
  } catch (error) {
    console.error("[GET /api/supervisor] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
