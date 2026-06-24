// DELETE /api/management/tasks/items/[id]/attachments/[attachmentId]

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "task-attachments";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: itemId } = await params;
    const attachmentId = request.nextUrl.pathname.split("/").pop();

    if (!attachmentId) {
      return NextResponse.json({ error: "Attachment ID required" }, { status: 400 });
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify item belongs to user's task
    const { data: item, error: itemErr } = await supabase
      .from("management_task_items")
      .select("id, task_id, management_tasks!inner(user_id)")
      .eq("id", itemId)
      .eq("management_tasks.user_id", user.id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
    }

    // Get attachment to find storage path
    const admin = createAdminClient();
    const { data: attachment, error: getErr } = await admin
      .from("management_task_attachments")
      .select("id, file_path")
      .eq("id", attachmentId)
      .eq("item_id", itemId)
      .single();

    if (getErr || !attachment) {
      return NextResponse.json({ error: "Attachment tidak ditemukan" }, { status: 404 });
    }

    // Delete from Storage
    const { error: storageErr } = await admin.storage
      .from(BUCKET)
      .remove([attachment.file_path]);

    if (storageErr) {
      console.error("[DELETE attachments] storage:", storageErr.message);
    }

    // Delete from DB
    const { error: deleteErr } = await admin
      .from("management_task_attachments")
      .delete()
      .eq("id", attachmentId);

    if (deleteErr) {
      console.error("[DELETE attachments] db:", deleteErr.message);
      return NextResponse.json({ error: "Gagal menghapus attachment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE attachments] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
