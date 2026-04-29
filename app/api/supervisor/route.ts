// app/api/supervisor/route.ts — monitoring data

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCTION_STAGES = new Set([
  "racik_bahan",
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "finishing",
]);

const OPERATIONAL_STAGES = new Set([
  "penerimaan_order",
  "qc_1",
  "laser",
  "qc_2",
  "kelengkapan",
  "qc_3",
  "packing",
  "pelunasan",
  "pengiriman",
]);

const APPROVAL_STAGES = new Set([
  "approval_penerimaan_order",
  "approval_qc_1",
  "approval_qc_2",
  "approval_qc_3",
  "approval_pelunasan",
]);

// Maps approval stage → production stage for pending count logic
const APPROVAL_TO_PRODUCTION_STAGE: Record<string, string> = {
  approval_penerimaan_order: "penerimaan_order",
  approval_qc_1: "qc_1",
  approval_qc_2: "qc_2",
  approval_qc_3: "qc_3",
  approval_pelunasan: "pelunasan",
};

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan Order",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  approval_qc_1: "Approval QC 1",
  finishing: "Finishing",
  laser: "Laser Engraving",
  qc_2: "QC 2",
  approval_qc_2: "Approval QC 2",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3 (Final)",
  approval_qc_3: "Approval QC 3",
  packing: "Packing",
  pelunasan: "Pelunasan & Pembayaran",
  approval_pelunasan: "Approval Pelunasan",
  pengiriman: "Pengiriman & Handover",
};

async function verifySupervisor(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(
      "id, full_name, role:roles!users_role_id_fkey(name, role_group, allowed_stages)",
    )
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const roleName = (data.role as any)?.name;
  const roleGroup = (data.role as any)?.role_group;
  const allowedStages: string[] = (data.role as any)?.allowed_stages ?? [];

  // Allow superadmin, management group, supervisor role, or users with approval stages
  if (
    roleName === "superadmin" ||
    roleGroup === "management" ||
    roleName === "supervisor" ||
    allowedStages.some((s) => s.startsWith("approval_"))
  ) {
    return data;
  }
  return null;
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

    // Fetch active orders and today's submission count in parallel
    const [ordersResult, submissionsTodayResult] = await Promise.allSettled([
      // Active orders with customer info — include approval stages
      admin
        .from("orders")
        .select(
          "id, order_number, product_name, current_stage, status, created_at, updated_at, deadline, customers!orders_customer_id_fkey(name)",
        )
        .not("status", "in", "(completed,cancelled)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),

      // Submissions today — count only
      admin
        .from("stage_results")
        .select("id", { count: "exact" })
        .gte("finished_at", todayStart.toISOString())
        .not("finished_at", "is", null)
        .limit(1),
    ]);

    const orders =
      ordersResult.status === "fulfilled" ? ordersResult.value.data || [] : [];
    const submissionsToday =
      submissionsTodayResult.status === "fulfilled"
        ? submissionsTodayResult.value.count || 0
        : 0;

    // ── Accurate pending count — orders at approval stages ────────────────────
    let pendingCount = 0;
    const { data: waitingOrders } = await admin
      .from("orders")
      .select("id, current_stage")
      .in("status", ["waiting_approval", "in_progress"])
      .in("current_stage", [...APPROVAL_STAGES])
      .is("deleted_at", null)
      .limit(100);

    if (waitingOrders && waitingOrders.length > 0) {
      // Separate penerimaan_order approvals (no stage_result) from others
      const penerimaanApprovals = waitingOrders.filter(
        (o: any) => o.current_stage === "approval_penerimaan_order",
      );
      pendingCount += penerimaanApprovals.length;

      const otherIds = waitingOrders
        .filter((o: any) => o.current_stage !== "approval_penerimaan_order")
        .map((o: any) => o.id);

      if (otherIds.length > 0) {
        // Fetch stage_results for the corresponding production stages
        const { data: srRows } = await admin
          .from("stage_results")
          .select("order_id, stage, data, attempt_number")
          .in("order_id", otherIds)
          .not("finished_at", "is", null)
          .order("attempt_number", { ascending: false });

        // Build map: orderId → production stage we expect
        const orderExpectedStage = new Map<string, string>();
        for (const o of waitingOrders) {
          const prodStage = APPROVAL_TO_PRODUCTION_STAGE[o.current_stage];
          if (prodStage) {
            orderExpectedStage.set(o.id, prodStage);
          }
        }

        const seen = new Set<string>();
        for (const r of srRows ?? []) {
          const expected = orderExpectedStage.get(r.order_id);
          if (!expected || r.stage !== expected) continue;
          if (seen.has(r.order_id)) continue;
          seen.add(r.order_id);
          pendingCount++;
        }
      }
    }

    // ── Get latest stage_results per order (for "last worker" and duration) ────
    const orderIds = orders.map((o: any) => o.id);
    let latestResults: any[] = [];
    if (orderIds.length > 0) {
      const { data: results } = await admin
        .from("stage_results")
        .select(
          "order_id, stage, finished_at, user_id, users!stage_results_user_id_fkey(full_name)",
        )
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

    // ── Enrich orders ─────────────────────────────────────────────────────────
    const enrichedOrders = orders.map((o: any) => {
      const latest = latestByOrder.get(o.id);

      // Determine stage group
      let group: string;
      if (PRODUCTION_STAGES.has(o.current_stage)) {
        group = "production";
      } else if (OPERATIONAL_STAGES.has(o.current_stage)) {
        group = "operational";
      } else if (APPROVAL_STAGES.has(o.current_stage)) {
        // Approval stages inherit the group of their production stage
        const prodStage = APPROVAL_TO_PRODUCTION_STAGE[o.current_stage];
        group =
          prodStage && OPERATIONAL_STAGES.has(prodStage)
            ? "operational"
            : "production";
      } else {
        group = "other";
      }

      // finished_at of the last completed stage = when the order arrived at current stage
      const arrivedAt =
        latest?.finished_at || (o as any).updated_at || o.created_at;
      const hoursAtStage = arrivedAt
        ? Math.floor(
            (now.getTime() - new Date(arrivedAt).getTime()) / 3_600_000,
          )
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
        last_stage: latest ? STAGE_LABELS[latest.stage] || latest.stage : null,
      };
    });

    const productionCount = enrichedOrders.filter(
      (o: any) => o.stage_group === "production",
    ).length;
    const operationalCount = enrichedOrders.filter(
      (o: any) => o.stage_group === "operational",
    ).length;
    const approvalCount = enrichedOrders.filter((o: any) =>
      APPROVAL_STAGES.has(o.current_stage),
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalActive: orders.length,
          productionCount,
          operationalCount,
          approvalCount,
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
