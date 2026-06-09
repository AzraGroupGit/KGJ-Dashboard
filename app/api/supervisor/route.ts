// app/api/supervisor/route.ts — monitoring dashboard data

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_LABELS } from "@/lib/stages";

const PRODUCTION_STAGES = new Set([
  "lebur_bahan",
  "pembentukan_cincin",
  "cek_kadar",
  "pemasangan_permata",
  "pemolesan",
  "finishing",
]);

const OPERATIONAL_STAGES = new Set([
  "penerimaan_order",
  "racik_bahan",
  "qc_1",
  "qc_2",
  "laser",
  "konfirmasi",
  "packing",
  "pengiriman",
]);

const APPROVAL_STAGES = new Set([
  "approval_penerimaan_order",
  "approval_racik_bahan",
  "approval_qc_1",
  "approval_produksi",
  "approval_qc_2",
]);

const OPERATIONAL_APPROVAL_STAGES = new Set([
  "approval_penerimaan_order",
  "approval_racik_bahan",
  "approval_qc_1",
  "approval_qc_2",
]);

const PRODUCTION_APPROVAL_STAGES = new Set(["approval_produksi"]);

const APPROVAL_TO_PRODUCTION_STAGE: Record<string, string> = {
  approval_penerimaan_order: "penerimaan_order",
  approval_racik_bahan: "racik_bahan",
  approval_qc_1: "qc_1",
  approval_produksi: "finishing",
  approval_qc_2: "qc_2",
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

  if (
    roleName === "superadmin" ||
    roleGroup === "management" ||
    allowedStages.some((s) => s.startsWith("approval_"))
  ) {
    return data;
  }
  return null;
}

