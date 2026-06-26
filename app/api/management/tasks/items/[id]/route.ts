// app/api/management/tasks/items/[id]/route.ts
//
// Manager: PATCH toggle completion + DELETE item (scoped by task ownership)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: itemId } = await params;
    const body = await request.json();
    const isCompleted = body.is_completed === true;
    const notes = body.notes as string | undefined;
    const kendala = body.kendala as string | undefined;
    const status = body.status as string | undefined;

    const admin = createAdminClient();

    // Verify ownership via task → user_id chain
    const { data: item, error: itemErr } = await admin
      .from("management_task_items")
      .select("id, task_id, tasks:management_tasks!inner(user_id)")
      .eq("id", itemId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
    }

    const taskOwnerId = (item.tasks as unknown as { user_id: string })?.user_id;
    if (taskOwnerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const upsertData: Record<string, unknown> = {
      item_id: itemId,
      user_id: user.id,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    };

    // Handle status cycling: pending → proses → selesai
    if (status) {
      upsertData.status = status;
      upsertData.is_completed = status === "selesai";
      upsertData.completed_at = status === "selesai" ? new Date().toISOString() : null;
    }

    if (notes !== undefined) upsertData.notes = notes || null;
    if (kendala !== undefined) upsertData.kendala = kendala || null;

    const { error } = await admin
      .from("management_task_progress")
      .upsert(upsertData, { onConflict: "item_id,user_id" });

    if (error) {
      console.error("[management/tasks/items PATCH]", error.message);
      return NextResponse.json({ error: "Gagal memperbarui progress" }, { status: 500 });
    }

    // Notify superadmins when item enters review
    if (upsertData.status === "waiting_review") {
      try {
        const { data: itemTitle } = await admin.from("management_task_items").select("title").eq("id", itemId).single();
        const { data: saRole } = await admin.from("roles").select("id").eq("name", "superadmin").single();
        if (!saRole) return;
        const { data: superadmins } = await admin.from("users").select("id").eq("role_id", saRole.id).eq("status", "active");
        if (superadmins && itemTitle) {
          for (const sa of superadmins) {
            await admin.from("notifications").insert({
              user_id: sa.id,
              title: "Review Dibutuhkan",
              message: `"${itemTitle.title}" siap direview`,
              type: "warning",
              link: "/dashboard/superadmin/management/monitoring",
            });
          }
        }
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ success: true, is_completed: upsertData.is_completed, status: upsertData.status });
  } catch (err) {
    console.error("[management/tasks/items PATCH]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: itemId } = await params;
    const admin = createAdminClient();

    // Verify ownership via task → user_id chain
    const { data: item, error: itemErr } = await admin
      .from("management_task_items")
      .select("id, tasks:management_tasks!inner(user_id)")
      .eq("id", itemId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
    }

    const taskOwnerId = (item.tasks as unknown as { user_id: string })?.user_id;
    if (taskOwnerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await admin
      .from("management_task_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("[management/tasks/items DELETE]", error.message);
      return NextResponse.json({ error: "Gagal menghapus item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[management/tasks/items DELETE]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
