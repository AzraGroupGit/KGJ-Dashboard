import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "cs-order-images";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orderId = formData.get("order_id") as string | null;
    const fieldName = formData.get("field_name") as string | null;

    if (!file || !orderId || !fieldName)
      return NextResponse.json({ error: "file, order_id, field_name wajib diisi" }, { status: 400 });

    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "Ukuran file maksimal 5 MB" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Format file harus JPG, PNG, atau WebP" }, { status: 400 });

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${orderId}/konfirmasi/${fieldName}_${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const admin = createAdminClient();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error("[POST /api/stages/upload]", uploadErr.message);
      return NextResponse.json({ error: "Gagal mengunggah gambar" }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[POST /api/stages/upload] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
