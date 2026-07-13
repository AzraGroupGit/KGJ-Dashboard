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

// ── Source row shapes (public.legacy_orders / public.tracking_stages) ─────────

export interface LegacyOrderRow {
  id: string;
  legacy_id: number;
  kode_order: string;
  nama: string;
  email: string | null;
  no_hp: string | null;
  alamat: string | null;
  tgl_order: string | null;
  tgl_selesai: string | null;
  id_status: number | null;
  catatan: string | null;
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
    gramasi_pria: null,
    gramasi_wanita: null,
    ukiran_cincin_pria: null,
    ukiran_cincin_wanita: null,
    ukuran_pria: null,
    ukiran_pria: null,
    jenis_cincin_pria: null,
    model_bentuk_pria: null,
    microsetting_pria: null,
    detail_laser_pria: null,
    detail_finishing_pria: null,
    ukuran_wanita: null,
    ukiran_wanita: null,
    jenis_cincin_wanita: null,
    model_bentuk_wanita: null,
    microsetting_wanita: null,
    detail_laser_wanita: null,
    detail_finishing_wanita: null,
    font: null,
    laser_position: null,
    harga: null,
    dp_amount: null,
    order_via: null,
    sumber_media: null,
    kategori: null,
    transfer_ke_bank: null,
    jenis_cincin_features: null,
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
