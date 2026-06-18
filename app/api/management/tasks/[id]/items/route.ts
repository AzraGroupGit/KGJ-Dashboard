// app/api/management/tasks/[id]/items/route.ts
//
// Manager: POST new checklist item to own task

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: taskId } = await params;
    const body = await request.json();
    const { title } = body as { title?: string };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Judul item wajib diisi" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify task ownership
    const { data: task, error: taskErr } = await admin
      .from("management_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (taskErr || !task) {
      return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("management_task_items")
      .insert({ task_id: taskId, title: title.trim() })
      .select("id, title, sort_order")
      .single();

    if (error) {
      console.error("[management/tasks/items POST]", error.message);
      return NextResponse.json({ error: "Gagal menambah item" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("[management/tasks/items POST]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
