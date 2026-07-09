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
      workerId: string | null;
    };

    if (!body.orderId) {
      return NextResponse.json(
        { error: "orderId diperlukan" },
        { status: 400 },
      );
    }

    if (body.workerId) {
      const { data: worker } = await createAdminClient()
        .from("users")
        .select("id, role:roles!users_role_id_fkey(role_group)")
        .eq("id", body.workerId)
        .is("deleted_at", null)
        .single();

      if (
        !worker ||
        !["production", "operational"].includes(getRoleProps(worker).role_group)
      ) {
        return NextResponse.json(
          { error: "Worker tidak valid atau bukan pekerja produksi" },
          { status: 400 },
        );
      }
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
          assigned_to: body.workerId,
          updated_at: now,
          updated_by: user.id,
        })
        .eq("id", existing.id);
    } else {
      await db.from("tracking_stages").insert({
        order_id: body.orderId,
        current_stage: "penerimaan_order",
        stage_status: "in_progress",
        assigned_to: body.workerId,
        updated_at: now,
        updated_by: user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/integrated-system/supervisor/assign]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
