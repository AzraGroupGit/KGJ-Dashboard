import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data: order, error: orderError } = await db
      .from("legacy_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: tracking } = await db
      .from("tracking_stages")
      .select("*, updated_by_user:users!tracking_stages_updated_by_fkey(id, full_name), assigned_to_user:users!tracking_stages_assigned_to_fkey(id, full_name)")
      .eq("order_id", orderId)
      .maybeSingle();

    const { data: history } = await db
      .from("stage_history")
      .select("*, changed_by_user:users!stage_history_changed_by_fkey(id, full_name)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      data: {
        order,
        tracking,
        history: history ?? [],
      },
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/tracking/[orderId]] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .is("deleted_at", null)
      .single();

    const roleName = getRoleProps(userData).name;
    // Allow all authenticated users (workers and supervisors) to update tracking
    if (!["supervisor", "superadmin"].includes(roleName)) {
      const roleGroup = getRoleProps(userData).role_group;
      if (!["production", "operational"].includes(roleGroup)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json() as {
      current_stage?: string;
      stage_status?: string;
      note?: string;
      assigned_to?: string | null;
    };

    if (!body.current_stage) {
      return NextResponse.json(
        { error: "current_stage diperlukan" },
        { status: 400 },
      );
    }

    const db = createAdminClient();

    const now = new Date().toISOString();

    const { data: existing } = await db
      .from("tracking_stages")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existing) {
      const updateData: Record<string, unknown> = {
        current_stage: body.current_stage,
        stage_status: body.stage_status ?? "in_progress",
        updated_at: now,
        updated_by: user.id,
      };
      if (body.assigned_to !== undefined) {
        updateData.assigned_to = body.assigned_to;
      }
      await db
        .from("tracking_stages")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      await db.from("tracking_stages").insert({
        order_id: orderId,
        current_stage: body.current_stage,
        stage_status: body.stage_status ?? "in_progress",
        assigned_to: body.assigned_to ?? null,
        updated_at: now,
        updated_by: user.id,
      });
    }

    await db.from("stage_history").insert({
      order_id: orderId,
      stage: body.current_stage,
      status: body.stage_status ?? "completed",
      note: body.note ?? null,
      changed_by: user.id,
      created_at: now,
    });

    await db
      .from("legacy_orders")
      .update({ last_synced_at: now })
      .eq("id", orderId);

    return NextResponse.json({
      success: true,
      current_stage: body.current_stage,
    });
  } catch (error) {
    console.error("[PUT /api/integrated-system/tracking/[orderId]] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
