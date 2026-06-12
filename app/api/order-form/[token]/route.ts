// app/api/order-form/[token]/route.ts
// Public routes — no auth required. Identified by form_token (not internal id).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications";

const PUBLIC_SELECT = [
  "id",
  "order_number",
  "form_token",
  "form_status",
  "tgl_chat",
  "tgl_order",
  "tgl_acara",
  "deadline",
  "acara",
  "kebutuhan_acara",
  "kategori",
  "order_via",
  "sumber_media",
  "sumber_detail",
  "kgj_instagram_account",
  "kgj_instagram_account_custom",
  "dari_artis",
  "dari_artis_detail",
  "harga",
  "dp_amount",
  "customer_name",
  "customer_wa",
  "customer_email",
  "customer_instagram",
  "alamat_pengiriman",
  "kelurahan",
  "kecamatan",
  "kabupaten_kota",
  "provinsi",
  "kodepos",
  "alat_ukur",
  "gramasi_pria",
  "gramasi_wanita",
  "ukuran_pria",
  "ukiran_cincin_pria",
  "ukiran_cincin_wanita",
  "ukiran_pria",
  "jenis_cincin_pria",
  "model_bentuk_pria",
  "microsetting_pria",
  "detail_laser_pria",
  "detail_finishing_pria",
  "ukuran_wanita",
  "ukiran_wanita",
  "jenis_cincin_wanita",
  "jenis_cincin_features",
  "model_bentuk_wanita",
  "microsetting_wanita",
  "detail_laser_wanita",
  "detail_finishing_wanita",
  "font",
  "laser_position",
  "pengiriman",
  "box",
  "transfer_ke_bank",
  "submitted_at",
  "created_at",
  "current_stage",
  "status",
].join(", ");

