// PATCH /api/superadmin/management-tasks/items/[id]/review — approve or reject

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: itemId } = await params;
    const body = await request.json();
    const action = body.action as "approve" | "reject" | undefined;
    const notes = (body.notes as string) || null;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action harus 'approve' atau 'reject'" }, { status: 400 });
    }

    if (action === "reject" && !notes?.trim()) {
      return NextResponse.json({ error: "Alasan penolakan wajib diisi" }, { status: 400 });
    }

    // Auth — superadmin only
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify item exists and is in waiting_review status
    const admin = createAdminClient();
    const { data: progress, error: pgErr } = await admin
      .from("management_task_progress")
      .select("id, status")
      .eq("item_id", itemId)
      .maybeSingle();

    if (pgErr || !progress) {
      return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
    }

    if (progress.status !== "waiting_review") {
      return NextResponse.json({ error: "Item belum siap direview" }, { status: 400 });
    }

    // Update progress
    const newStatus = action === "approve" ? "approved" : "rejected";
    const { error: updateErr } = await admin
      .from("management_task_progress")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        is_completed: action === "approve",
        completed_at: action === "approve" ? new Date().toISOString() : null,
      })
      .eq("item_id", itemId);

    if (updateErr) {
      console.error("[PATCH review] update:", updateErr.message);
      return NextResponse.json({ error: "Gagal memperbarui status" }, { status: 500 });
    }

    // Notify the task owner
    try {
      const { data: owner } = await admin
        .from("management_task_items")
        .select("management_tasks!inner(user_id)")
        .eq("id", itemId)
        .single();
      const ownerId = (owner?.management_tasks as unknown as { user_id: string })?.user_id;
      if (ownerId) {
        const { data: itemTitle } = await admin.from("management_task_items").select("title").eq("id", itemId).single();
        const statusLabel = action === "approve" ? "disetujui" : "ditolak";
        await admin.from("notifications").insert({
          user_id: ownerId,
          title: `Review ${statusLabel}`,
          message: `"${itemTitle?.title ?? "Item"}" telah ${statusLabel} oleh superadmin`,
          type: action === "approve" ? "success" : "error",
          link: "/dashboard/management/tasks",
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({
      status: newStatus,
      message: action === "approve" ? "Item disetujui" : "Item ditolak — leader dapat memperbaiki",
    });
  } catch (err) {
    console.error("[PATCH review] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
