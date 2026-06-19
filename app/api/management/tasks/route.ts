// app/api/management/tasks/route.ts
//
// Manager: GET own tasks (with items + progress) + POST new task + DELETE all done items

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: tasks, error } = await admin
      .from("management_tasks")
      .select("id, title, description, deadline, sort_order, is_active, items:management_task_items(id, title, sort_order, progress:management_task_progress(id, is_completed, completed_at, status, admin_notes, notes, kendala))")
      .eq("user_id", user.id)
      .order("sort_order")
      .order("sort_order", { referencedTable: "management_task_items" });

    if (error) {
      console.error("[management/tasks GET]", error.message);
      return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: tasks ?? [] });
  } catch (err) {
    console.error("[management/tasks GET]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, description, deadline } = body as { title?: string; description?: string; deadline?: string };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Judul task wajib diisi" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("management_tasks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        deadline: deadline || null,
      })
      .select("id, title, description, deadline, sort_order, is_active")
      .single();

    if (error) {
      console.error("[management/tasks POST]", error.message);
      return NextResponse.json({ error: "Gagal membuat task" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("[management/tasks POST]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: taskIds } = await admin
      .from("management_tasks")
      .select("id")
      .eq("user_id", user.id);

    if (!taskIds?.length) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const ids = taskIds.map((t: { id: string }) => t.id);

    const { data: items } = await admin
      .from("management_task_items")
      .select("id, progress:management_task_progress(status)")
      .in("task_id", ids);

    const doneIds = (items ?? [])
      .filter((item: { progress: Array<{ status: string | null }> | null }) =>
        item.progress?.some((p) => p.status === "selesai"),
      )
      .map((item: { id: string }) => item.id);

    if (!doneIds.length) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const { error } = await admin
      .from("management_task_items")
      .delete()
      .in("id", doneIds);

    if (error) {
      console.error("[management/tasks DELETE]", error.message);
      return NextResponse.json({ error: "Gagal menghapus item" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: doneIds.length });
  } catch (err) {
    console.error("[management/tasks DELETE]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
