// app/api/superadmin/management-tasks/route.ts
//
// SuperAdmin: GET all management-group users with their tasks + progress.
// PATCH admin_notes on a progress row.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get all users in the management role_group
    const { data: managers, error: userErr } = await admin
      .from("users")
      .select("id, full_name, username, role:roles!users_role_id_fkey(id, name, role_group)")
      .is("deleted_at", null)
      .eq("status", "active");

    if (userErr) {
      console.error("[superadmin/management-tasks GET]", userErr.message);
      return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
    }

    // Filter to management group only
    const managementUsers = (managers ?? []).filter((u) => {
      const role = u.role as unknown as { role_group?: string } | null;
      return role?.role_group === "management";
    });

    // Get all tasks for these users
    const userIds = managementUsers.map((u) => u.id);
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: tasks, error: taskErr } = await admin
      .from("management_tasks")
      .select("id, user_id, title, description, deadline, sort_order, is_active, items:management_task_items(id, title, sort_order, progress:management_task_progress(id, is_completed, completed_at, status, admin_notes, notes, kendala))")
      .in("user_id", userIds)
      .order("sort_order")
      .order("sort_order", { referencedTable: "management_task_items" });

    if (taskErr) {
      console.error("[superadmin/management-tasks GET]", taskErr.message);
      return NextResponse.json({ error: "Gagal memuat tugas" }, { status: 500 });
    }

    const result = managementUsers.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      username: u.username,
      role_name: (u.role as unknown as { name?: string })?.name ?? "-",
      tasks: (tasks ?? []).filter((t) => t.user_id === u.id),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[superadmin/management-tasks GET]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { progress_id, admin_notes } = body as { progress_id?: string; admin_notes?: string };

    if (!progress_id) {
      return NextResponse.json({ error: "progress_id wajib diisi" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("management_task_progress")
      .update({ admin_notes: admin_notes ?? null })
      .eq("id", progress_id);

    if (error) {
      console.error("[superadmin/management-tasks PATCH]", error.message);
      return NextResponse.json({ error: "Gagal menyimpan catatan" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[superadmin/management-tasks PATCH]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
