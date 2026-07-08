import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

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

    const roleName = getRoleProps(profile).name;
    const roleGroup = getRoleProps(profile).role_group;

    if (
      !["supervisor", "superadmin"].includes(roleName) &&
      roleGroup !== "management"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as {
      orderId: string;
      targetStage: string;
      reason?: string;
    };

    if (!body.orderId || !body.targetStage) {
      return NextResponse.json(
        { error: "orderId dan targetStage diperlukan" },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await db
      .from("tracking_stages")
      .select("id")
      .eq("order_id", body.orderId)
      .maybeSingle();

    if (existing) {
      await db
        .from("tracking_stages")
        .update({
          current_stage: body.targetStage,
          stage_status: "rework",
          updated_at: now,
          updated_by: user.id,
        })
        .eq("id", existing.id);
    } else {
      await db.from("tracking_stages").insert({
        order_id: body.orderId,
        current_stage: body.targetStage,
        stage_status: "rework",
        updated_at: now,
        updated_by: user.id,
      });
    }

    await db.from("stage_history").insert({
      order_id: body.orderId,
      stage: body.targetStage,
      status: "rework",
      note: body.reason || "Perlu perbaikan",
      changed_by: user.id,
      created_at: now,
    });

    await db
      .from("legacy_orders")
      .update({ last_synced_at: now })
      .eq("id", body.orderId);

    return NextResponse.json({
      success: true,
      current_stage: body.targetStage,
    });
  } catch (error) {
    console.error("[PUT /api/integrated-system/supervisor/rework]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
