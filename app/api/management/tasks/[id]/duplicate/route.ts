// POST /api/management/tasks/[id]/duplicate — clone task + items (without progress)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sourceTaskId } = await params;
    const body = await request.json().catch(() => ({}));
    const { deadline } = body as { deadline?: string };

    const admin = createAdminClient();

    // Verify ownership
    const { data: sourceTask, error: taskErr } = await admin
      .from("management_tasks")
      .select("id, title, description, deadline")
      .eq("id", sourceTaskId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (taskErr || !sourceTask) {
      return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
    }

    // Copy items (title + sort_order only, no progress)
    const { data: sourceItems, error: itemsErr } = await admin
      .from("management_task_items")
      .select("title, sort_order")
      .eq("task_id", sourceTaskId)
      .order("sort_order", { ascending: true });

    if (itemsErr) {
      return NextResponse.json({ error: "Gagal membaca item" }, { status: 500 });
    }

    // Create new task
    const { data: newTask, error: createErr } = await admin
      .from("management_tasks")
      .insert({
        user_id: user.id,
        title: `${sourceTask.title} (copy)`,
        description: sourceTask.description,
        deadline: deadline || sourceTask.deadline,
      })
      .select("id, title, description, deadline, sort_order, is_active")
      .single();

    if (createErr || !newTask) {
      console.error("[duplicate] create task:", createErr?.message);
      return NextResponse.json({ error: "Gagal menduplikasi task" }, { status: 500 });
    }

    // Create items for new task
    if (sourceItems && sourceItems.length > 0) {
      const itemsToInsert = sourceItems.map((item) => ({
        task_id: newTask.id,
        title: item.title,
        sort_order: item.sort_order,
      }));

      const { error: insertItemsErr } = await admin
        .from("management_task_items")
        .insert(itemsToInsert);

      if (insertItemsErr) {
        console.error("[duplicate] create items:", insertItemsErr.message);
        return NextResponse.json({ error: "Gagal menduplikasi item" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: newTask }, { status: 201 });
  } catch (err) {
    console.error("[duplicate] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
