"use client";

import type { CsOrder } from "@/types/cs-orders";
import type { OrderFormData } from "@/lib/schemas/cs-order";

// ── Draft ────────────────────────────────────────────────────────────────────

export const DRAFT_PREFIX = "order-draft-";
export const DRAFT_INTERVAL = 5000;

export function draftKey(orderId: string) {
  return `${DRAFT_PREFIX}${orderId}`;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const today = new Date().toISOString().split("T")[0];

export const BANKS = ["BCA", "Mandiri", "BNI", "BRI"] as const;

export const LABELS: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  tiktok: "TikTok",
  marketplace: "Marketplace",
  recommendation: "Recommendation",
  ots: "OTS",
};

export const SOURCE_MAP: Record<string, string> = {
  Instagram: "instagram",
  Google: "google",
  TikTok: "tiktok",
  Marketplace: "marketplace",
  Recommendation: "recommendation",
  OTS: "ots",
};

export const SUB_SOURCES: Record<string, { value: string; label: string }[]> = {
  instagram: [
    { value: "sponsored_ads", label: "Sponsored Instagram/Ads" },
    { value: "brand_search", label: "Instagram Brand/Non-Brand Search" },
    { value: "posts", label: "Instagram Posts (Followed/Not Followed)" },
  ],
  google: [
    { value: "maps", label: "Google Maps" },
    { value: "search", label: "Google Search" },
    { value: "website", label: "Website" },
    { value: "youtube", label: "YouTube" },
  ],
  marketplace: [
    { value: "shopee", label: "Shopee" },
    { value: "tokopedia", label: "Tokopedia" },
  ],
  recommendation: [
    { value: "friends", label: "Friends" },
    { value: "family", label: "Family" },
    { value: "others", label: "Others" },
  ],
  ots: [
    { value: "billboards", label: "Billboards" },
    { value: "banners", label: "Banners" },
    { value: "neon_signs", label: "Neon Signs" },
    { value: "posters", label: "Posters" },
    { value: "flags", label: "Flags" },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function emptyFormData(): OrderFormData {
  return {
    tglChat: today,
    tglOrder: today,
    tglAcara: "",
    kategori: "",
    acara: "",
    deadline: "",
    orderVia: "",
    sumber: "",
    sumberMedia: "",
    dariArtis: "",
    dariArtisDetail: "",
    harga: "",
    dpPercent: "80",
    dp: "",
    namaLengkap: "",
    alamatPengiriman: "",
    kelurahan: "",
    kecamatan: "",
    kabupatenKota: "",
    provinsi: "",
    kodepos: "",
    noWA: "",
    email: "",
    instagram: "",
    ukuranPria: "",
    ukuranWanita: "",
    alatUkur: "",
    ukiranPria: "",
    ukiranWanita: "",
    ukiranCincinPria: "",
    ukiranCincinWanita: "",
    font: "",
    laserPosition: "",
    jenisCincinPria: "",
    jenisCincinWanita: "",
    gramasiPria: "",
    gramasiWanita: "",
    jenisCincinFeatures: [],
    modelBentukPria: [""],
    microsettingPria: [""],
    detailLaserPria: [""],
    detailFinishingPria: [""],
    modelBentukWanita: [""],
    microsettingWanita: [""],
    detailLaserWanita: [""],
    detailFinishingWanita: [""],
    pengiriman: "",
    box: "",
    transferKeBank: "",
    keteranganTambahan: "",
  };
}

export function paymentCategory(v: string): "ke_pt" | "non_pt_cash" | "" {
  if (!v) return "";
  if (v === "Ke PT" || (BANKS as readonly string[]).includes(v)) return "ke_pt";
  return "non_pt_cash";
}

export function normalizeSumber(v: string): string | null {
  return SOURCE_MAP[v] || v.toLowerCase() || null;
}

export function formatRupiah(raw: string): string {
  const n = raw.replace(/[^\d]/g, "");
  if (!n) return "";
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function csOrderToFormData(o: CsOrder): OrderFormData {
  return {
    tglChat: o.tgl_chat,
    tglOrder: o.tgl_order,
    tglAcara: o.tgl_acara ?? "",
    acara: o.acara ?? o.kebutuhan_acara ?? "",
    kategori: o.kategori ?? "",
    deadline: o.deadline ?? "",
    orderVia: o.order_via ?? "",
    sumber: o.sumber_detail ?? "",
    sumberMedia: o.sumber_media ? (LABELS[o.sumber_media] ?? o.sumber_media) : "",
    dariArtis: o.dari_artis === true ? "Iya" : o.dari_artis === false ? "Tidak" : "",
    dariArtisDetail: o.dari_artis_detail ?? "",
    harga: o.harga != null ? o.harga.toString() : "",
    dpPercent: o.harga && o.dp_amount ? String(Math.round((o.dp_amount / o.harga) * 100)) : "80",
    dp: o.dp_amount != null ? o.dp_amount.toString() : "",
    namaLengkap: o.customer_name,
    alamatPengiriman: o.alamat_pengiriman ?? "",
    kelurahan: o.kelurahan ?? "",
    kecamatan: o.kecamatan ?? "",
    kabupatenKota: o.kabupaten_kota ?? "",
    provinsi: o.provinsi ?? "",
    kodepos: o.kodepos ?? "",
    noWA: o.customer_wa ?? "",
    email: o.customer_email ?? "",
    instagram: o.customer_instagram ?? "",
    ukuranPria: o.ukuran_pria ?? "",
    ukuranWanita: o.ukuran_wanita ?? "",
    alatUkur: o.alat_ukur ?? "",
    ukiranPria: o.ukiran_pria ?? "",
    ukiranWanita: o.ukiran_wanita ?? "",
    ukiranCincinPria: o.ukiran_cincin_pria ?? "",
    ukiranCincinWanita: o.ukiran_cincin_wanita ?? "",
    font: o.font ?? "",
    laserPosition: o.laser_position ?? "",
    jenisCincinPria: o.jenis_cincin_pria ?? "",
    jenisCincinWanita: o.jenis_cincin_wanita ?? "",
    gramasiPria: o.gramasi_pria ? String(o.gramasi_pria) : "",
    gramasiWanita: o.gramasi_wanita ? String(o.gramasi_wanita) : "",
    jenisCincinFeatures: o.jenis_cincin_features ?? [],
    modelBentukPria: o.model_bentuk_pria?.length ? o.model_bentuk_pria : [""],
    microsettingPria: o.microsetting_pria?.length ? o.microsetting_pria : [""],
    detailLaserPria: o.detail_laser_pria?.length ? o.detail_laser_pria : [""],
    detailFinishingPria: o.detail_finishing_pria?.length ? o.detail_finishing_pria : [""],
    modelBentukWanita: o.model_bentuk_wanita?.length ? o.model_bentuk_wanita : [""],
    microsettingWanita: o.microsetting_wanita?.length ? o.microsetting_wanita : [""],
    detailLaserWanita: o.detail_laser_wanita?.length ? o.detail_laser_wanita : [""],
    detailFinishingWanita: o.detail_finishing_wanita?.length ? o.detail_finishing_wanita : [""],
    pengiriman: o.pengiriman ?? "",
    box: o.box ?? "",
    transferKeBank: o.transfer_ke_bank ?? "",
    keteranganTambahan: o.keterangan_tambahan ?? "",
  };
}

export function formDataToPatch(f: OrderFormData) {
  return {
    tgl_chat: f.tglChat,
    tgl_order: f.tglOrder,
    tgl_acara: f.tglAcara || null,
    acara: f.acara || null,
    kategori: f.kategori || null,
    deadline: f.deadline || null,
    order_via: f.orderVia || null,
    sumber_media: normalizeSumber(f.sumberMedia),
    sumber_detail: f.sumber || null,
    dari_artis: f.dariArtis === "Iya" ? true : f.dariArtis === "Tidak" ? false : null,
    dari_artis_detail: f.dariArtis === "Iya" ? f.dariArtisDetail || null : null,
    harga: f.harga ? parseInt(f.harga, 10) : null,
    dp_amount: f.dp ? parseInt(f.dp, 10) : null,
    customer_name: f.namaLengkap || undefined,
    customer_wa: f.noWA || null,
    customer_email: f.email || null,
    customer_instagram: f.instagram || null,
    alamat_pengiriman: f.alamatPengiriman || null,
    kelurahan: f.kelurahan || null,
    kecamatan: f.kecamatan || null,
    kabupaten_kota: f.kabupatenKota || null,
    provinsi: f.provinsi || null,
    kodepos: f.kodepos || null,
    alat_ukur: f.alatUkur || null,
    ukuran_pria: f.ukuranPria || null,
    ukiran_pria: f.ukiranPria || null,
    ukiran_cincin_pria: f.ukiranCincinPria || null,
    ukiran_cincin_wanita: f.ukiranCincinWanita || null,
    jenis_cincin_pria: f.jenisCincinPria || null,
    gramasi_pria: f.gramasiPria ? parseFloat(f.gramasiPria) : null,
    gramasi_wanita: f.gramasiWanita ? parseFloat(f.gramasiWanita) : null,
    model_bentuk_pria: f.modelBentukPria.filter(Boolean),
    microsetting_pria: f.microsettingPria.filter(Boolean),
    detail_laser_pria: f.detailLaserPria.filter(Boolean),
    detail_finishing_pria: f.detailFinishingPria.filter(Boolean),
    model_bentuk_wanita: f.modelBentukWanita.filter(Boolean),
    microsetting_wanita: f.microsettingWanita.filter(Boolean),
    detail_laser_wanita: f.detailLaserWanita.filter(Boolean),
    detail_finishing_wanita: f.detailFinishingWanita.filter(Boolean),
    ukuran_wanita: f.ukuranWanita || null,
    ukiran_wanita: f.ukiranWanita || null,
    jenis_cincin_wanita: f.jenisCincinWanita || null,
    jenis_cincin_features: f.jenisCincinFeatures.filter(Boolean),
    laser_position: (f.laserPosition as "dalam" | "luar" | "dalam_luar") || null,
    pengiriman: f.pengiriman || null,
    box: f.box || null,
    transfer_ke_bank: f.transferKeBank || null,
    keterangan_tambahan: f.keteranganTambahan || null,
  };
}
