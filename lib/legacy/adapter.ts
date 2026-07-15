// lib/legacy/adapter.ts
//
// Maps legacy Yii2 order data (legacy_orders + tracking_stages + stage_history)
// into the object shapes main-erp API routes already return, so the frontend
// (components/pages) stays byte-for-byte unchanged.
//
// Fields that exist in cs_orders but have no legacy equivalent are returned as
// null (or "—" where a string is required by the UI). Only the DISPLAYED DATA
// changes; the response contract does not.

import { mapStatusToStage } from "@/lib/legacy/status";

// ── Yii2 inbound payload shape ────────────────────────────────────────────────

export interface Yii2OrderPayload {
  id: number;
  kode_order: string;
  no_nota?: string;
  nama: string;
  email?: string;
  no_hp?: string;
  alamat?: string;
  alamat_lengkap?: string;
  tgl_order?: string;
  tgl_selesai?: string;
  tgl_deadline_tukang?: string;
  id_status?: number;
  total_harga?: string;
  harga_final?: string;
  order_down_payment?: string;
  berat_cincin_pria?: string;
  berat_cincin_wanita?: string;
  catatan?: string;
  komponen?: Record<string, unknown>[];
}

export function buildLegacyOrderRow(order: Yii2OrderPayload) {
  return {
    legacy_id: order.id,
    kode_order: order.kode_order,
    no_nota: order.no_nota ?? null,
    nama: order.nama,
    email: order.email ?? null,
    no_hp: order.no_hp ?? null,
    alamat: order.alamat ?? null,
    alamat_lengkap: order.alamat_lengkap ?? null,
    tgl_order: order.tgl_order ?? null,
    tgl_selesai: order.tgl_selesai ?? null,
    tgl_deadline_tukang: order.tgl_deadline_tukang ?? null,
    id_status: order.id_status ?? null,
    total_harga: order.total_harga ? parseFloat(order.total_harga) || null : null,
    harga_final: order.harga_final ? parseFloat(order.harga_final) || null : null,
    order_down_payment: order.order_down_payment ? parseFloat(order.order_down_payment) || null : null,
    berat_cincin_pria: order.berat_cincin_pria ? parseFloat(order.berat_cincin_pria) || null : null,
    berat_cincin_wanita: order.berat_cincin_wanita ? parseFloat(order.berat_cincin_wanita) || null : null,
    catatan: order.catatan ?? null,
    komponen: order.komponen ?? [],
    last_synced_at: new Date().toISOString(),
  };
}

export function buildLegacyOrderUpdate(order: Yii2OrderPayload) {
  return {
    id_status: order.id_status ?? null,
    tgl_selesai: order.tgl_selesai ?? undefined,
    tgl_deadline_tukang: order.tgl_deadline_tukang ?? undefined,
    total_harga: order.total_harga ? parseFloat(order.total_harga) || null : null,
    harga_final: order.harga_final ? parseFloat(order.harga_final) || null : null,
    order_down_payment: order.order_down_payment ? parseFloat(order.order_down_payment) || null : null,
    berat_cincin_pria: order.berat_cincin_pria ? parseFloat(order.berat_cincin_pria) || null : null,
    berat_cincin_wanita: order.berat_cincin_wanita ? parseFloat(order.berat_cincin_wanita) || null : null,
    alamat_lengkap: order.alamat_lengkap ?? undefined,
    catatan: order.catatan ?? undefined,
    komponen: order.komponen ?? undefined,
    last_synced_at: new Date().toISOString(),
  };
}

// ── Source row shapes (public.legacy_orders / public.tracking_stages) ─────────

export interface LegacyOrderRow {
  id: string;
  legacy_id: number;
  kode_order: string;
  no_nota: string | null;
  nama: string;
  email: string | null;
  no_hp: string | null;
  alamat: string | null;
  alamat_lengkap: string | null;
  tgl_order: string | null;
  tgl_selesai: string | null;
  tgl_deadline_tukang: string | null;
  id_status: number | null;
  total_harga: number | null;
  harga_final: number | null;
  order_down_payment: number | null;
  berat_cincin_pria: number | null;
  berat_cincin_wanita: number | null;
  catatan: string | null;
  komponen: Record<string, unknown>[] | null;
  last_synced_at: string | null;
  created_at: string | null;
}

