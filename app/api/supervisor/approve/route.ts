// app/api/supervisor/approve/route.ts — approve or reject a stage submission

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";
import { sendNotification } from "@/lib/notifications";
import { STAGE_SEQUENCE } from "@/lib/stages";

const PRODUCTION_TO_APPROVAL_STAGE: Record<string, string> = {};
const APPROVAL_STAGES: string[] = [];
STAGE_SEQUENCE.forEach((stage, i) => {
  if (stage.startsWith("approval_")) {
    APPROVAL_STAGES.push(stage);
    const prevStage = STAGE_SEQUENCE[i - 1];
    if (prevStage) {
      PRODUCTION_TO_APPROVAL_STAGE[prevStage] = stage;
    }
  }
});

const SUPERVISOR_ALLOWED_STAGES: Record<string, Set<string>> = {
  operational_supervisor: new Set(APPROVAL_STAGES.filter(s => s !== "approval_produksi")),
  production_supervisor: new Set(["approval_produksi"]),
};

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

    const { data: profile } = await admin
      .from("users")
      .select(
        "full_name, role:roles!users_role_id_fkey(name, role_group, allowed_stages)",
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!profile)
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const roleName: string = getRoleProps(profile).name;
    const roleGroup: string = getRoleProps(profile).role_group;
    const allowedStages: string[] = getRoleProps(profile).allowed_stages;

    const isSupervisor =
      roleName === "superadmin" ||
      roleGroup === "management" ||
      allowedStages.some((s) => s.startsWith("approval_"));

    if (!isSupervisor)
      return NextResponse.json(
        { error: "Forbidden: hanya supervisor yang dapat melakukan approval" },
        { status: 403 },
      );

    const body = await request.json();
    const { order_id, stage, action, remarks, rework_stage } = body;
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

    if (!stage.startsWith("approval_"))
      return NextResponse.json(
        { error: `Tahap '${stage}' bukan tahap approval.` },
        { status: 400 },
      );

    if (roleName === "operational_supervisor" && !SUPERVISOR_ALLOWED_STAGES.operational_supervisor.has(stage)) {
      return NextResponse.json({ error: "Anda tidak memiliki akses untuk approval tahap ini" }, { status: 403 });
    }
    if (roleName === "production_supervisor" && !SUPERVISOR_ALLOWED_STAGES.production_supervisor.has(stage)) {
      return NextResponse.json({ error: "Anda tidak memiliki akses untuk approval tahap ini" }, { status: 403 });
    }

    const { data: order, error: orderError } = await admin
      .from("cs_orders")
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

    if (order.status !== "waiting_approval" && order.status !== "in_progress")
      return NextResponse.json(
        {
          error: `Order berstatus '${order.status}', bukan 'waiting_approval' atau 'in_progress'`,
        },
        { status: 409 },
      );

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

    const productionStage = rework_stage ||
      (Object.entries(PRODUCTION_TO_APPROVAL_STAGE).find(
        ([, approvalStage]) => approvalStage === stage,
      )?.[0] ?? stage.replace("approval_", ""));

    const now = new Date().toISOString();
      const supervisorName: string = (profile as { full_name?: string })?.full_name ?? "Supervisor";

    let nextStage: string | null = null;
    if (action === "approve") {
      const idx = STAGE_SEQUENCE.indexOf(stage);
      nextStage = idx >= 0 && idx < STAGE_SEQUENCE.length - 1 ? STAGE_SEQUENCE[idx + 1] : null;
    }

    // ── 1. Insert approval record ──────────────────────────────────────────────
    await admin.from("approvals").insert({
      order_id,
      approver_id: authUser.id,
      stage: productionStage,
      decision: action === "approve" ? "approved" : "rejected",
      remarks: remarks ?? null,
      stage_result_id: stage_result_id ?? null,
      decided_at: now,
    });

    // ── 2. Update order ────────────────────────────────────────────────────────
    if (action === "approve") {
      await admin
        .from("cs_orders")
        .update(
          nextStage && nextStage !== "selesai"
            ? { current_stage: nextStage, status: "in_progress", updated_at: now }
            : { current_stage: "selesai", status: "completed", completed_at: now, updated_at: now },
        )
        .eq("id", order_id);

      await admin.from("order_stage_transitions").insert({
        order_id,
        from_stage: stage,
        to_stage: nextStage ?? "selesai",
        transitioned_by: authUser.id,
        reason: `Approved by ${supervisorName}${remarks ? ` — ${remarks}` : ""}`,
        transitioned_at: now,
      });
    } else {
      await admin
        .from("cs_orders")
        .update({ current_stage: productionStage, status: "rework", updated_at: now })
        .eq("id", order_id);

      await admin.from("order_stage_transitions").insert({
        order_id,
        from_stage: stage,
        to_stage: productionStage,
        transitioned_by: authUser.id,
        reason: `Rejected by ${supervisorName}${remarks ? ` — ${remarks}` : ""}`,
        transitioned_at: now,
      });

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

    // ── 3. Notify worker ────────────────────────────────────────────────────────
    const workerId = stage_result_id
      ? (await admin.from("stage_results").select("user_id").eq("id", stage_result_id).single()).data
          ?.user_id
      : null;

    if (workerId) {
      const { data: workerOrder } = await admin
        .from("cs_orders")
        .select("order_number")
        .eq("id", order_id)
        .single();

      const orderNum = workerOrder?.order_number ?? "—";
      if (action === "approve") {
        sendNotification({
          userId: workerId,
          title: "Disetujui",
          message: `Order ${orderNum} — tahap ${productionStage} telah disetujui. Lanjut ke tahap berikutnya.`,
          type: "success",
          link: `/workshop/input`,
        });
      } else {
        sendNotification({
          userId: workerId,
          title: "Ditolak — Rework",
          message: `Order ${orderNum} — tahap ${productionStage} ditolak. ${remarks ? `Alasan: ${remarks}` : "Harap perbaiki dan submit ulang."}`,
          type: "error",
          link: `/workshop/input`,
        });
      }
    }

    // ── 4. Tag stage_result with supervisor action ─────────────────────────────
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

    // ── 5. Activity log ────────────────────────────────────────────────────────
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
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
