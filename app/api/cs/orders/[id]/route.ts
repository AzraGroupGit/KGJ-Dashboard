// app/api/cs/orders/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCsOrAdmin } from "../route";
import { notifySupervisors } from "@/lib/notifications";

// ── Allowed update fields ──────────────────────────────────────────────────

const ALLOWED_FORM_FIELDS = new Set([
  "tgl_chat", "tgl_order", "tgl_acara", "deadline",
  "acara", "kebutuhan_acara", "kategori",
  "order_via", "order_via_channel",
  "sumber_media", "sumber_detail", "kgj_instagram_account", "kgj_instagram_account_custom", "dari_artis", "dari_artis_detail",
  "harga", "dp_amount",
  "customer_name", "customer_wa", "customer_email", "customer_instagram",
  "alamat_pengiriman", "kelurahan", "kecamatan", "kabupaten_kota", "provinsi", "kodepos",
  "alat_ukur",
  "gramasi_pria", "gramasi_wanita",
  "ukiran_cincin_pria", "ukiran_cincin_wanita",
  "ukuran_pria", "ukiran_pria", "jenis_cincin_pria",
  "model_bentuk_pria", "microsetting_pria", "detail_laser_pria", "detail_finishing_pria",
  "ukuran_wanita", "ukiran_wanita", "jenis_cincin_wanita", "jenis_cincin_features",
  "model_bentuk_wanita", "microsetting_wanita", "detail_laser_wanita", "detail_finishing_wanita",
  "font", "laser_position",
  "pengiriman", "box", "transfer_ke_bank", "keterangan_tambahan",
  "form_status", "reviewed_at", "reviewed_by", "promoted_to_order_id",
  "current_stage", "status", "updated_at", "completed_at",
  "reference_image_pria_url", "reference_image_wanita_url",
]);

// ── PUT /api/cs/orders/[id] ────────────────────────────────────────────────

export async function PUT(
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

    const body = (await request.json()) as Record<string, unknown>;

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FORM_FIELDS.has(key)) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field yang dapat diupdate" },
        { status: 400 },
      );
    }

    const isSubmittingForReview = patch.form_status === "reviewed";
    if (isSubmittingForReview) {
      if (!patch.reviewed_by) patch.reviewed_by = authUser.id;
      if (!patch.reviewed_at) patch.reviewed_at = new Date().toISOString();
      // Trigger production workflow: send to operational supervisor
      patch.current_stage = "approval_penerimaan_order";
      patch.status = "waiting_approval";
      patch.updated_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from("cs_orders")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[PUT /api/cs/orders/[id]]", error.message);
      return NextResponse.json({ error: "Gagal menyimpan order" }, { status: 500 });
    }

    // Record the stage transition so history is complete
    if (isSubmittingForReview) {
      await db.from("order_stage_transitions").insert({
        order_id: id,
        from_stage: null,
        to_stage: "approval_penerimaan_order",
        transitioned_by: authUser.id,
        reason: "CS mengirim order untuk approval penerimaan",
        transitioned_at: patch.updated_at,
      });

      notifySupervisors(
        "operational_supervisor",
        "Order Baru — Menunggu Approval",
        `Order ${data.order_number} dari CS menunggu persetujuan penerimaan.`,
        "info",
        `/dashboard/supervisor/approval`,
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PUT /api/cs/orders/[id]] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// ── DELETE /api/cs/orders/[id] ─────────────────────────────────────────────

export async function DELETE(
  _request: Request,
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

    const { error } = await db
      .from("cs_orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/cs/orders/[id]]", error.message);
      return NextResponse.json({ error: "Gagal menghapus order" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/cs/orders/[id]] unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
