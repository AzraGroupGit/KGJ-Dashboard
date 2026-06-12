// app/api/bottleneck/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_SEQUENCE, STAGE_GROUP, STAGE_LABELS } from "@/lib/stages";
import { getRoleProps } from "@/lib/auth/session";

const ACTIVE_STAGES = STAGE_SEQUENCE.filter(s => s !== "selesai") as readonly string[];

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
    customer_name: string;
    hours_waiting: number | null;
    status: string;
  }[];
}

export async function GET(request?: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin
      .from("users")
      .select("role:roles!users_role_id_fkey(name, role_group, allowed_stages)")
      .eq("id", user.id)
      .is("deleted_at", null)
      .single();

    const roleName: string = getRoleProps(profile).name;
    const roleGroup: string = getRoleProps(profile).role_group;
    const allowedStages: string[] = getRoleProps(profile).allowed_stages;

    const canAccess =
      roleName === "superadmin" ||
      roleGroup === "management" ||
      allowedStages.some((s) => s.startsWith("approval_"));

    if (!canAccess)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = request?.url ? new URL(request.url) : null;
    const fromParam = url?.searchParams.get("from");
    const toParam = url?.searchParams.get("to");

    const now = new Date();

    let query = admin
      .from("cs_orders")
      .select("id, order_number, customer_name, current_stage, status, updated_at, deadline")
      .not("status", "in", "(completed,cancelled)")
      .in("current_stage", ACTIVE_STAGES as unknown as string[])
      .is("deleted_at", null);

    if (fromParam) {
      query = query.gte("created_at", new Date(fromParam).toISOString());
    }
    if (toParam) {
      query = query.lte("created_at", new Date(toParam + "T23:59:59").toISOString());
    }

    const { data: orders, error: ordersError } = await query.order("updated_at", { ascending: true });

    if (ordersError)
      return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });

    const orderIds = (orders || []).map((o) => o.id);
    let latestResults: unknown[] = [];
    let approvalsData: unknown[] = [];
    if (orderIds.length > 0) {
      const { data: results } = await admin
        .from("stage_results")
        .select(`order_id, stage, finished_at,
          users!stage_results_user_id_fkey ( full_name )`)
        .in("order_id", orderIds)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false });
      latestResults = results || [];

      const { data: approvals } = await admin
        .from("approvals")
        .select(`order_id, stage, decision, decided_at,
          users!approvals_approver_id_fkey ( full_name )`)
        .in("order_id", orderIds)
        .order("decided_at", { ascending: false });
      approvalsData = approvals || [];
    }

    type StageResultRec = { order_id: string; finished_at: string; users?: { full_name: string | null } | null };
    const latestByOrder = new Map<string, StageResultRec>();
    for (const r of latestResults as StageResultRec[]) {
      if (!latestByOrder.has(r.order_id)) {
        latestByOrder.set(r.order_id, r);
      }
    }

    type ApprovalRec = { order_id: string; decision: string | null; decided_at: string | null; users?: { full_name: string | null } | null };
    const approvalByOrder = new Map<string, ApprovalRec>();
    for (const a of approvalsData as ApprovalRec[]) {
      if (!approvalByOrder.has(a.order_id)) {
        approvalByOrder.set(a.order_id, a);
      }
    }

    // Group by stage
    type OrderRec = { id: string; current_stage: string; status: string; order_number: string; customer_name: string | null; updated_at: string; deadline: string | null };
    const stageMap = new Map<string, OrderRec[]>();
    for (const order of orders || []) {
      const stage = order.current_stage;
      if (!stageMap.has(stage)) stageMap.set(stage, []);
      stageMap.get(stage)!.push(order);
    }

    const bottlenecks: StageBottleneck[] = ACTIVE_STAGES.map((stage) => {
      const stageOrders = stageMap.get(stage) || [];
      const waitingOrders = stageOrders.filter(
        (o) => o.status === "waiting_approval",
      );
      const inProgressOrders = stageOrders.filter(
        (o) => o.status !== "waiting_approval",
      );

      const ordersWithHours = inProgressOrders.map((o) => {
        const latest = latestByOrder.get(o.id);
        const arrivedAt = latest?.finished_at || o.updated_at;
        const hours = (now.getTime() - new Date(arrivedAt).getTime()) / 3_600_000;
        const approval = approvalByOrder.get(o.id);
        return {
          order_id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name ?? "—",
          hours_waiting: Math.round(hours * 10) / 10,
          status: o.status,
          current_stage: o.current_stage,
          deadline: o.deadline ?? null,
          last_worker: latest?.users?.full_name ?? null,
          last_submission: latest?.finished_at ?? null,
          approval_decision: approval?.decision ?? null,
          approved_by: approval?.users?.full_name ?? null,
          approved_at: approval?.decided_at ?? null,
        };
      });

      const hoursValues = ordersWithHours
        .map((o) => o.hours_waiting)
        .filter((h: number) => h > 0);
      const avgHours =
        hoursValues.length > 0
          ? hoursValues.reduce((a: number, b: number) => a + b, 0) / hoursValues.length
          : null;
      const longestHours = hoursValues.length > 0 ? Math.max(...hoursValues) : null;

      const sortedOrders = [...ordersWithHours].sort((a, b) => b.hours_waiting - a.hours_waiting);
      return {
        stage,
        stage_label: STAGE_LABELS[stage] || stage,
        stage_group: STAGE_GROUP[stage] || "operational",
        order_count: stageOrders.length,
        waiting_orders: waitingOrders.length,
        in_progress_orders: inProgressOrders.length,
        avg_hours: avgHours ? Math.round(avgHours * 10) / 10 : null,
        longest_hours: longestHours ? Math.round(longestHours * 10) / 10 : null,
        bottlenecks: sortedOrders,
        orders: sortedOrders,
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
              ? bottlenecks.reduce((a, b) => (a.order_count > b.order_count ? a : b))
              : null,
          slowest_stage:
            bottlenecks.filter((b) => b.avg_hours).length > 0
              ? bottlenecks
                  .filter((b) => b.avg_hours)
                  .reduce((a, b) => ((a.avg_hours || 0) > (b.avg_hours || 0) ? a : b))
              : null,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/bottleneck] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