export interface TrackingStageRow {
  id: string;
  order_id: string;
  current_stage: string;
  stage_status: string;
  assigned_to: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

// ── Status mapping ────────────────────────────────────────────────────────────

// main-erp order status vocabulary: in_progress | waiting_approval | rework |
// completed. Legacy tracking only distinguishes in_progress vs completed, so we
// derive a best-effort status from the tracking pointer.
export function mapLegacyStatus(
  stageStatus: string | null | undefined,
  currentStage: string | null | undefined,
): string {
  if (currentStage === "selesai" || stageStatus === "completed") return "completed";
  if (currentStage?.startsWith("approval_")) return "waiting_approval";
  return "in_progress";
}

// Resolve the effective current stage: prefer the tracking pointer, otherwise
// derive from the Yii2 id_status, otherwise the pipeline entry point.
export function resolveCurrentStage(
  order: LegacyOrderRow,
  tracking?: TrackingStageRow | null,
): string {
  if (tracking?.current_stage) return tracking.current_stage;
  if (order.tgl_selesai) return "selesai";
  return mapStatusToStage(order.id_status ?? undefined);
}

// ── Order summary (workshop/orders, monitoring lists, supervisor lists) ───────

export interface OrderSummary {
  id: string;
  order_number: string;
  current_stage: string;
  status: string;
  deadline: string | null;
  updated_at: string | null;
  customer_name: string | null;
  customer_wa: string | null;
}

export function legacyToOrderSummary(
  order: LegacyOrderRow,
  tracking?: TrackingStageRow | null,
): OrderSummary {
  const current_stage = resolveCurrentStage(order, tracking);
  return {
    id: order.id,
    order_number: order.kode_order,
    current_stage,
    status: mapLegacyStatus(tracking?.stage_status, current_stage),
    deadline: order.tgl_selesai ?? null,
    updated_at: tracking?.updated_at ?? order.last_synced_at ?? order.created_at ?? null,
    customer_name: order.nama ?? null,
    customer_wa: order.no_hp ?? null,
  };
}

// ── Order detail (order-detail route) ─────────────────────────────────────────
//
// Same key set the frontend consumes today. Every cs_orders-only field that the
// legacy schema cannot supply is null; the UI already renders "—"/blank for null.

export function legacyToOrderDetail(
  order: LegacyOrderRow,
  tracking?: TrackingStageRow | null,
) {
  const current_stage = resolveCurrentStage(order, tracking);

  // Parse komponen array: split by gender into pria (1) / wanita (2).
  const komponenList = (order.komponen ?? []) as Array<Record<string, unknown>>;
  const pria = komponenList.find((k) => k.id_gender === 1);
  const wanita = komponenList.find((k) => k.id_gender === 2);

  return {
    id: order.id,
    order_number: order.kode_order,
    customer_name: order.nama ?? null,
    customer_wa: order.no_hp ?? null,
    customer_email: order.email ?? null,
    customer_instagram: null,
    tgl_chat: null,
    tgl_order: order.tgl_order ?? null,
    tgl_acara: null,
    deadline: order.tgl_selesai ?? null,
    acara: null,
    kebutuhan_acara: null,
    alat_ukur: null,
    gramasi_pria: order.berat_cincin_pria ?? null,
    gramasi_wanita: order.berat_cincin_wanita ?? null,
    ukiran_cincin_pria: null,
    ukiran_cincin_wanita: null,
    ukuran_pria: pria?.ukuran as string ?? null,
    ukiran_pria: pria?.teks as string ?? null,
    jenis_cincin_pria: pria?.id_jenis_bahan != null ? String(pria.id_jenis_bahan) : null,
    model_bentuk_pria: null,
    microsetting_pria: pria?.id_microsetting != null ? [String(pria.id_microsetting)] : null,
    detail_laser_pria: pria?.id_laser != null ? [String(pria.id_laser)] : null,
    detail_finishing_pria: pria?.id_finishing != null ? [String(pria.id_finishing)] : null,
    ukuran_wanita: wanita?.ukuran as string ?? null,
    ukiran_wanita: wanita?.teks as string ?? null,
    jenis_cincin_wanita: wanita?.id_jenis_bahan != null ? String(wanita.id_jenis_bahan) : null,
    model_bentuk_wanita: null,
    microsetting_wanita: wanita?.id_microsetting != null ? [String(wanita.id_microsetting)] : null,
    detail_laser_wanita: wanita?.id_laser != null ? [String(wanita.id_laser)] : null,
    detail_finishing_wanita: wanita?.id_finishing != null ? [String(wanita.id_finishing)] : null,
    font: null,
    laser_position: null,
    harga: order.harga_final ?? order.total_harga ?? null,
    dp_amount: order.order_down_payment ?? null,
    order_via: null,
    sumber_media: null,
    kategori: null,
    transfer_ke_bank: null,
    // Build jenis_cincin_features from komponen gemstone IDs
    jenis_cincin_features: [
      pria?.id_permata != null ? `permata_${pria.id_permata}` : null,
      wanita?.id_permata != null ? `permata_${wanita.id_permata}` : null,
    ].filter(Boolean) as string[] | null,
    dari_artis_detail: null,
    pengiriman: null,
    box: null,
    alamat_pengiriman: order.alamat ?? null,
    kelurahan: null,
    kecamatan: null,
    kabupaten_kota: null,
    provinsi: null,
    kodepos: null,
    reference_image_pria_url: null,
    reference_image_wanita_url: null,
    current_stage,
    status: mapLegacyStatus(tracking?.stage_status, current_stage),
    form_status: null,
    created_at: order.created_at ?? order.tgl_order ?? null,
    updated_at: tracking?.updated_at ?? order.last_synced_at ?? null,
    created_by_name: null,
    catatan: order.catatan ?? null,
  };
}
