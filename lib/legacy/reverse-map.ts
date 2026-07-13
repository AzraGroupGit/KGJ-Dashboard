// lib/legacy/reverse-map.ts
//
// Maps ERP stage keys → Yii2 id_status (the reverse of lib/legacy/status.ts).
// Used by stages/submit to push milestone status back to the Yii2 LIVE_SYSTEM.
// Kept in sync with the 20-step 1:1 alignment (2026-07-13).

export const STAGE_TO_YII2_STATUS: Record<string, number> = {
  penerimaan_order:          9,
  approval_penerimaan_order: 33,
  racik_bahan:               10,
  approval_racik_bahan:      34,
  lebur_bahan:               35,
  pembentukan_cincin:        12,
  pemasangan_permata:        36,
  pemolesan:                 37,
  cek_kadar:                 38,
  qc_1:                      39,
  approval_qc_1:             40,
  laser:                     41,
  finishing:                 24,
  approval_produksi:         42,
  qc_2:                      43,
  approval_qc_2:             44,
  konfirmasi:                45,
  packing:                   46,
  pengiriman:                14,
  selesai:                   15,
};

// Set of stages that the ERP pushes back to Yii2. By default only the 6
// customer-visible milestones fire; add/remove entries to control which
// stages sync. All 20 are available in STAGE_TO_YII2_STATUS above.
export const STAGES_THAT_PUSH_TO_YII2 = new Set<string>([
  "racik_bahan",
  "pembentukan_cincin",
  "finishing",
  "pengiriman",
  "selesai",
]);

// Reverse lookup helper for any stage (returns null if not in the map).
export function stageToYii2Status(stage: string): number | null {
  return STAGE_TO_YII2_STATUS[stage] ?? null;
}
