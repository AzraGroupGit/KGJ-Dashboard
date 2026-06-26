// app/api/management/tasks/route.ts
//
// Manager: GET own tasks (with items + progress) + POST new task + DELETE all done items

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeOverdueDays } from "@/lib/overdue";

const OVERDUE_STATUSES = new Set(["belum", "proses", null]);
const SKIP_NOTIFY_STATUSES = new Set(["approved", "selesai", "waiting_review"]);

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: tasks, error } = await admin
      .from("management_tasks")
      .select("id, title, description, deadline, sort_order, is_active, items:management_task_items(id, title, sort_order, overdue_notified_at, progress:management_task_progress(id, is_completed, completed_at, status, admin_notes, notes, kendala))")
      .eq("user_id", user.id)
      .order("sort_order")
      .order("sort_order", { referencedTable: "management_task_items" });

    if (error) {
      console.error("[management/tasks GET]", error.message);
      return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
    }

    // Process overdue notifications
    const now = new Date();
    for (const task of tasks ?? []) {
      if (!task.deadline) continue;
      const deadlineDate = new Date(task.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      if (deadlineDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) continue;

      for (const item of (task.items ?? []) as Array<{ id: string; overdue_notified_at: string | null; progress: Array<{ status: string | null }> | null }>) {
        const status = item.progress?.[0]?.status ?? null;
        if (SKIP_NOTIFY_STATUSES.has(status ?? "")) continue;
        if (item.overdue_notified_at) continue;

        // Set notified
        await admin.from("management_task_items").update({ overdue_notified_at: new Date().toISOString() }).eq("id", item.id);

        // Send notification
        try {
          const days = computeOverdueDays(task.deadline);
          await admin.from("notifications").insert({
            user_id: user.id,
            title: "Task Terlambat",
            message: `"${task.title}" melewati deadline${days > 0 ? ` — ${days} hari terlambat` : ""}`,
            type: "warning",
            link: "/dashboard/management/tasks",
          });
        } catch { /* non-critical */ }
      }
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

    // Notify superadmins
    try {
      const { data: saRole } = await admin.from("roles").select("id").eq("name", "superadmin").single();
      if (!saRole) return;
      const { data: superadmins } = await admin
        .from("users")
        .select("id")
        .eq("role_id", saRole.id)
        .eq("status", "active");
      if (superadmins) {
        for (const sa of superadmins) {
          await admin.from("notifications").insert({
            user_id: sa.id,
            title: "Task Baru",
            message: `${user.email} membuat task "${title.trim()}"`,
            type: "info",
            link: "/dashboard/superadmin/management/monitoring",
          });
        }
      }
    } catch { /* notification failure is non-critical */ }

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
