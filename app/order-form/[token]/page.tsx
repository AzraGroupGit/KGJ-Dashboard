// app/order-form/[token]/page.tsx
// Public page — no auth required. Customer fills this out from the link CS sends.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  countWorkingDays,
  getRecommendedKategori,
  KATEGORI_THRESHOLDS,
  addWorkingDays,
} from "@/lib/working-days";
import { checkSlotAvailability, type SlotCheckResult } from "@/lib/slot-check";
import AddressAutocomplete from "@/components/order/AddressAutocomplete";
import FontPicker from "@/components/order/FontPicker";
import MaterialSelect from "@/components/order/MaterialSelect";
import EngravingSelect from "@/components/order/EngravingSelect";
import AddsOnAccordion from "@/components/order/AddsOnAccordion";
import CustomerTimeline from "@/components/orders/CustomerTimeline";

interface OrderFormData {
  tglChat: string;
  tglOrder: string;
  tglAcara: string;
  kategori: string;
  acara: string;
  deadline: string;
  orderVia: string;
  sumber: string;
  sumberMedia: string;
  dariArtis: string;
  dariArtisDetail: string;
  harga: string;
  dpPercent: string;
  dp: string;
  namaLengkap: string;
  alamatPengiriman: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodepos: string;
  noWA: string;
  email: string;
  instagram: string;
  ukuranPria: string;
  ukuranWanita: string;
  alatUkur: string;
  ukiranPria: string;
  ukiranWanita: string;
  ukiranCincinPria: string;
  ukiranCincinWanita: string;
  font: string;
  laserPosition: string;
  jenisCincinPria: string;
  jenisCincinWanita: string;
  gramasiPria: string;
  gramasiWanita: string;
  jenisCincinFeatures: string[];
  modelBentukPria: string[];
  microsettingPria: string[];
  detailLaserPria: string[];
  detailFinishingPria: string[];
  modelBentukWanita: string[];
  microsettingWanita: string[];
  detailLaserWanita: string[];
  detailFinishingWanita: string[];
  pengiriman: string;
  box: string;
  transferKeBank: string;
}

interface OrderInfo {
  order_number: string;
  customer_name: string;
  form_status: string;
  tgl_acara: string | null;
  deadline: string | null;
  acara: string | null;
  kebutuhan_acara: string | null;
  kategori: string | null;
  order_via: string | null;
  order_via_channel: string | null;
  sumber_media: string | null;
  sumber_detail: string | null;
  kgj_instagram_account: string | null;
  kgj_instagram_account_custom: string | null;
  dari_artis: boolean | null;
  dari_artis_detail: string | null;
  harga: number | null;
  dp_amount: number | null;
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
  ukuran_pria: string | null;
  ukiran_pria: string | null;
  jenis_cincin_pria: string | null;
  ukuran_wanita: string | null;
  ukiran_wanita: string | null;
  jenis_cincin_wanita: string | null;
  jenis_cincin_features: string[];
  font: string | null;
  laser_position: string | null;
  pengiriman: string | null;
  box: string | null;
  transfer_ke_bank: string | null;
  current_stage: string | null;
  status: string | null;
}

type PageState = "loading" | "not_found" | "ready" | "submitted" | "error";

const emptyFormData = (): OrderFormData => ({
  tglChat: "",
  tglOrder: "",
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
});

function formatRupiah(raw: string): string {
  const n = raw.replace(/[^\d]/g, "");
  if (!n) return "";
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseRupiah(display: string): string {
  return display.replace(/\./g, "");
}

const LABELS: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  tiktok: "TikTok",
  marketplace: "Marketplace",
  recommendation: "Recommendation",
  ots: "OTS",
};

const SUB_SOURCES: Record<string, { value: string; label: string }[]> = {
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

const GOLD = "#C8A951";

const inputCls =
  "w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#C8A951] focus:border-[#C8A951] bg-white outline-none transition-colors";

const labelCls = "block text-sm font-medium text-zinc-700 mb-1";

function Required() {
  return (
    <span style={{ color: GOLD }} className="ml-1">
      *
    </span>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="my-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ backgroundColor: `${GOLD}40` }} />
        <span
          className="text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
          style={{ color: GOLD }}
        >
          {title}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: `${GOLD}40` }} />
      </div>
    </div>
  );
}

// ── Watermark background ───────────────────────────────────────────────────

