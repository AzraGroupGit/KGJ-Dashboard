// app/api/supervisor/approve/route.ts — approve or reject a stage submission

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Stages that go through supervisor approval before advancing.
// For non-listed stages the worker submission advances automatically (handled in submit route).
const APPROVAL_REQUIRED = new Set([
  "penerimaan_order",
  "racik_bahan",
  "qc_2",
  "qc_3",
]);

// Full stage sequence — used to determine next stage on approval
const STAGE_SEQUENCE = [
  "penerimaan_order",
  "racik_bahan",
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "konfirmasi_awal",
  "finishing",
  "laser",
  "qc_2",
  "kelengkapan",
  "qc_3",
  "packing",
  "pelunasan",
  "pengiriman",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Verify management / superadmin
    const { data: profile } = await admin
      .from("users")
      .select("full_name, role:roles!users_role_id_fkey(name, role_group)")
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    const roleName = (profile?.role as any)?.name;
    const roleGroup = (profile?.role as any)?.role_group;
    if (roleName !== "superadmin" && roleGroup !== "management")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { order_id, stage, action, remarks } = body;
    // stage_result_id is optional for penerimaan_order (no stage_result record)
    const stage_result_id: string | null = body.stage_result_id ?? null;

    if (!order_id || !stage || !action)
      return NextResponse.json({ error: "order_id, stage, dan action wajib diisi" }, { status: 400 });

    if (action !== "approve" && action !== "reject")
      return NextResponse.json({ error: "action harus 'approve' atau 'reject'" }, { status: 400 });

    if (!APPROVAL_REQUIRED.has(stage))
      return NextResponse.json({ error: `Tahap '${stage}' tidak memerlukan persetujuan supervisor` }, { status: 400 });

    // Validate order
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, current_stage, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order)
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    if (order.current_stage !== stage)
      return NextResponse.json(
        { error: "Order sudah berpindah tahap. Refresh dan coba lagi." },
        { status: 409 },
      );

    if (order.status !== "waiting_approval")
      return NextResponse.json(
        { error: `Order berstatus '${order.status}', bukan 'waiting_approval'` },
        { status: 409 },
      );

    // Validate stage_result if provided
    if (stage_result_id) {
      const { data: sr, error: srError } = await admin
        .from("stage_results")
        .select("id")
        .eq("id", stage_result_id)
        .eq("order_id", order_id)
        .single();
      if (srError || !sr)
        return NextResponse.json({ error: "stage_result tidak ditemukan" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const supervisorName: string = (profile as any)?.full_name ?? "Supervisor";

    // ── Insert into approvals table ────────────────────────────────────────────
    await admin.from("approvals").insert({
      order_id,
      approver_id: authUser.id,
      stage,
      decision: action === "approve" ? "approved" : "rejected",
      remarks: remarks ?? null,
      stage_result_id: stage_result_id ?? null,
      decided_at: now,
    });

    // ── Tag the stage_result data with supervisor action ───────────────────────
    if (stage_result_id) {
      const { data: sr } = await admin
        .from("stage_results")
        .select("data")
        .eq("id", stage_result_id)
        .single();

      await admin.from("stage_results").update({
        data: {
          ...(sr?.data ?? {}),
          _sv_action: action,
          _sv_by: supervisorName,
          _sv_at: now,
          ...(remarks ? { _sv_notes: remarks } : {}),
        },
      }).eq("id", stage_result_id);
    }

    let nextStage: string | null = null;

    if (action === "approve") {
      const idx = STAGE_SEQUENCE.indexOf(stage);
      nextStage =
        idx >= 0 && idx < STAGE_SEQUENCE.length - 1 ? STAGE_SEQUENCE[idx + 1] : null;

      const orderUpdate: Record<string, string> = nextStage
        ? { current_stage: nextStage, status: "in_progress", updated_at: now }
        : { current_stage: "selesai", status: "completed", updated_at: now };

      await admin.from("orders").update(orderUpdate).eq("id", order_id);

      // Log the stage transition
      await admin.from("order_stage_transitions").insert({
        order_id,
        from_stage: stage,
        to_stage: nextStage ?? "selesai",
        transitioned_by: authUser.id,
        reason: `Approved by ${supervisorName}`,
        transitioned_at: now,
      });
    } else {
      // Reject: send back for rework — worker can resubmit the same stage
      await admin.from("orders").update({
        status: "rework",
        updated_at: now,
      }).eq("id", order_id);
    }

    // Activity log
    await admin.from("activity_logs").insert({
      user_id: authUser.id,
      action: action === "approve" ? "APPROVE_STAGE" : "REJECT_STAGE",
      entity_type: "approvals",
      entity_id: order_id,
      new_data: { order_id, stage, action, remarks: remarks ?? null, next_stage: nextStage },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? nextStage
            ? `Disetujui. Order maju ke: ${nextStage}`
            : "Disetujui. Order selesai."
          : `Ditolak. Order dikembalikan ke ${stage} untuk perbaikan.`,
      next_stage: nextStage,
    });
  } catch (error) {
    console.error("[POST /api/supervisor/approve] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
