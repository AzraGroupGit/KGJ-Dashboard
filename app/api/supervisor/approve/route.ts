// app/api/supervisor/approve/route.ts — approve or reject a stage submission

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Maps production stage → its approval stage (what the order.current_stage will be when waiting)
const PRODUCTION_TO_APPROVAL_STAGE: Record<string, string> = {
  penerimaan_order: "approval_penerimaan_order",
  qc_1: "approval_qc_1",
  qc_2: "approval_qc_2",
  qc_3: "approval_qc_3",
  pelunasan: "approval_pelunasan",
};

// Full stage sequence — used to determine next stage on approval
const STAGE_SEQUENCE = [
  "penerimaan_order",
  "approval_penerimaan_order",
  "racik_bahan",
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "approval_qc_1",
  "finishing",
  "laser",
  "qc_2",
  "approval_qc_2",
  "kelengkapan",
  "qc_3",
  "approval_qc_3",
  "packing",
  "pelunasan",
  "approval_pelunasan",
  "pengiriman",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Verify supervisor / superadmin access
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

    // Allow superadmin, management group, or users with supervisor role / allowed approval stages
    const isSupervisor =
      roleName === "superadmin" ||
      roleGroup === "management" ||
      roleName === "supervisor" ||
      allowedStages.some((s) => s.startsWith("approval_"));

    if (!isSupervisor)
      return NextResponse.json(
        { error: "Forbidden: hanya supervisor yang dapat melakukan approval" },
        { status: 403 },
      );

    const body = await request.json();
    const { order_id, stage, action, remarks } = body;
    // stage_result_id is optional (e.g., penerimaan_order may not have one)
    const stage_result_id: string | null = body.stage_result_id ?? null;

    if (!order_id || !stage || !action)
      return NextResponse.json(
        { error: "order_id, stage, dan action wajib diisi" },
        { status: 400 },
      );

    if (action !== "approve" && action !== "reject")
      return NextResponse.json(
        { error: "action harus 'approve' atau 'reject'" },
        { status: 400 },
      );

    // The stage submitted should be an approval stage
    const isApprovalStage = stage.startsWith("approval_");
    if (!isApprovalStage)
      return NextResponse.json(
        {
          error: `Tahap '${stage}' bukan tahap approval. Gunakan approval stage yang sesuai.`,
        },
        { status: 400 },
      );

    // Validate order
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, current_stage, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order)
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );

    if (order.current_stage !== stage)
      return NextResponse.json(
        { error: "Order sudah berpindah tahap. Refresh dan coba lagi." },
        { status: 409 },
      );

    // Allow both waiting_approval and in_progress for approval stages
    if (order.status !== "waiting_approval" && order.status !== "in_progress")
      return NextResponse.json(
        {
          error: `Order berstatus '${order.status}', bukan 'waiting_approval' atau 'in_progress'`,
        },
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
        return NextResponse.json(
          { error: "stage_result tidak ditemukan" },
          { status: 404 },
        );
    }

    // Find the production stage that triggered this approval
    const productionStage =
      Object.entries(PRODUCTION_TO_APPROVAL_STAGE).find(
        ([, approvalStage]) => approvalStage === stage,
      )?.[0] ?? stage.replace("approval_", "");

    const now = new Date().toISOString();
    const supervisorName: string = (profile as any)?.full_name ?? "Supervisor";

    // ── Determine next stage up-front ─────────────────────────────────────────
    let nextStage: string | null = null;
    if (action === "approve") {
      const idx = STAGE_SEQUENCE.indexOf(stage);
      nextStage =
        idx >= 0 && idx < STAGE_SEQUENCE.length - 1
          ? STAGE_SEQUENCE[idx + 1]
          : null;
    }

    // ── 1. Insert into approvals table ────────────────────────────────────────
    await admin.from("approvals").insert({
      order_id,
      approver_id: authUser.id,
      stage,
      decision: action === "approve" ? "approved" : "rejected",
      remarks: remarks ?? null,
      stage_result_id: stage_result_id ?? null,
      decided_at: now,
    });

    // ── 2. Update order ───────────────────────────────────────────────────────
    if (action === "approve") {
      const isLastStage =
        !nextStage ||
        (nextStage === "pengiriman" && stage === "approval_pelunasan");
      // Note: pengiriman is handled separately; approval_pelunasan → pengiriman
      const orderUpdate: Record<string, any> = nextStage
        ? {
            current_stage: nextStage,
            status: "in_progress",
            updated_at: now,
          }
        : {
            current_stage: "selesai",
            status: "completed",
            updated_at: now,
          };

      await admin.from("orders").update(orderUpdate).eq("id", order_id);

      await admin.from("order_stage_transitions").insert({
        order_id,
        from_stage: stage,
        to_stage: nextStage ?? "selesai",
        transitioned_by: authUser.id,
        reason: `Approved by ${supervisorName}${remarks ? ` — ${remarks}` : ""}`,
        transitioned_at: now,
      });
    } else {
      // Reject: send back to the production stage for rework
      await admin
        .from("orders")
        .update({
          current_stage: productionStage,
          status: "rework",
          updated_at: now,
        })
        .eq("id", order_id);

      await admin.from("order_stage_transitions").insert({
        order_id,
        from_stage: stage,
        to_stage: productionStage,
        transitioned_by: authUser.id,
        reason: `Rejected by ${supervisorName}${remarks ? ` — ${remarks}` : ""}`,
        transitioned_at: now,
      });

      // Also log rework
      await admin.from("rework_logs").insert({
        order_id,
        from_stage: stage,
        to_stage: productionStage,
        reason: remarks ?? "Ditolak supervisor — perlu perbaikan",
        severity: "minor",
        logged_by: authUser.id,
        logged_at: now,
      });
    }

    // ── 3. Tag the stage_result with supervisor action (audit only) ────────────
    if (stage_result_id) {
      const { data: sr } = await admin
        .from("stage_results")
        .select("data")
        .eq("id", stage_result_id)
        .single();

      await admin
        .from("stage_results")
        .update({
          data: {
            ...(sr?.data ?? {}),
            _sv_action: action,
            _sv_by: supervisorName,
            _sv_at: now,
            ...(remarks ? { _sv_notes: remarks } : {}),
          },
        })
        .eq("id", stage_result_id);
    }

    // ── 4. Activity log ───────────────────────────────────────────────────────
    await admin.from("activity_logs").insert({
      user_id: authUser.id,
      action: action === "approve" ? "APPROVE_STAGE" : "REJECT_STAGE",
      entity_type: "approvals",
      entity_id: order_id,
      new_data: {
        order_id,
        stage,
        production_stage: productionStage,
        action,
        remarks: remarks ?? null,
        next_stage: action === "approve" ? nextStage : productionStage,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? nextStage
            ? `Disetujui. Order maju ke: ${nextStage}`
            : "Disetujui. Order selesai."
          : `Ditolak. Order dikembalikan ke ${productionStage} untuk perbaikan.`,
      data: {
        order_id,
        stage,
        action,
        production_stage: productionStage,
        next_stage: action === "approve" ? nextStage : productionStage,
      },
    });
  } catch (error) {
    console.error("[POST /api/supervisor/approve] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
