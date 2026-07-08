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
      currentStage: string;
      remarks?: string;
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

    const { data: existing } = await db
      .from("tracking_stages")
      .select("id")
      .eq("order_id", body.orderId)
      .maybeSingle();

    if (existing) {
      await db
        .from("tracking_stages")
        .update({
          current_stage: next,
          stage_status: "completed",
          updated_at: now,
          updated_by: user.id,
        })
        .eq("id", existing.id);
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
      note: body.remarks || `Disetujui oleh supervisor - lanjut ke stage berikutnya`,
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
    console.error("[PUT /api/integrated-system/supervisor/approve]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
