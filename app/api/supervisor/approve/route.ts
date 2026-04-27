// app/api/supervisor/approve/route.ts — approve or reject a stage submission

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STAGE_SEQUENCE = [
  "penerimaan_order",
  "qc_awal",
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
  "pelunasan",
  "kelengkapan",
  "qc_3",
  "packing",
  "pengiriman",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify supervisor
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, role:roles!users_role_id_fkey(name)")
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();
    const roleName = (profile?.role as any)?.name;
    if (roleName !== "supervisor" && roleName !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { stage_result_id, order_id, stage, action, notes } = body;

    if (!stage_result_id || !order_id || !stage || !action) {
      return NextResponse.json(
        { error: "stage_result_id, order_id, stage, dan action wajib diisi" },
        { status: 400 },
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action harus 'approve' atau 'reject'" },
        { status: 400 },
      );
    }

    // Fetch the stage_result and order together
    const { data: stageResult, error: srError } = await supabase
      .from("stage_results")
      .select("id, data, stage, order_id")
      .eq("id", stage_result_id)
      .eq("order_id", order_id)
      .single();

    if (srError || !stageResult) {
      return NextResponse.json(
        { error: "Data stage tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, current_stage, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.current_stage !== stage) {
      return NextResponse.json(
        {
          error: "Order sudah berpindah tahap. Refresh halaman dan coba lagi.",
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const supervisorName = (profile as any)?.full_name || "Supervisor";

    // Mark the stage_result as processed
    const updatedData = {
      ...(stageResult.data || {}),
      _sv_action: action,
      _sv_by: supervisorName,
      _sv_at: now,
      ...(notes ? { _sv_notes: notes } : {}),
    };

    await supabase
      .from("stage_results")
      .update({ data: updatedData })
      .eq("id", stage_result_id);

    let nextStage: string | null = null;

    if (action === "approve") {
      const currentIndex = STAGE_SEQUENCE.indexOf(stage);
      nextStage =
        currentIndex >= 0 && currentIndex < STAGE_SEQUENCE.length - 1
          ? STAGE_SEQUENCE[currentIndex + 1]
          : null;

      const orderUpdate: Record<string, string> =
        nextStage === null
          ? { current_stage: "completed", status: "completed" }
          : { current_stage: nextStage };

      await supabase.from("orders").update(orderUpdate).eq("id", order_id);
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: authUser.id,
      action: action === "approve" ? "APPROVE_STAGE" : "REJECT_STAGE",
      entity_type: "stage_results",
      entity_id: stage_result_id,
      new_data: {
        order_id,
        stage,
        action,
        notes: notes || null,
        next_stage: nextStage,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? nextStage
            ? `Tahap disetujui. Order maju ke: ${nextStage}`
            : "Tahap disetujui. Order selesai."
          : "Tahap ditolak. Worker perlu submit ulang.",
      next_stage: nextStage,
    });
  } catch (error) {
    console.error("[POST /api/supervisor/approve] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