// ── GET /api/order-form/[token] ────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
    }

    const db = createAdminClient();

    const { data, error } = await db
      .from("cs_orders")
      .select(PUBLIC_SELECT)
      .eq("form_token", token)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Formulir tidak ditemukan" },
        { status: 404 },
      );
    }

      const orderId = (data as any).id;

    const [stageResultsRes, transitionsRes, deliveriesRes] =
      await Promise.allSettled([
        db.from("stage_results").select(
          `id, stage, attempt_number, data, notes, started_at, finished_at,
           users!stage_results_user_id_fkey ( full_name )`,
        ).eq("order_id", orderId).not("finished_at", "is", null)
          .order("finished_at", { ascending: false }).limit(20),
        db.from("order_stage_transitions").select(
          `from_stage, to_stage, reason, transitioned_at,
           users!ost_transitioned_by_fkey ( full_name )`,
        ).eq("order_id", orderId).order("transitioned_at", { ascending: true }),
        db.from("deliveries").select(
          `id, delivery_method, status, courier_name, tracking_number,
           recipient_name, recipient_phone, delivery_address,
           dispatched_at, delivered_at, notes`,
        ).eq("order_id", orderId).order("created_at", { ascending: false }),
      ]);

    const stageResults =
      stageResultsRes.status === "fulfilled" ? stageResultsRes.value.data || [] : [];
    const transitions =
      transitionsRes.status === "fulfilled" ? transitionsRes.value.data || [] : [];
    const deliveries =
      deliveriesRes.status === "fulfilled" ? deliveriesRes.value.data || [] : [];

    return NextResponse.json({
      data,
      stageResults,
      transitions,
      deliveries,
    });
  } catch (err) {
    console.error("[GET /api/order-form/[token]] unexpected:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ── PUT /api/order-form/[token] ────────────────────────────────────────────
// Customer submits the form. Only allowed when form_status = 'pending'.

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
    }

    const db = createAdminClient();

    const { data: existing, error: fetchErr } = await db
      .from("cs_orders")
      .select("form_token, form_status, created_by")
      .eq("form_token", token)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: "Formulir tidak ditemukan" },
        { status: 404 },
      );
    }

    if (existing.form_status !== "pending") {
      return NextResponse.json(
        { error: "Formulir sudah pernah diisi sebelumnya" },
        { status: 409 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const patch: Record<string, unknown> = {
      form_status: "submitted",
      submitted_at: new Date().toISOString(),

      tgl_acara: body.tglAcara ?? null,
      deadline: body.deadline ?? null,
      acara: body.acara ?? null,
      kategori: strOrNull(body.kategori),

      order_via: body.orderVia ?? null,
      sumber_media: normalizeSumber(body.sumberMedia),
      sumber_detail: body.sumber ?? null,
      dari_artis: normalizeDariArtis(body.dariArtis),
      dari_artis_detail: strOrNull(body.dariArtisDetail),

      harga: toInt(body.harga),
      dp_amount: toInt(body.dp),

      ...(strOrNull(body.namaLengkap) !== null
        ? { customer_name: strOrNull(body.namaLengkap) }
        : {}),
      customer_wa: strOrNull(body.noWA),
      customer_email: strOrNull(body.email),
      customer_instagram: strOrNull(body.instagram),
      alamat_pengiriman: strOrNull(body.alamatPengiriman),
      kelurahan: strOrNull(body.kelurahan),
      kecamatan: strOrNull(body.kecamatan),
      kabupaten_kota: strOrNull(body.kabupatenKota),
      provinsi: strOrNull(body.provinsi),
      kodepos: strOrNull(body.kodepos),

      alat_ukur: strOrNull(body.alatUkur),
      gramasi_pria: toFloat(body.gramasiPria),
      gramasi_wanita: toFloat(body.gramasiWanita),
      ukuran_pria: strOrNull(body.ukuranPria),
      ukiran_cincin_pria: strOrNull(body.ukiranCincinPria),
      ukiran_cincin_wanita: strOrNull(body.ukiranCincinWanita),
      ukiran_pria: strOrNull(body.ukiranPria),
      jenis_cincin_pria: strOrNull(body.jenisCincinPria),
      model_bentuk_pria: filterArr(body.modelBentukPria),
      microsetting_pria: filterArr(body.microsettingPria),
      detail_laser_pria: filterArr(body.detailLaserPria),
      detail_finishing_pria: filterArr(body.detailFinishingPria),
      ukuran_wanita: strOrNull(body.ukuranWanita),
      ukiran_wanita: strOrNull(body.ukiranWanita),
      jenis_cincin_wanita: strOrNull(body.jenisCincinWanita),
      jenis_cincin_features: filterArr(body.jenisCincinFeatures),
      model_bentuk_wanita: filterArr(body.modelBentukWanita),
      microsetting_wanita: filterArr(body.microsettingWanita),
      detail_laser_wanita: filterArr(body.detailLaserWanita),
      detail_finishing_wanita: filterArr(body.detailFinishingWanita),

      font: strOrNull(body.font),
      laser_position: normalizeLaser(body.laserPosition),

      pengiriman: strOrNull(body.pengiriman),
      box: strOrNull(body.box),
      transfer_ke_bank: strOrNull(body.transferKeBank),
    };

    const { data, error } = await db
      .from("cs_orders")
      .update(patch)
      .eq("form_token", token)
      .select(PUBLIC_SELECT)
      .single();

    if (error) {
      console.error("[PUT /api/order-form/[token]]", error.message);
      return NextResponse.json(
        { error: "Gagal menyimpan formulir" },
        { status: 500 },
      );
    }

    const customerName = strOrNull(body.namaLengkap) || "Pelanggan";
    const orderNum = (data as any)?.order_number ?? "—";
    if (existing.created_by) {
      sendNotification({
        userId: existing.created_by,
        title: "Form Order Baru",
        message: `${customerName} telah mengisi form order ${orderNum}. Silakan review.`,
        type: "info",
        link: "/dashboard/cs/input-order",
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PUT /api/order-form/[token]] unexpected:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ── Normalizers ────────────────────────────────────────────────────────────

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

function toInt(v: unknown): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) ? null : n;
}

function toFloat(v: unknown): number | null {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) || n <= 0 ? null : n;
}

function filterArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as unknown[]).map(String).filter(Boolean);
}

const SOURCE_MAP: Record<string, string> = {
  Instagram: "instagram",
  Google: "google",
  TikTok: "tiktok",
  Marketplace: "marketplace",
  Recommendation: "recommendation",
  OTS: "ots",
};

function normalizeSumber(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return SOURCE_MAP[v] || v.toLowerCase() || null;
}

function normalizeDariArtis(v: unknown): boolean | null {
  if (v === "Iya" || v === true) return true;
  if (v === "Tidak" || v === false) return false;
  return null;
}

function normalizeLaser(v: unknown): "dalam" | "luar" | "dalam_luar" | null {
  if (v === "dalam" || v === "luar" || v === "dalam_luar") return v;
  return null;
}
