// types/cs-orders.ts — shared types for the CS order flow

export interface CsOrder {
  id: string;
  order_number: string;
  form_token: string;
  created_by: string;
  users?: {
    full_name: string;
  } | null;
  branch_id: string | null;

  form_status: "pending" | "submitted" | "reviewed" | "converted";
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  promoted_to_order_id: string | null;

  tgl_chat: string;
  tgl_order: string;
  tgl_acara: string | null;
  deadline: string | null;
  acara: string | null;
  kebutuhan_acara: string | null;
  kategori: string | null;

  order_via: string | null;
  order_via_channel: "online" | "offline" | null;
  sumber_media: string | null;
  sumber_detail: string | null;
  kgj_instagram_account: string | null;
  kgj_instagram_account_custom: string | null;
  dari_artis: boolean | null;
  dari_artis_detail: string | null;

  harga: number | null;
  dp_amount: number | null;

  customer_name: string;
  customer_wa: string | null;
  customer_email: string | null;
  customer_instagram: string | null;
  alamat_pengiriman: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kabupaten_kota: string | null;
  provinsi: string | null;
  kodepos: string | null;

  alat_ukur: string | null;

  gramasi_pria: number | null;
  gramasi_wanita: number | null;

  ukuran_pria: string | null;
  ukiran_pria: string | null;
  ukiran_cincin_pria: string | null;
  ukiran_cincin_wanita: string | null;
  jenis_cincin_pria: string | null;
  model_bentuk_pria: string[];
  microsetting_pria: string[];
  detail_laser_pria: string[];
  detail_finishing_pria: string[];

  ukuran_wanita: string | null;
  ukiran_wanita: string | null;
  jenis_cincin_wanita: string | null;
  jenis_cincin_features: string[];
  model_bentuk_wanita: string[];
  microsetting_wanita: string[];
  detail_laser_wanita: string[];
  detail_finishing_wanita: string[];

  font: string | null;
  laser_position: "dalam" | "luar" | "dalam_luar" | null;

  pengiriman: string | null;
  box: string | null;
  transfer_ke_bank: string | null;
  keterangan_tambahan: string | null;

  reference_image_pria_url: string | null;
  reference_image_wanita_url: string | null;

  created_at: string;
  updated_at: string;
}
