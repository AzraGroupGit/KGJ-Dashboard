// app/api/supervisor/pending/route.ts — submissions awaiting supervisor approval

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Maps production stage → its approval stage (the current_stage when waiting for approval)
const PRODUCTION_TO_APPROVAL_STAGE: Record<string, string> = {
  penerimaan_order: "approval_penerimaan_order",
  qc_1: "approval_qc_1",
  qc_2: "approval_qc_2",
  qc_3: "approval_qc_3",
  pelunasan: "approval_pelunasan",
};

// Reverse map: approval stage → production stage
const APPROVAL_TO_PRODUCTION_STAGE: Record<string, string> = Object.fromEntries(
  Object.entries(PRODUCTION_TO_APPROVAL_STAGE).map(([k, v]) => [v, k]),
);

// All approval stages currently in the flow
const APPROVAL_STAGES = new Set(Object.values(PRODUCTION_TO_APPROVAL_STAGE));

const STAGE_LABELS: Record<string, string> = {
  approval_penerimaan_order: "Approval Penerimaan Order",
  approval_qc_1: "Approval QC 1",
  approval_qc_2: "Approval QC 2",
  approval_qc_3: "Approval QC 3",
  approval_pelunasan: "Approval Pelunasan",
};

const STAGE_GROUPS: Record<string, "production" | "operational"> = {
  approval_penerimaan_order: "operational",
  approval_qc_1: "production",
  approval_qc_2: "production",
  approval_qc_3: "production",
  approval_pelunasan: "operational",
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("users")
      .select(
        "full_name, role:roles!users_role_id_fkey(name, role_group, allowed_stages)",
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!profile)
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );

    const roleName: string = (profile.role as any)?.name ?? "";
    const roleGroup: string = (profile.role as any)?.role_group ?? "";
    const allowedStages: string[] = (profile.role as any)?.allowed_stages ?? [];

    // Allow superadmin, management group, supervisor role, or users with approval stages
    const isSupervisor =
      roleName === "superadmin" ||
      roleGroup === "management" ||
      roleName === "supervisor" ||
      allowedStages.some((s) => s.startsWith("approval_"));

    if (!isSupervisor)
      return NextResponse.json(
        {
          error:
            "Forbidden: hanya supervisor yang dapat melihat daftar approval",
        },
        { status: 403 },
      );

    // ── 1. Orders currently at an approval stage ───────────────────────────────
    //    These are orders submitted by workers that now need supervisor action.
    //    They can be in "waiting_approval" or "in_progress" status at an approval stage.
    const { data: pendingOrders, error: ordersError } = await admin
      .from("orders")
      .select(
        `
        id, order_number, product_name, current_stage, status, updated_at,
        customers!inner ( name ),
        users!orders_created_by_fkey ( full_name )
      `,
      )
      .in("status", ["waiting_approval", "in_progress"])
      .in("current_stage", [...APPROVAL_STAGES])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error("[Pending] Orders query error:", ordersError);
      return NextResponse.json(
        { error: "Gagal mengambil data" },
        { status: 500 },
      );
    }

    // ── 2. Fetch the latest stage_result for the PRODUCTION stage ──────────────
    //    Each approval stage corresponds to a production stage (e.g., approval_qc_1 ← qc_1).
    //    The stage_result was created at the production stage, not the approval stage.
    const orderProductionStageMap: Record<string, string> = {};
    const orderIds: string[] = [];

    for (const o of pendingOrders ?? []) {
      const productionStage = APPROVAL_TO_PRODUCTION_STAGE[o.current_stage];
      if (productionStage) {
        orderProductionStageMap[o.id] = productionStage;
        orderIds.push(o.id);
      }
    }

    let stageResultMap: Record<
      string,
      {
        id: string;
        data: Record<string, unknown>;
        attempt_number: number;
        finished_at: string;
        user_name: string;
        user_role: string;
      }
    > = {};

    if (orderIds.length > 0) {
      // Fetch stage_results for the production stages that triggered these approvals
      const { data: results } = await admin
        .from("stage_results")
        .select(
          `
          id, order_id, stage, data, attempt_number, finished_at,
          users!stage_results_user_id_fkey ( full_name, role:roles!users_role_id_fkey(name) )
        `,
        )
        .in("order_id", orderIds)
        .not("finished_at", "is", null)
        .order("attempt_number", { ascending: false });

      // Keep only the latest attempt per order that matches the production stage
      const seen = new Set<string>();
      for (const r of results ?? []) {
        const productionStage = orderProductionStageMap[r.order_id];
        if (!productionStage || r.stage !== productionStage) continue;
        if (seen.has(r.order_id)) continue;
        seen.add(r.order_id);

        // Strip internal supervisor audit fields
        const {
          _sv_action: _a,
          _sv_notes: _n,
          _sv_at: _t,
          _sv_by: _b,
          ...cleanData
        } = (r as any).data ?? {};

        stageResultMap[r.order_id] = {
          id: r.id,
          data: cleanData,
          attempt_number: r.attempt_number,
          finished_at: r.finished_at,
          user_name: (r as any).users?.full_name ?? "—",
          user_role: (r as any).users?.role?.name ?? "—",
        };
      }
    }

    // ── 3. Shape response ─────────────────────────────────────────────────────

    const pending = (pendingOrders ?? [])
      .map((o: any) => {
        const sr = stageResultMap[o.id];
        const productionStage =
          APPROVAL_TO_PRODUCTION_STAGE[o.current_stage] ?? o.current_stage;
        const isPenerimaanOrder = productionStage === "penerimaan_order";

        return {
          order_id: o.id,
          order_number: o.order_number,
          product_name: o.product_name,
          customer_name: o.customers?.name ?? "—",
          stage: o.current_stage,
          stage_label: STAGE_LABELS[o.current_stage] ?? o.current_stage,
          stage_group: STAGE_GROUPS[o.current_stage] ?? "production",
          production_stage: productionStage,
          waiting_since: o.updated_at,
          // stage_result fields (may be null if no result found)
          stage_result_id: sr?.id ?? null,
          attempt_number: sr?.attempt_number ?? null,
          submitted_at: sr?.finished_at ?? null,
          worker_name: isPenerimaanOrder
            ? (o.users?.full_name ?? "—")
            : (sr?.user_name ?? "—"),
          worker_role: isPenerimaanOrder
            ? "customer_service"
            : (sr?.user_role ?? "—"),
          data: sr?.data ?? null,
        };
      })
      .filter((item: any) => {
        // For non-penerimaan stages, only include if we found a stage_result
        if (
          item.production_stage !== "penerimaan_order" &&
          !item.stage_result_id
        ) {
          return false;
        }
        return true;
      });

    return NextResponse.json({
      success: true,
      data: pending,
      total: pending.length,
    });
  } catch (error) {
    console.error("[GET /api/supervisor/pending] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
