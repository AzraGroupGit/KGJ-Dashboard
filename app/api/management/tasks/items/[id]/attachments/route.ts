// POST /api/management/tasks/items/[id]/attachments — upload file

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "task-attachments";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: itemId } = await params;

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

    // Check existing attachment count
    const admin = createAdminClient();
    const { count } = await admin
      .from("management_task_attachments")
      .select("*", { count: "exact", head: true })
      .eq("item_id", itemId);

    if (count && count >= 3) {
      return NextResponse.json({ error: "Maksimal 3 lampiran per item" }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File wajib diunggah" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 5 MB" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format: JPG, PNG, WebP, GIF, atau PDF" }, { status: 400 });
    }

    // Upload to Storage
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : file.type === "application/pdf" ? "pdf" : "jpg";
    const storagePath = `${itemId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error("[POST attachments] upload:", uploadErr.message);
      return NextResponse.json({ error: "Gagal mengunggah file" }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

    // Insert DB record
    const { data: attachment, error: insertErr } = await admin
      .from("management_task_attachments")
      .insert({
        item_id: itemId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select("id, file_name, file_size, mime_type, created_at")
      .single();

    if (insertErr) {
      console.error("[POST attachments] insert:", insertErr.message);
      return NextResponse.json({ error: "Gagal menyimpan attachment" }, { status: 500 });
    }

    return NextResponse.json({ ...attachment, public_url: publicUrl }, { status: 201 });
  } catch (err) {
    console.error("[POST attachments] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// GET /api/management/tasks/items/[id]/attachments — list attachments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: itemId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: item, error: itemErr } = await admin
      .from("management_task_items")
      .select("id")
      .eq("id", itemId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
    }

    const { data: attachments, error } = await admin
      .from("management_task_attachments")
      .select("id, file_name, file_path, file_size, mime_type, created_at")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Gagal memuat lampiran" }, { status: 500 });
    }

    // Generate public URLs
    const result = (attachments ?? []).map((a) => {
      const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(a.file_path);
      return { ...a, public_url: publicUrl };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET attachments] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
