// lib/legacy/status.ts
//
// 1:1 mapping between Yii2 id_status and ERP stage keys.
// Kept in sync with the live Yii2 system's `order_statuses` table.
// Last updated: 2026-07-13 — 20-stage 1:1 alignment.
//
// id_status=13 (Pelunasan) is intentionally absent — it is a Yii2-native
// payment status with no ERP equivalent. Incoming orders with id_status=13
// fall through to the default (penerimaan_order).

export const YII2_STATUS_TO_STAGE: Record<number, string> = {
  9:  "penerimaan_order",
  33: "approval_penerimaan_order",
  10: "racik_bahan",
  34: "approval_racik_bahan",
  35: "lebur_bahan",
  12: "pembentukan_cincin",
  36: "pemasangan_permata",
  37: "pemolesan",
  38: "cek_kadar",
  39: "qc_1",
  40: "approval_qc_1",
  41: "laser",
  24: "finishing",
  42: "approval_produksi",
  43: "qc_2",
  44: "approval_qc_2",
  45: "konfirmasi",
  46: "packing",
  14: "pengiriman",
  15: "selesai",
};

export function mapStatusToStage(idStatus: number | undefined): string {
  if (idStatus == null) return "penerimaan_order";
  return YII2_STATUS_TO_STAGE[idStatus] ?? "penerimaan_order";
}