export async function GET(request?: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supervisor = await verifySupervisor(authUser.id);
    if (!supervisor)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const svRoleName: string = (supervisor.role as any)?.name ?? "";
    const svRoleGroup: string = (supervisor.role as any)?.role_group ?? "";
    const svAllowedStages: string[] =
      (supervisor.role as any)?.allowed_stages ?? [];

    let supervisorApprovalStages: Set<string>;
    if (svRoleName === "production_supervisor") {
      supervisorApprovalStages = PRODUCTION_APPROVAL_STAGES;
    } else if (svRoleName === "operational_supervisor") {
      supervisorApprovalStages = OPERATIONAL_APPROVAL_STAGES;
    } else if (svRoleGroup === "management") {
      supervisorApprovalStages = APPROVAL_STAGES;
    } else {
      const fromAllowed = new Set(
        svAllowedStages.filter((s) => s.startsWith("approval_")),
      );
      supervisorApprovalStages =
        fromAllowed.size > 0 ? fromAllowed : APPROVAL_STAGES;
    }

    const admin = createAdminClient();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const url = request?.url ? new URL(request.url) : null;
    const fromParam = url?.searchParams.get("from");
    const toParam = url?.searchParams.get("to");

    const fromISO = fromParam ? new Date(fromParam).toISOString() : todayStart.toISOString();
    const toISO = toParam ? new Date(toParam + "T23:59:59").toISOString() : now.toISOString();

    const [ordersResult, completedResult, submissionsTodayResult] = await Promise.allSettled([
      admin
        .from("cs_orders")
        .select(
          "id, order_number, customer_name, current_stage, status, created_at, updated_at, deadline, completed_at",
        )
        .not("status", "in", "(completed,cancelled)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200),

      admin
        .from("cs_orders")
        .select(
          "id, order_number, customer_name, current_stage, status, created_at, updated_at, deadline, completed_at",
        )
        .eq("status", "completed")
        .is("deleted_at", null)
        .gte("completed_at", fromISO)
        .lte("completed_at", toISO)
        .order("completed_at", { ascending: false })
        .limit(50),

      admin
        .from("stage_results")
        .select("id", { count: "exact" })
        .gte("finished_at", fromISO)
        .lte("finished_at", toISO)
        .not("finished_at", "is", null)
        .limit(1),
    ]);

    const orders =
      ordersResult.status === "fulfilled" ? ordersResult.value.data || [] : [];
    const completedOrdersRaw =
      completedResult.status === "fulfilled" ? completedResult.value.data || [] : [];
    const submissionsToday =
      submissionsTodayResult.status === "fulfilled"
        ? submissionsTodayResult.value.count || 0
        : 0;

    // ── Cumulative processing time for completed orders ─────────────────────────
    const completedOrderIds = completedOrdersRaw.map((o: any) => o.id);
    let transitionsByOrder = new Map<string, any[]>();
    if (completedOrderIds.length > 0) {
      const { data: transitions } = await admin
        .from("order_stage_transitions")
        .select("order_id, transitioned_at")
        .in("order_id", completedOrderIds)
        .order("transitioned_at", { ascending: true });
      for (const t of transitions || []) {
        const arr = transitionsByOrder.get(t.order_id) || [];
        arr.push(t);
        transitionsByOrder.set(t.order_id, arr);
      }
    }

    const completedOrders = completedOrdersRaw.map((o: any) => {
      const tx = transitionsByOrder.get(o.id) || [];
      let totalMs = 0;
      for (let i = 1; i < tx.length; i++) {
        const diff = new Date(tx[i].transitioned_at).getTime() - new Date(tx[i - 1].transitioned_at).getTime();
        if (diff > 0) totalMs += diff;
      }
      return { ...o, process_time_ms: totalMs > 0 ? totalMs : null };
    });

    // ── Pending approval count ─────────────────────────────────────────────────
    let pendingCount = 0;
    const { data: waitingOrders } = await admin
      .from("cs_orders")
      .select("id, current_stage")
      .in("status", ["waiting_approval"])
      .in("current_stage", [...supervisorApprovalStages])
      .is("deleted_at", null)
      .limit(100);

    if (waitingOrders && waitingOrders.length > 0) {
      pendingCount += waitingOrders.filter(
        (o: any) => o.current_stage === "approval_penerimaan_order",
      ).length;

      const otherIds = waitingOrders
        .filter((o: any) => o.current_stage !== "approval_penerimaan_order")
        .map((o: any) => o.id);

      if (otherIds.length > 0) {
        const orderExpectedStage = new Map<string, string>();
        for (const o of waitingOrders) {
          const prodStage = APPROVAL_TO_PRODUCTION_STAGE[o.current_stage];
          if (prodStage && o.current_stage !== "approval_penerimaan_order") {
            orderExpectedStage.set(o.id, prodStage);
          }
        }

        const { data: srRows } = await admin
          .from("stage_results")
          .select("order_id, stage, attempt_number")
          .in("order_id", otherIds)
          .not("finished_at", "is", null)
          .order("attempt_number", { ascending: false });

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

    // ── Latest stage_results per order ─────────────────────────────────────────
    const orderIds = orders.map((o: any) => o.id);
    let latestResults: any[] = [];
    if (orderIds.length > 0) {
      const { data: results } = await admin
        .from("stage_results")
        .select(
          "order_id, stage, finished_at, users!stage_results_user_id_fkey(full_name)",
        )
        .in("order_id", orderIds)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false });
      latestResults = results || [];
    }

    const latestByOrder = new Map<string, any>();
    for (const r of latestResults) {
      if (!latestByOrder.has(r.order_id)) latestByOrder.set(r.order_id, r);
    }

    // ── Enrich orders ──────────────────────────────────────────────────────────
    const enrichedOrders = orders.map((o: any) => {
      const latest = latestByOrder.get(o.id);

      let group: string;
      if (PRODUCTION_STAGES.has(o.current_stage)) group = "production";
      else if (OPERATIONAL_STAGES.has(o.current_stage)) group = "operational";
      else if (APPROVAL_STAGES.has(o.current_stage)) {
        const prodStage = APPROVAL_TO_PRODUCTION_STAGE[o.current_stage];
        group =
          prodStage && PRODUCTION_STAGES.has(prodStage)
            ? "production"
            : "operational";
      } else group = "other";

      const arrivedAt = latest?.finished_at || o.updated_at || o.created_at;
      const hoursAtStage = arrivedAt
        ? Math.floor(
            (now.getTime() - new Date(arrivedAt).getTime()) / 3_600_000,
          )
        : null;

      return {
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        current_stage: o.current_stage,
        stage_label: STAGE_LABELS[o.current_stage] || o.current_stage,
        stage_group: group,
        status: o.status,
        deadline: o.deadline,
        last_worker: (latest?.users as any)?.full_name || null,
        last_submission_at: latest?.finished_at || null,
        hours_at_stage: hoursAtStage,
        last_stage: latest ? STAGE_LABELS[latest.stage] || latest.stage : null,
      };
    });

    // Scope the order list to the supervisor's group
    let scopedOrders = enrichedOrders;
    if (svRoleName === "production_supervisor") {
      scopedOrders = enrichedOrders.filter(
        (o: any) => o.stage_group === "production",
      );
    } else if (svRoleName === "operational_supervisor") {
      scopedOrders = enrichedOrders.filter(
        (o: any) => o.stage_group === "operational",
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        supervisor: {
          role: svRoleName,
          role_group: svRoleGroup,
          approval_stages: [...supervisorApprovalStages],
        },
        stats: {
          totalActive: scopedOrders.length,
          productionCount: scopedOrders.filter(
            (o: any) => o.stage_group === "production",
          ).length,
          operationalCount: scopedOrders.filter(
            (o: any) => o.stage_group === "operational",
          ).length,
          approvalCount: scopedOrders.filter((o: any) =>
            supervisorApprovalStages.has(o.current_stage),
          ).length,
          submissionsToday,
          pendingApprovals: pendingCount,
        },
        orders: scopedOrders,
        completedOrders,
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
