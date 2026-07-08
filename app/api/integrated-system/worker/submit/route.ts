import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";
import { getNextStage } from "@/services/integrated-system/tracking.service";

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await createAdminClient()
      .from("users")
      .select("role:roles!users_role_id_fkey(name, role_group)")
      .eq("id", user.id)
      .is("deleted_at", null)
      .single();

    const roleGroup = getRoleProps(profile).role_group;
    const roleName = getRoleProps(profile).name;

    if (
      !["supervisor", "superadmin"].includes(roleName) &&
      !["production", "operational"].includes(roleGroup)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as {
      orderId: string;
      currentStage: string;
      note?: string;
    };

    if (!body.orderId || !body.currentStage) {
      return NextResponse.json(
        { error: "orderId dan currentStage diperlukan" },
        { status: 400 },
      );
    }

    const next = getNextStage(body.currentStage);
    if (!next) {
      return NextResponse.json(
        { error: "Stage ini adalah stage terakhir" },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const now = new Date().toISOString();

    const { data: tracking } = await db
      .from("tracking_stages")
      .select("id, assigned_to")
      .eq("order_id", body.orderId)
      .maybeSingle();

    if (tracking?.assigned_to && tracking.assigned_to !== user.id) {
      const { data: profile } = await db
        .from("users")
        .select("role:roles!users_role_id_fkey(name)")
        .eq("id", user.id)
        .is("deleted_at", null)
        .single();
      const name = getRoleProps(profile).name;
      if (!["supervisor", "superadmin"].includes(name)) {
        return NextResponse.json(
          { error: "Order ini tidak ditugaskan kepada Anda" },
          { status: 403 },
        );
      }
    }

    if (tracking) {
      await db
        .from("tracking_stages")
        .update({
          current_stage: next,
          stage_status: "completed",
          updated_at: now,
          updated_by: user.id,
        })
        .eq("id", tracking.id);
    } else {
      await db.from("tracking_stages").insert({
        order_id: body.orderId,
        current_stage: next,
        stage_status: "completed",
        updated_at: now,
        updated_by: user.id,
      });
    }

    await db.from("stage_history").insert({
      order_id: body.orderId,
      stage: next,
      status: "completed",
      note: body.note || `Stage ${body.currentStage} selesai oleh pekerja`,
      changed_by: user.id,
      created_at: now,
    });

    await db
      .from("legacy_orders")
      .update({ last_synced_at: now })
      .eq("id", body.orderId);

    return NextResponse.json({
      success: true,
      current_stage: next,
    });
  } catch (error) {
    console.error("[PUT /api/integrated-system/worker/submit]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
