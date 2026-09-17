import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canValidateIntake } from "@/lib/legacy/intake";
import { getRoleProps } from "@/lib/auth/session";
import { admitLegacyOrderToReceiptApproval } from "@/lib/legacy/ingest";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name, permissions)")
      .eq("id", user.id)
      .is("deleted_at", null)
      .single();
    const role = getRoleProps(profile);
    if (role.name !== "superadmin" && !canValidateIntake(role.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await params;
    const body = await request.json();
    const action = body?.action;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (action !== "approve" && action !== "return" && action !== "reject") {
      return NextResponse.json({ error: "Aksi intake tidak valid" }, { status: 400 });
    }
    if (action !== "approve" && !reason) {
      return NextResponse.json({ error: "Alasan wajib diisi" }, { status: 400 });
    }

    const { data: intake, error: intakeError } = await admin
      .from("legacy_order_intakes")
      .select("id, state")
      .eq("legacy_order_id", orderId)
      .maybeSingle();
    if (intakeError || !intake) {
      return NextResponse.json({ error: "Antrean intake tidak ditemukan" }, { status: 404 });
    }
    if (!(["pending_spv_cs_validation", "returned_for_revision"] as string[]).includes(intake.state)) {
      return NextResponse.json({ error: "Antrean intake sudah diproses" }, { status: 409 });
    }

    const state = action === "approve"
      ? "approved_spv_cs"
      : action === "return"
        ? "returned_for_revision"
        : "rejected_by_spv_cs";
    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("legacy_order_intakes")
      .update({ state, reason: reason || null, decided_by: user.id, decided_at: now, updated_at: now })
      .eq("id", intake.id);
    if (updateError) throw updateError;

    if (action === "approve") {
      await admitLegacyOrderToReceiptApproval(admin, orderId);
    }

    await admin.from("activity_logs").insert({
      user_id: user.id,
      action: "INTAKE_VALIDATION",
      entity_type: "legacy_order_intake",
      entity_id: orderId,
      new_data: { action, state, reason: reason || null },
    });

    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error("[POST /api/intake/:orderId/decision]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
