// app/api/supervisor/pending/route.ts — submissions awaiting supervisor approval

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Only these stages ever land in the approval queue
const APPROVAL_REQUIRED_STAGES = new Set([
  "penerimaan_order",
  "racik_bahan",
  "qc_2",
  "qc_3",
]);

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order:   "Penerimaan Order",
  racik_bahan:        "Racik Bahan",
  qc_2:               "QC 2",
  qc_3:               "QC 3",
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("users")
      .select("role:roles!users_role_id_fkey(name, role_group)")
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    const roleName = (profile?.role as any)?.name;
    const roleGroup = (profile?.role as any)?.role_group;
    if (roleName !== "superadmin" && roleGroup !== "management")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── 1. Orders waiting approval at approval-required stages ─────────────────
    const { data: pendingOrders, error: ordersError } = await admin
      .from("orders")
      .select(`
        id, order_number, product_name, current_stage, status, updated_at,
        customers!inner ( name ),
        users!orders_created_by_fkey ( full_name )
      `)
      .eq("status", "waiting_approval")
      .in("current_stage", [...APPROVAL_REQUIRED_STAGES])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error("[Pending] Orders query error:", ordersError);
      return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }

    // ── 2. Fetch the latest stage_result for each pending order ────────────────
    //    (not needed for penerimaan_order — no stage_result exists for that stage)
    const orderIds = (pendingOrders ?? [])
      .filter((o: any) => o.current_stage !== "penerimaan_order")
      .map((o: any) => o.id);

    let stageResultMap: Record<string, { id: string; data: Record<string, unknown>; attempt_number: number; finished_at: string; user_name: string; user_role: string }> = {};

    if (orderIds.length > 0) {
      const { data: results } = await admin
        .from("stage_results")
        .select(`
          id, order_id, stage, data, attempt_number, finished_at,
          users!inner ( full_name, role:roles!users_role_id_fkey(name) )
        `)
        .in("order_id", orderIds)
        .not("finished_at", "is", null)
        .order("attempt_number", { ascending: false });

      // Keep only the latest attempt per order that matches current_stage
      const seen = new Set<string>();
      for (const r of results ?? []) {
        const order = (pendingOrders ?? []).find((o: any) => o.id === r.order_id);
        if (!order || r.stage !== order.current_stage) continue;
        if (seen.has(r.order_id)) continue;
        seen.add(r.order_id);

        const { _sv_action, _sv_notes, _sv_at, ...cleanData } = (r as any).data ?? {};
        // Skip if already acted upon
        if (_sv_action) continue;

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
    const pending = (pendingOrders ?? []).map((o: any) => {
      const sr = stageResultMap[o.id];
      const isPenerimaanOrder = o.current_stage === "penerimaan_order";

      return {
        order_id:       o.id,
        order_number:   o.order_number,
        product_name:   o.product_name,
        customer_name:  o.customers?.name ?? "—",
        stage:          o.current_stage,
        stage_label:    STAGE_LABELS[o.current_stage] ?? o.current_stage,
        waiting_since:  o.updated_at,
        // stage_result fields (null for penerimaan_order)
        stage_result_id:  sr?.id ?? null,
        attempt_number:   sr?.attempt_number ?? null,
        submitted_at:     sr?.finished_at ?? null,
        worker_name:      isPenerimaanOrder ? (o.users?.full_name ?? "—") : (sr?.user_name ?? "—"),
        worker_role:      isPenerimaanOrder ? "customer_care" : (sr?.user_role ?? "—"),
        data:             sr?.data ?? null,
      };
    }).filter((item: any) => {
      // For non-penerimaan stages, only include if we found an unreviewed stage_result
      if (item.stage !== "penerimaan_order" && !item.stage_result_id) return false;
      return true;
    });

    return NextResponse.json({ success: true, data: pending, total: pending.length });
  } catch (error) {
    console.error("[GET /api/supervisor/pending] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
