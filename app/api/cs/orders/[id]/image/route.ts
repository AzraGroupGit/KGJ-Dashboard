// app/api/cs/orders/[id]/image/route.ts
// Upload a reference ring photo (pria or wanita) to Supabase Storage.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCsOrAdmin } from "../../route";

const BUCKET = "cs-order-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireCsOrAdmin(supabase);
    if ("error" in auth) return auth.error;

    const { authUser, roleName } = auth;
    const db = createAdminClient();

    // Ownership check
    let ownerQuery = db
      .from("cs_orders")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null);

    if (roleName === "customer_service") {
      ownerQuery = ownerQuery.eq("created_by", authUser.id);
    }

    const { data: existing, error: fetchErr } = await ownerQuery.single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const side = formData.get("side") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }
    if (side !== "pria" && side !== "wanita") {
      return NextResponse.json({ error: "Side harus 'pria' atau 'wanita'" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 5 MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format file harus JPG, PNG, atau WebP" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${id}/${side}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await db.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error("[POST /api/cs/orders/[id]/image] upload:", uploadErr.message);
      return NextResponse.json({ error: "Gagal mengunggah gambar" }, { status: 500 });
    }

    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(storagePath);

    const field =
      side === "pria" ? "reference_image_pria_url" : "reference_image_wanita_url";

    const { error: updateErr } = await db
      .from("cs_orders")
      .update({ [field]: publicUrl })
      .eq("id", id);

    if (updateErr) {
      console.error("[POST /api/cs/orders/[id]/image] update:", updateErr.message);
      return NextResponse.json({ error: "Gagal menyimpan URL gambar" }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[POST /api/cs/orders/[id]/image] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