const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="240"><text x="260" y="120" dominant-baseline="middle" text-anchor="middle" font-family="Georgia,serif" font-size="26" letter-spacing="3" fill="rgba(150,110,30,0.10)" transform="rotate(-28 260 120)">PT Kotagede Jewellery</text></svg>`;
const watermarkUrl = `url("data:image/svg+xml,${encodeURIComponent(watermarkSvg)}")`;

const STORAGE_KEY = (t: string) => `order-form-draft-${t}`;

export default function OrderFormPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData());
  const [errors, setErrors] = useState<
    Partial<Record<keyof OrderFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hargaDisplay, setHargaDisplay] = useState("");
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [slotInfo, setSlotInfo] = useState<SlotCheckResult | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [stageResults, setStageResults] = useState<Array<Record<string, unknown>>>([]);
  const [transitions, setTransitions] = useState<Array<Record<string, unknown>>>([]);
  const [deliveries, setDeliveries] = useState<Array<Record<string, unknown>>>([]);

  const saveDraft = useCallback(
    (data: OrderFormData) => {
      try {
        localStorage.setItem(STORAGE_KEY(token), JSON.stringify(data));
      } catch {}
    },
    [token],
  );

  const loadDraft = useCallback((): OrderFormData | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(token));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.jenisCincinFeatures))
        parsed.jenisCincinFeatures = [];
      if (!Array.isArray(parsed.modelBentukPria)) parsed.modelBentukPria = [""];
      if (!Array.isArray(parsed.microsettingPria))
        parsed.microsettingPria = [""];
      if (!Array.isArray(parsed.detailLaserPria)) parsed.detailLaserPria = [""];
      if (!Array.isArray(parsed.detailFinishingPria))
        parsed.detailFinishingPria = [""];
      if (!Array.isArray(parsed.modelBentukWanita))
        parsed.modelBentukWanita = [""];
      if (!Array.isArray(parsed.microsettingWanita))
        parsed.microsettingWanita = [""];
      if (!Array.isArray(parsed.detailLaserWanita))
        parsed.detailLaserWanita = [""];
      if (!Array.isArray(parsed.detailFinishingWanita))
        parsed.detailFinishingWanita = [""];
      if (typeof parsed.dariArtisDetail !== "string")
        parsed.dariArtisDetail = "";
      delete parsed.kgjInstagramAccount;
      delete parsed.kgjInstagramAccountCustom;
      return parsed as OrderFormData;
    } catch {
      return null;
    }
  }, [token]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY(token));
    } catch {}
  }, [token]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/order-form/${token}`);
        if (res.status === 404) {
          setPageState("not_found");
          return;
        }
        if (!res.ok) {
          setPageState("error");
          return;
        }
        const json = await res.json();
        const { data } = json;
        setOrderInfo(data);
        if (json.stageResults) setStageResults(json.stageResults);
        if (json.transitions) setTransitions(json.transitions);
        if (json.deliveries) setDeliveries(json.deliveries);

        if (data.form_status !== "pending") {
          setPageState("submitted");
          return;
        }

        const saved = loadDraft();
        if (saved) {
          setFormData(saved);
          if (saved.harga) setHargaDisplay(formatRupiah(saved.harga));
          setPageState("ready");
          return;
        }

        const rawHarga = String(data.harga ?? "");
        const today = new Date().toISOString().split("T")[0];
        setFormData({
          ...emptyFormData(),
          tglOrder: data.tgl_order || today,
          tglAcara: data.tgl_acara ?? "",
          deadline: data.deadline ?? "",
          kategori: data.kategori ?? "",
          acara: data.acara ?? data.kebutuhan_acara ?? "",
          orderVia: data.order_via ?? "",
          sumberMedia: data.sumber_media
            ? (LABELS[data.sumber_media] ?? data.sumber_media)
            : "",
          sumber: data.sumber_detail ?? "",
          dariArtis:
            data.dari_artis === true
              ? "Iya"
              : data.dari_artis === false
                ? "Tidak"
                : "",
          dariArtisDetail: data.dari_artis_detail ?? "",
          harga: rawHarga,
          dpPercent:
            data.harga && data.dp_amount
              ? String(Math.round((data.dp_amount / data.harga) * 100))
              : "80",
          dp: data.dp_amount != null ? data.dp_amount.toString() : "",
          namaLengkap: data.customer_name ?? "",
          noWA: data.customer_wa ?? "",
          email: data.customer_email ?? "",
          instagram: data.customer_instagram ?? "",
          alamatPengiriman: data.alamat_pengiriman ?? "",
          kelurahan: data.kelurahan ?? "",
          kecamatan: data.kecamatan ?? "",
          kabupatenKota: data.kabupaten_kota ?? "",
          provinsi: data.provinsi ?? "",
          kodepos: data.kodepos ?? "",
          alatUkur: data.alat_ukur ?? "",
          ukuranPria: data.ukuran_pria ?? "",
          ukiranPria: data.ukiran_pria ?? "",
          ukiranCincinPria: data.ukiran_cincin_pria ?? "",
          jenisCincinPria: data.jenis_cincin_pria ?? "",
          gramasiPria: data.gramasi_pria ? String(data.gramasi_pria) : "",
          ukuranWanita: data.ukuran_wanita ?? "",
          ukiranCincinWanita: data.ukiran_cincin_wanita ?? "",
          gramasiWanita: data.gramasi_wanita ? String(data.gramasi_wanita) : "",
          ukiranWanita: data.ukiran_wanita ?? "",
          jenisCincinWanita: data.jenis_cincin_wanita ?? "",
          jenisCincinFeatures: data.jenis_cincin_features ?? [],
          modelBentukPria: data.model_bentuk_pria?.length
            ? data.model_bentuk_pria
            : [""],
          microsettingPria: data.microsetting_pria?.length
            ? data.microsetting_pria
            : [""],
          detailLaserPria: data.detail_laser_pria?.length
            ? data.detail_laser_pria
            : [""],
          detailFinishingPria: data.detail_finishing_pria?.length
            ? data.detail_finishing_pria
            : [""],
          modelBentukWanita: data.model_bentuk_wanita?.length
            ? data.model_bentuk_wanita
            : [""],
          microsettingWanita: data.microsetting_wanita?.length
            ? data.microsetting_wanita
            : [""],
          detailLaserWanita: data.detail_laser_wanita?.length
            ? data.detail_laser_wanita
            : [""],
          detailFinishingWanita: data.detail_finishing_wanita?.length
            ? data.detail_finishing_wanita
            : [""],
          font: data.font ?? "",
          laserPosition: data.laser_position ?? "",
          pengiriman: data.pengiriman ?? "",
          box: data.box ?? "",
          transferKeBank: data.transfer_ke_bank ?? "",
        });
        if (rawHarga) setHargaDisplay(formatRupiah(rawHarga));
        setPageState("ready");
      } catch {
        setPageState("error");
      }
    };
    load();
  }, [token, loadDraft]);

  useEffect(() => {
    if (formData.tglOrder && formData.deadline) {
      const days = countWorkingDays(formData.tglOrder, formData.deadline);
      setWorkingDays(days);
      const recommended = getRecommendedKategori(days);
      if (formData.kategori) {
        const t = KATEGORI_THRESHOLDS.find(
          (k) => k.value === formData.kategori,
        );
        if (t && days < t.minDays) {
          setField("kategori", recommended ?? "");
        }
      } else if (recommended) {
        setField("kategori", recommended);
      }
    } else {
      setWorkingDays(null);
    }
  }, [formData.tglOrder, formData.deadline]);

  useEffect(() => {
    if (formData.kategori && formData.tglOrder) {
      const threshold = KATEGORI_THRESHOLDS.find((k) => k.value === formData.kategori);
      if (threshold) {
        const suggestedDeadline = addWorkingDays(formData.tglOrder, threshold.minDays);
        if (!formData.deadline) {
          setField("deadline", suggestedDeadline);
        }
      }
    }
  }, [formData.kategori]);

  useEffect(() => {
    if (formData.kategori && formData.tglOrder) {
      setSlotLoading(true);
      checkSlotAvailability(formData.kategori, formData.tglOrder).then((result) => {
        setSlotInfo(result);
        setSlotLoading(false);
      });
    } else {
      setSlotInfo(null);
    }
  }, [formData.kategori, formData.tglOrder]);

  const setField = <K extends keyof OrderFormData>(
    key: K,
    val: OrderFormData[K],
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: val };
      saveDraft(next);
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleHargaChange = (val: string) => {
    const raw = val.replace(/[^\d]/g, "");
    setHargaDisplay(formatRupiah(raw));
    const pct = parseInt(formData.dpPercent || "80", 10);
    setField("harga", raw);
    setField(
      "dp",
      raw ? Math.round((parseInt(raw, 10) * pct) / 100).toString() : "",
    );
  };

  const handleDpPercentChange = (pct: string) => {
    setField("dpPercent", pct);
    const p = parseInt(pct, 10);
    setField(
      "dp",
      formData.harga
        ? Math.round((parseInt(formData.harga, 10) * p) / 100).toString()
        : "",
    );
  };

  // ── Detail handlers ──────────────────────────────────────────────
  const detailFields = [
    "modelBentukPria",
    "microsettingPria",
    "detailLaserPria",
    "detailFinishingPria",
    "modelBentukWanita",
    "microsettingWanita",
    "detailLaserWanita",
    "detailFinishingWanita",
  ] as const;
  type DetailField = (typeof detailFields)[number];

  const addDetailRow = (field: DetailField) => {
    const arr = [...(formData[field] as string[]), ""];
    setField(field, arr);
  };
  const removeDetailRow = (field: DetailField, i: number) => {
    const arr = (formData[field] as string[]).filter((_, idx) => idx !== i);
    setField(field, arr.length ? arr : [""]);
  };
  const setDetailRow = (field: DetailField, i: number, val: string) => {
    const arr = [...(formData[field] as string[])];
    arr[i] = val;
    setField(field, arr);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof OrderFormData, string>> = {};
    if (!formData.namaLengkap.trim())
      errs.namaLengkap = "Nama lengkap wajib diisi";
    if (!formData.noWA.trim()) errs.noWA = "Nomor WhatsApp wajib diisi";
    if (!formData.alamatPengiriman.trim())
      errs.alamatPengiriman = "Alamat pengiriman wajib diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      const firstErrEl = document.querySelector("[data-error]");
      firstErrEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/order-form/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Gagal menyimpan");
      }
      clearDraft();
      setPageState("submitted");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Shared page shell ──────────────────────────────────────────────────────

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: "#F2E4C0" }}
    >
      <div
        className="fixed inset-0 pointer-events-none select-none"
        style={{ backgroundImage: watermarkUrl, backgroundSize: "520px 240px" }}
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );

  // ── Page states ────────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <Shell>
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: `${GOLD} transparent transparent transparent`,
            }}
          />
          <p className="text-zinc-600 text-sm">Memuat formulir...</p>
        </div>
      </Shell>
    );
  }

  if (pageState === "not_found") {
    return (
      <Shell>
        <div
          className="bg-white rounded-2xl shadow-2xl p-8 text-center"
          style={{ boxShadow: `0 0 40px rgba(200,169,81,0.08)` }}
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">
            Link Tidak Valid
          </h2>
          <p className="text-zinc-500 text-sm">
            Formulir tidak ditemukan. Pastikan link yang Anda gunakan sudah
            benar, atau hubungi CS kami.
          </p>
        </div>
      </Shell>
    );
  }

  if (pageState === "error") {
    return (
      <Shell>
        <div
          className="bg-white rounded-2xl shadow-2xl p-8 text-center"
          style={{ boxShadow: `0 0 40px rgba(200,169,81,0.08)` }}
        >
          <p className="text-zinc-600 text-sm">
            Terjadi kesalahan. Silakan muat ulang halaman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 text-white font-semibold rounded-lg text-sm transition-colors"
            style={{ backgroundColor: GOLD }}
          >
            Muat Ulang
          </button>
        </div>
      </Shell>
    );
  }

  if (pageState === "submitted") {
    const currentStage =
      orderInfo?.current_stage ??
      (transitions.length > 0
        ? transitions[transitions.length - 1].to_stage as string
        : null);

    return (
      <Shell>
        <div className="space-y-3">
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 text-center"
            style={{ boxShadow: `0 0 40px rgba(200,169,81,0.12)` }}
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-emerald-200">
              <svg
                className="w-10 h-10 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">
              Terima Kasih!
            </h2>
            <p className="text-zinc-600 mb-1 text-sm">
              Formulir order Anda sudah berhasil dikirim.
            </p>
            <p className="text-zinc-400 text-xs">
              Tim CS <strong>PT. Kotagede Jewellery</strong> akan segera
              menghubungi Anda untuk konfirmasi.
            </p>
            <div
              className="mt-6 rounded-xl p-4 text-left border"
              style={{ backgroundColor: `${GOLD}10`, borderColor: `${GOLD}40` }}
            >
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                No. Order Anda
              </p>
              <p className="font-mono font-bold text-xl" style={{ color: GOLD }}>
                {orderInfo?.order_number}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-zinc-800 shadow-lg hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
            style={{ boxShadow: `0 4px 20px rgba(200,169,81,0.12)` }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showTimeline ? "Sembunyikan Status" : "Lacak Status Pesanan"}
          </button>

          {showTimeline && (
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <CustomerTimeline
                currentStage={currentStage}
                status={orderInfo?.status ?? orderInfo?.form_status ?? "submitted"}
                stageResults={stageResults as any}
                transitions={transitions as any}
                deliveries={deliveries as any}
                deadline={orderInfo?.deadline ?? null}
                referenceImagePria={null}
                referenceImageWanita={null}
              />
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen py-8 px-4 relative"
      style={{ backgroundColor: "#F2E4C0" }}
    >
      {/* Watermark */}
      <div
        className="fixed inset-0 pointer-events-none select-none"
        style={{ backgroundImage: watermarkUrl, backgroundSize: "520px 240px" }}
      />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Brand header */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="PT Kotagede Jewellery"
              className="h-40 w-auto object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-zinc-900 uppercase">
            PT. Kotagede Jewellery
          </h1>
          <p
            className="text-xs font-semibold tracking-[0.25em] mt-1 uppercase"
            style={{ color: GOLD }}
          >
            Formulir Order Cincin
          </p>
          {/* Gold divider */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <div
              className="h-px w-12"
              style={{ backgroundColor: `${GOLD}50` }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: GOLD }}
            />
            <div
              className="h-px w-12"
              style={{ backgroundColor: `${GOLD}50` }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl overflow-hidden shadow-2xl"
          style={{
            boxShadow: `0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px ${GOLD}50`,
          }}
        >
          {/* Order info banner */}
          <div
            className="bg-zinc-900 px-6 py-4"
            style={{ borderBottom: `1px solid ${GOLD}30` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
                  Nomor Order
                </p>
                <p className="font-mono font-bold text-lg text-white">
                  {orderInfo?.order_number}
                </p>
              </div>
              <div className="w-px h-8 bg-zinc-700" />
              <div className="text-right min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
                  Customer
                </p>
                <p className="text-white font-semibold text-sm truncate max-w-[150px]">
                  {orderInfo?.customer_name}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-6 space-y-1">
            {/* ── Informasi Order ─────────────────────────────────────── */}
            <SectionDivider title="Informasi Order" />

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tgl Acara</label>
                  <input
                    type="date"
                    value={formData.tglAcara}
                    onChange={(e) => setField("tglAcara", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setField("deadline", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Kategori</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setField("kategori", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih kategori</option>
                  {KATEGORI_THRESHOLDS.map((k) => (
                    <option
                      key={k.value}
                      value={k.value}
                      disabled={workingDays !== null && workingDays < k.minDays}
                    >
                      {k.label}
                      {workingDays !== null && workingDays < k.minDays
                        ? ` (butuh ${k.minDays} hari)`
                        : ""}
                    </option>
                  ))}
                </select>
                {workingDays !== null && (
                  <p
                    className={`text-xs mt-1 ${workingDays < 3 ? "text-red-500 font-medium" : "text-zinc-400"}`}
                  >
                    {workingDays < 3
                      ? `Hanya ${workingDays} hari kerja tersedia — tidak cukup untuk paket manapun`
                      : `${workingDays} hari kerja tersedia`}
                  </p>
                )}
                {slotLoading && (
                  <p className="text-xs text-zinc-400 mt-1">Memeriksa slot...</p>
                )}
                {slotInfo && slotInfo.is_full && (
                  <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                    <span>⚠</span>
                    <span>Slot {slotInfo.label} untuk tanggal {new Date(slotInfo.tgl_order).toLocaleDateString("id-ID")} penuh ({slotInfo.used}/{slotInfo.total_slots} terpakai)</span>
                  </p>
                )}
                {slotInfo && !slotInfo.is_full && slotInfo.total_slots > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Slot tersedia: {slotInfo.available} dari {slotInfo.total_slots}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Acara</label>
                <select
                  value={formData.acara}
                  onChange={(e) => setField("acara", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih acara</option>
                  {[
                    "Lamaran/Tunangan",
                    "Pernikahan",
                    "Anniversary",
                    "Kado",
                    "Lain-lain",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Order Via</label>
                <select
                  value={formData.orderVia}
                  onChange={(e) => setField("orderVia", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih cara order</option>
                  <option value="Offline">Offline</option>
                  <option value="Online+Offline">Online + Offline</option>
                  <option value="Online">Online</option>
                  <option value="Marketplace">Marketplace</option>
                </select>
              </div>

              {/* Sumber block */}
              <div className="space-y-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Dari mana Anda mengetahui tentang Kotagede Jewelry?
                </p>
                <div>
                  <label className={labelCls}>Sumber informasi</label>
                  <select
                    value={formData.sumberMedia}
                    onChange={(e) => {
                      setField("sumberMedia", e.target.value);
                      setField("sumber", "");
                    }}
                    className={inputCls}
                  >
                    <option value="">Pilih sumber</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Google">Google</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Recommendation">Recommendation</option>
                    <option value="OTS">On The Spot (OTS)</option>
                  </select>
                </div>

                {formData.sumberMedia && (
                  <div>
                    <label className={labelCls}>
                      {formData.sumberMedia === "TikTok" ? "" : "Detail"}
                    </label>
                    {formData.sumberMedia === "TikTok" ? (
                      <p className="text-sm text-zinc-500">TikTok</p>
                    ) : (
                      (() => {
                        const REC_OPTS = ["friends", "family", "others"];
                        const isRecCustom =
                          formData.sumberMedia === "Recommendation" &&
                          formData.sumber &&
                          !REC_OPTS.includes(formData.sumber);
                        return (
                          <>
                            <select
                              value={isRecCustom ? "others" : formData.sumber}
                              onChange={(e) =>
                                setField("sumber", e.target.value)
                              }
                              className={inputCls}
                            >
                              <option value="">Pilih detail</option>
                              {(
                                SUB_SOURCES[
                                  formData.sumberMedia.toLowerCase()
                                ] || []
                              ).map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {formData.sumberMedia === "Recommendation" &&
                              (formData.sumber === "others" || isRecCustom) && (
                                <input
                                  type="text"
                                  value={isRecCustom ? formData.sumber : ""}
                                  onChange={(e) =>
                                    setField("sumber", e.target.value)
                                  }
                                  placeholder="Tulis siapa yang merekomendasikan..."
                                  className={`${inputCls} mt-2`}
                                />
                              )}
                          </>
                        );
                      })()
                    )}
                  </div>
                )}

                <div>
                  <label className={labelCls}>
                    Tahu Kotagede Jewellery dari Artis / Selebgram?
                  </label>
                  <div className="flex gap-4 mt-1">
                    {["Iya", "Tidak"].map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="dariArtis"
                          value={v}
                          checked={formData.dariArtis === v}
                          onChange={() => {
                            setField("dariArtis", v);
                            if (v !== "Iya") setField("dariArtisDetail", "");
                          }}
                          className="w-4 h-4"
                          style={{ accentColor: GOLD }}
                        />
                        <span className="text-sm text-zinc-700">{v}</span>
                      </label>
                    ))}
                  </div>
                  {formData.dariArtis === "Iya" && (
                    <input
                      type="text"
                      value={formData.dariArtisDetail}
                      onChange={(e) =>
                        setField("dariArtisDetail", e.target.value)
                      }
                      placeholder="Tulis nama artis / selebgram..."
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ── Harga ───────────────────────────────────────────────── */}
            <SectionDivider title="Harga" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Harga (±)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-sm pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={hargaDisplay}
                    onChange={(e) => handleHargaChange(e.target.value)}
                    placeholder="0"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                {hargaDisplay && (
                  <p
                    className="text-xs mt-1 font-medium"
                    style={{ color: GOLD }}
                  >
                    Rp {hargaDisplay}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>DP</label>
                <div className="flex gap-3 mb-2">
                  {["33", "50", "80"].map((pct) => (
                    <label
                      key={pct}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="dpPercent"
                        value={pct}
                        checked={formData.dpPercent === pct}
                        onChange={() => handleDpPercentChange(pct)}
                        className="w-4 h-4"
                        style={{ accentColor: GOLD }}
                      />
                      <span className="text-sm text-zinc-700">{pct}%</span>
                    </label>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-sm pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={formData.dp ? formatRupiah(formData.dp) : ""}
                    readOnly
                    placeholder="0"
                    className={`${inputCls} pl-9 bg-zinc-50 text-zinc-400`}
                  />
                </div>
                {formData.dp && (
                  <p
                    className="text-xs mt-1 font-medium"
                    style={{ color: GOLD }}
                  >
                    Rp {formatRupiah(formData.dp)}
                  </p>
                )}
              </div>
            </div>

            {/* ── Data Pelanggan ───────────────────────────────────────── */}
            <SectionDivider title="Data Pelanggan" />

            <div className="space-y-4">
              <div data-error={errors.namaLengkap}>
                <label className={labelCls}>
                  Nama Lengkap
                  <Required />
                </label>
                <input
                  type="text"
                  value={formData.namaLengkap}
                  onChange={(e) => setField("namaLengkap", e.target.value)}
                  placeholder="Sesuai KTP"
                  className={`${inputCls} ${errors.namaLengkap ? "border-red-400 ring-1 ring-red-300" : ""}`}
                />
                {errors.namaLengkap && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.namaLengkap}
                  </p>
                )}
              </div>

              {/* Address autocomplete */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <label className="block text-sm font-semibold text-zinc-800">
                  Cari Alamat Otomatis
                </label>
                <p className="text-xs text-zinc-500">
                  Ketik nama jalan atau area, lalu pilih dari daftar — kolom
                  alamat di bawah terisi otomatis.
                </p>
                <AddressAutocomplete
                  onSelect={(parsed) => {
                    setField("alamatPengiriman", parsed.alamatPengiriman);
                    setField("kelurahan", parsed.kelurahan);
                    setField("kecamatan", parsed.kecamatan);
                    setField("kabupatenKota", parsed.kabupatenKota);
                    setField("provinsi", parsed.provinsi);
                    setField("kodepos", parsed.kodepos);
                  }}
                />
              </div>

              <div data-error={errors.alamatPengiriman}>
                <label className={labelCls}>
                  Alamat Pengiriman (Jalan / Nomor Rumah / RT-RW)
                  <Required />
                </label>
                <textarea
                  value={formData.alamatPengiriman}
                  onChange={(e) => setField("alamatPengiriman", e.target.value)}
                  rows={2}
                  placeholder="Nama jalan, nomor rumah, RT/RW, Blok"
                  className={`${inputCls} ${errors.alamatPengiriman ? "border-red-400 ring-1 ring-red-300" : ""}`}
                />
                {errors.alamatPengiriman && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.alamatPengiriman}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Kelurahan / Desa</label>
                  <input
                    type="text"
                    value={formData.kelurahan}
                    onChange={(e) => setField("kelurahan", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Kecamatan</label>
                  <input
                    type="text"
                    value={formData.kecamatan}
                    onChange={(e) => setField("kecamatan", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={formData.kabupatenKota}
                    onChange={(e) => setField("kabupatenKota", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Provinsi</label>
                  <input
                    type="text"
                    value={formData.provinsi}
                    onChange={(e) => setField("provinsi", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="w-full sm:w-1/3">
                <label className={labelCls}>Kode Pos</label>
                <input
                  type="text"
                  value={formData.kodepos}
                  onChange={(e) => setField("kodepos", e.target.value)}
                  placeholder="12345"
                  className={inputCls}
                />
              </div>

              <div data-error={errors.noWA}>
                <label className={labelCls}>
                  No. WhatsApp
                  <Required />
                </label>
                <input
                  type="tel"
                  value={formData.noWA}
                  onChange={(e) => setField("noWA", e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={`${inputCls} ${errors.noWA ? "border-red-400 ring-1 ring-red-300" : ""}`}
                />
                {errors.noWA && (
                  <p className="text-red-500 text-xs mt-1">{errors.noWA}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="email@contoh.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Akun Instagram Anda</label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setField("instagram", e.target.value)}
                    placeholder="@username_anda"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ── Ukuran ───────────────────────────────────────────────── */}
            <SectionDivider title="Ukuran Cincin" />

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Alat Ukur</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="alatUkur"
                      value="Dari Store"
                      checked={formData.alatUkur === "Dari Store"}
                      onChange={() => setField("alatUkur", "Dari Store")}
                      className="w-4 h-4"
                      style={{ accentColor: GOLD }}
                    />
                    <span className="text-sm text-zinc-700">Dari Store</span>
                  </label>
                  {formData.alatUkur === "Dari Store" && (
                    <p className="text-xs text-emerald-600 ml-6">✓ Tercover garansi re-size selama 1 bulan</p>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="alatUkur"
                      value="Luar Store"
                      checked={formData.alatUkur === "Luar Store"}
                      onChange={() => setField("alatUkur", "Luar Store")}
                      className="w-4 h-4"
                      style={{ accentColor: GOLD }}
                    />
                    <span className="text-sm text-zinc-700">Luar Store</span>
                  </label>
                  {formData.alatUkur === "Luar Store" && (
                    <p className="text-xs text-rose-500 ml-6">✗ Tidak tercover garansi re-size</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ukuran Pria</label>
                  <input
                    type="text"
                    value={formData.ukuranPria}
                    onChange={(e) => setField("ukuranPria", e.target.value)}
                    placeholder="Contoh: 18 / L / 57mm"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Ukuran Wanita</label>
                  <input
                    type="text"
                    value={formData.ukuranWanita}
                    onChange={(e) => setField("ukuranWanita", e.target.value)}
                    placeholder="Contoh: 15 / M / 52mm"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ── Ukiran Nama ───────────────────────────────────────────── */}
            <SectionDivider title="Ukiran Nama" />

            <div
              className="rounded-lg border px-3 py-2.5 text-xs mb-4"
              style={{
                backgroundColor: `${GOLD}08`,
                borderColor: `${GOLD}30`,
                color: "#7a6030",
              }}
            >
              Maksimal <strong>15 karakter</strong> sudah dengan simbol dan
              spasi
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>di cincin Pria</label>
                  <input
                    type="text"
                    value={formData.ukiranPria}
                    onChange={(e) =>
                      setField("ukiranPria", e.target.value.slice(0, 15))
                    }
                    maxLength={15}
                    className={inputCls}
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    {formData.ukiranPria.length}/15
                  </p>
                </div>
                <div>
                  <label className={labelCls}>di cincin Wanita</label>
                  <input
                    type="text"
                    value={formData.ukiranWanita}
                    onChange={(e) =>
                      setField("ukiranWanita", e.target.value.slice(0, 15))
                    }
                    maxLength={15}
                    className={inputCls}
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    {formData.ukiranWanita.length}/15
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ukiran Cincin Pria</label>
                  <EngravingSelect
                    value={formData.ukiranCincinPria}
                    onChange={(v) => setField("ukiranCincinPria", v)}
                    placeholder="Pilih jenis ukiran"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ukiran Cincin Wanita</label>
                  <EngravingSelect
                    value={formData.ukiranCincinWanita}
                    onChange={(v) => setField("ukiranCincinWanita", v)}
                    placeholder="Pilih jenis ukiran"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Font</label>
                <FontPicker
                  value={formData.font}
                  onChange={(v) => setField("font", v)}
                />
              </div>
              <div className="mt-3">
                <label className={labelCls}>Laser nama di</label>
                <select
                  value={formData.laserPosition}
                  onChange={(e) => setField("laserPosition", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih posisi</option>
                  <option value="dalam">Dalam cincin</option>
                  <option value="luar">Luar cincin</option>
                  <option value="dalam_luar">Dalam &amp; luar</option>
                </select>
              </div>
            </div>

            {/* ── Jenis Cincin ─────────────────────────────────────────── */}
            <SectionDivider title="Jenis Cincin" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cincin Pria</label>
                <MaterialSelect
                  value={formData.jenisCincinPria}
                  onChange={(v) => setField("jenisCincinPria", v)}
                  placeholder="Pilih bahan pria"
                />
              </div>
              <div>
                <label className={labelCls}>Cincin Wanita</label>
                <MaterialSelect
                  value={formData.jenisCincinWanita}
                  onChange={(v) => setField("jenisCincinWanita", v)}
                  placeholder="Pilih bahan wanita"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelCls}>Gramasi Pria (gram)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gramasiPria}
                  onChange={(e) => setField("gramasiPria", e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Gramasi Wanita (gram)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gramasiWanita}
                  onChange={(e) => setField("gramasiWanita", e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
            </div>

            {/* ── Adds-On ──────────────────────────────────────────────── */}
            <SectionDivider title="Adds-On" />

            <div className="space-y-3">
              <AddsOnAccordion
                label="Laser"
                prefix="laser_"
                selected={formData.jenisCincinFeatures}
                onChange={(arr) => setField("jenisCincinFeatures", arr)}
                items={[
                  { key: "laser_batik", label: "Batik" },
                  { key: "laser_motif", label: "Motif" },
                  { key: "laser_sidik_jari", label: "Sidik Jari" },
                  { key: "laser_simbol", label: "Simbol" },
                  { key: "laser_nama", label: "Laser Nama" },
                ]}
              />
              <AddsOnAccordion
                label="Micro Setting"
                prefix="micro_setting_"
                selected={formData.jenisCincinFeatures}
                onChange={(arr) => setField("jenisCincinFeatures", arr)}
                items={[
                  {
                    key: "micro_setting_micro_finishing_biasa",
                    label: "Micro Finishing Biasa",
                  },
                  {
                    key: "micro_setting_black_finishing",
                    label: "Black Finishing",
                  },
                ]}
              />
              <AddsOnAccordion
                label="Permata"
                prefix="permata_"
                selected={formData.jenisCincinFeatures}
                onChange={(arr) => setField("jenisCincinFeatures", arr)}
                items={[
                  { key: "permata_berlian_gia", label: "Berlian GIA" },
                  { key: "permata_rubby", label: "Rubby" },
                  { key: "permata_berlian_natural", label: "Berlian Natural" },
                  { key: "permata_blue_shapire", label: "Blue Shapire" },
                  {
                    key: "permata_berlian_labground_diamond",
                    label: "Berlian Labground Diamond",
                  },
                  { key: "permata_moisanet", label: "Moisanet" },
                ]}
              />
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.jenisCincinFeatures.includes("3d_design")}
                  onChange={(e) => {
                    const arr = e.target.checked
                      ? [...formData.jenisCincinFeatures, "3d_design"]
                      : formData.jenisCincinFeatures.filter(
                          (f) => f !== "3d_design",
                        );
                    setField("jenisCincinFeatures", arr);
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: GOLD }}
                />
                <span className="text-sm font-semibold text-zinc-700">
                  3D Design
                </span>
              </label>
            </div>

            {/* ── Detail ───────────────────────────────────────── */}
            <SectionDivider title="Detail" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {(
                [
                  {
                    label: "Model/Bentuk",
                    fields: ["modelBentukPria", "modelBentukWanita"] as const,
                  },
                  {
                    label: "Microsetting",
                    fields: ["microsettingPria", "microsettingWanita"] as const,
                  },
                  {
                    label: "Laser",
                    fields: ["detailLaserPria", "detailLaserWanita"] as const,
                  },
                  {
                    label: "Finishing",
                    fields: [
                      "detailFinishingPria",
                      "detailFinishingWanita",
                    ] as const,
                  },
                ] as const
              ).map((cfg) => (
                <div key={cfg.label} className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-700 mb-2">
                    {cfg.label}
                  </p>
                  <div className="space-y-2">
                    {["Pria", "Wanita"].map((gender, gi) => {
                      const field = cfg.fields[gi];
                      const arr = formData[field] as string[];
                      return (
                        <div key={gender}>
                          <p className="text-xs text-zinc-500 mb-1">{gender}</p>
                          {arr.map((val, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 mb-1"
                            >
                              <input
                                type="text"
                                value={val}
                                onChange={(e) =>
                                  setDetailRow(field, i, e.target.value)
                                }
                                className={inputCls}
                              />
                              {arr.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeDetailRow(field, i)}
                                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    className="w-4 h-4"
                                  >
                                    <path d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addDetailRow(field)}
                            className="flex items-center gap-1 text-xs font-medium mt-0.5 transition-colors"
                            style={{ color: GOLD }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              className="w-3.5 h-3.5"
                            >
                              <path d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Pengiriman & Box ─────────────────────────────────────── */}
            <SectionDivider title="Pengiriman & Kemasan" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Pengiriman</label>
                <select
                  value={formData.pengiriman}
                  onChange={(e) => setField("pengiriman", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih pengiriman</option>
                  <option value="Alamat Customer">Alamat Customer</option>
                  <option value="Store Yogyakarta">Store Yogyakarta</option>
                  <option value="Store Solo">Store Solo</option>
                  <option value="Store Semarang">Store Semarang</option>
                  <option value="Store Surabaya">Store Surabaya</option>
                  <option value="Store Bandung">Store Bandung</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Kemasan</label>
                <select
                  value={formData.box}
                  onChange={(e) => setField("box", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih kemasan</option>
                  <option value="Standart">Standart</option>
                  <option value="Premium">Premium</option>
                  <option value="Exclusive">Exclusive</option>
                </select>
              </div>
            </div>

            {/* ── Pembayaran ────────────────────────────────────────────── */}
            <SectionDivider title="Pembayaran" />

            <div>
              <label className={labelCls}>Metode Pembayaran</label>
              <select
                value={formData.transferKeBank}
                onChange={(e) => setField("transferKeBank", e.target.value)}
                className={inputCls}
              >
                <option value="">Pilih metode</option>
                <option value="Pembayaran Ke PT">Pembayaran Ke PT</option>
                <option value="Pembayaran non PT">Pembayaran non PT</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* ── Submit ───────────────────────────────────────────────── */}
            <div className="pt-8">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 font-bold text-base rounded-xl shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-zinc-950"
                style={{
                  backgroundImage: isSubmitting
                    ? "none"
                    : `linear-gradient(135deg, ${GOLD}, #E8C46A, ${GOLD})`,
                  backgroundColor: isSubmitting ? GOLD : "transparent",
                  backgroundSize: "200% 200%",
                  boxShadow: `0 4px 20px rgba(200,169,81,0.35)`,
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>Kirim Formulir</>
                )}
              </button>
              <p className="text-center text-xs text-zinc-400 mt-3">
                Dengan mengirim formulir ini, Anda menyetujui ketentuan order
                PT. Kotagede Jewellery.
              </p>
            </div>

            <div className="text-center text-sm text-zinc-400 pt-2 pb-2">
              Terimakasih
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-5">
          © PT. Kotagede Jewellery · Powered by KGJ ERP
        </p>
      </div>
    </div>
  );
}
