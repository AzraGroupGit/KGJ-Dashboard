// app/order-form/[token]/page.tsx
// Public page — no auth required. Customer fills this out from the link CS sends.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

interface OrderFormData {
  tglChat: string;
  tglOrder: string;
  tglAcara: string;
  acara: string;
  kebutuhanAcara: string;
  deadline: string;
  orderVia: string;
  orderViaChannel: string;
  sumber: string;
  sumberMedia: string;
  dariArtis: string;
  kgjInstagramAccount: string;
  kgjInstagramAccountCustom: string;
  harga: string;
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
  font: string;
  laserPosition: string;
  jenisCincinPria: string;
  jenisCincinWanita: string;
  keteranganPria: string[];
  keteranganWanita: string[];
  pengiriman: string;
  box: string;
}

interface OrderInfo {
  order_number: string;
  customer_name: string;
  form_status: string;
  tgl_acara: string | null;
  deadline: string | null;
  acara: string | null;
  kebutuhan_acara: string | null;
  order_via: string | null;
  order_via_channel: string | null;
  sumber_media: string | null;
  sumber_detail: string | null;
  kgj_instagram_account: string | null;
  kgj_instagram_account_custom: string | null;
  dari_artis: boolean | null;
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
  keterangan_pria: string[];
  ukuran_wanita: string | null;
  ukiran_wanita: string | null;
  jenis_cincin_wanita: string | null;
  keterangan_wanita: string[];
  font: string | null;
  laser_position: string | null;
  pengiriman: string | null;
  box: string | null;
}

type PageState = "loading" | "not_found" | "ready" | "submitted" | "error";

const emptyFormData = (): OrderFormData => ({
  tglChat: "",
  tglOrder: "",
  tglAcara: "",
  acara: "",
  kebutuhanAcara: "",
  deadline: "",
  orderVia: "",
  orderViaChannel: "",
  sumber: "",
  sumberMedia: "",
  dariArtis: "",
  kgjInstagramAccount: "",
  kgjInstagramAccountCustom: "",
  harga: "",
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
  font: "",
  laserPosition: "",
  jenisCincinPria: "",
  jenisCincinWanita: "",
  keteranganPria: ["", "", ""],
  keteranganWanita: ["", "", ""],
  pengiriman: "",
  box: "",
});

function formatRupiah(raw: string): string {
  const n = raw.replace(/[^\d]/g, "");
  if (!n) return "";
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseRupiah(display: string): string {
  return display.replace(/\./g, "");
}

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

// ── LocationIQ address autocomplete ───────────────────────────────────────

interface LocationIQSuggestion {
  place_id: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    quarter?: string;
    suburb?: string;
    village?: string;
    hamlet?: string;
    city_district?: string;
    district?: string;
    city?: string;
    town?: string;
    county?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
  };
}

interface ParsedAddress {
  alamatPengiriman: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodepos: string;
}

function parseLocationIQ(s: LocationIQSuggestion): ParsedAddress {
  const a = s.address;
  const road = a.road || a.pedestrian || "";
  const alamatPengiriman = [a.house_number, road].filter(Boolean).join(" ");
  return {
    alamatPengiriman,
    kelurahan:
      a.neighbourhood || a.quarter || a.suburb || a.village || a.hamlet || "",
    kecamatan: a.city_district || a.district || "",
    kabupatenKota: a.city || a.town || a.county || a.municipality || "",
    provinsi: a.state || "",
    kodepos: a.postcode || "",
  };
}

const LOCATIONIQ_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;

function AddressAutocomplete({
  onSelect,
}: {
  onSelect: (parsed: ParsedAddress, displayName: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationIQSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 4) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setIsLoading(true);
      try {
        const url = `https://us1.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&countrycodes=id&addressdetails=1&limit=7&dedupe=1&format=json`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error("LocationIQ error");
        const data: LocationIQSuggestion[] = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (s: LocationIQSuggestion) => {
      const parsed = parseLocationIQ(s);
      setSelected(s.display_name);
      setQuery("");
      setSuggestions([]);
      setIsOpen(false);
      onSelect(parsed, s.display_name);
    },
    [onSelect],
  );

  const handleClear = () => {
    setSelected("");
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-300 rounded-xl p-3">
          <svg
            className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
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
          <p className="text-sm text-emerald-800 flex-1 leading-snug">
            {selected}
          </p>
          <button
            onClick={handleClear}
            className="text-emerald-500 hover:text-emerald-700 flex-shrink-0 ml-1"
            title="Cari ulang"
          >
            <svg
              className="w-4 h-4"
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
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {isLoading ? (
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: `${GOLD} transparent transparent transparent`,
                }}
              />
            ) : (
              <svg
                className="w-4 h-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama jalan, area, atau kota..."
            className="w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm text-gray-800 bg-white placeholder-zinc-400 outline-none transition-colors"
            style={{ borderColor: `${GOLD}60` }}
            onFocus={(e) => {
              e.target.style.borderColor = GOLD;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = `${GOLD}60`;
            }}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600"
            >
              <svg
                className="w-4 h-4"
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
            </button>
          )}
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: GOLD }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm text-zinc-700 leading-snug">
                  {s.display_name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen &&
        suggestions.length === 0 &&
        !isLoading &&
        query.length >= 4 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-xl px-4 py-3 text-sm text-zinc-500">
            Alamat tidak ditemukan. Coba kata kunci yang lebih spesifik.
          </div>
        )}
    </div>
  );
}

// ── Watermark background ───────────────────────────────────────────────────

const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="240"><text x="260" y="120" dominant-baseline="middle" text-anchor="middle" font-family="Georgia,serif" font-size="26" letter-spacing="3" fill="rgba(150,110,30,0.10)" transform="rotate(-28 260 120)">PT Kotagede Jewellery</text></svg>`;
const watermarkUrl = `url("data:image/svg+xml,${encodeURIComponent(watermarkSvg)}")`;

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
        const { data } = await res.json();
        setOrderInfo(data);

        if (data.form_status !== "pending") {
          setPageState("submitted");
          return;
        }

        const rawHarga = String(data.harga ?? "");
        setFormData({
          ...emptyFormData(),
          tglAcara: data.tgl_acara ?? "",
          deadline: data.deadline ?? "",
          acara: data.acara ?? "",
          kebutuhanAcara: data.kebutuhan_acara ?? "",
          orderVia: data.order_via ?? "",
          orderViaChannel: data.order_via_channel
            ? data.order_via_channel.charAt(0).toUpperCase() +
              data.order_via_channel.slice(1)
            : "",
          sumberMedia: data.sumber_media
            ? data.sumber_media.charAt(0).toUpperCase() +
              data.sumber_media.slice(1)
            : "",
          sumber: data.sumber_detail ?? "",
          kgjInstagramAccount: data.kgj_instagram_account ?? "",
          kgjInstagramAccountCustom: data.kgj_instagram_account_custom ?? "",
          dariArtis:
            data.dari_artis === true
              ? "Iya"
              : data.dari_artis === false
                ? "Tidak"
                : "",
          harga: rawHarga,
          dp: rawHarga
            ? Math.round(parseInt(rawHarga, 10) * 0.8).toString()
            : String(data.dp_amount ?? ""),
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
          jenisCincinPria: data.jenis_cincin_pria ?? "",
          keteranganPria: data.keterangan_pria?.length
            ? data.keterangan_pria
            : ["", "", ""],
          ukuranWanita: data.ukuran_wanita ?? "",
          ukiranWanita: data.ukiran_wanita ?? "",
          jenisCincinWanita: data.jenis_cincin_wanita ?? "",
          keteranganWanita: data.keterangan_wanita?.length
            ? data.keterangan_wanita
            : ["", "", ""],
          font: data.font ?? "",
          laserPosition: data.laser_position ?? "",
          pengiriman: data.pengiriman ?? "",
          box: data.box ?? "",
        });
        if (rawHarga) setHargaDisplay(formatRupiah(rawHarga));
        setPageState("ready");
      } catch {
        setPageState("error");
      }
    };
    load();
  }, [token]);

  const setField = <K extends keyof OrderFormData>(
    key: K,
    val: OrderFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleHargaChange = (val: string) => {
    const raw = val.replace(/[^\d]/g, "");
    setHargaDisplay(formatRupiah(raw));
    setField("harga", raw);
    setField("dp", raw ? Math.round(parseInt(raw, 10) * 0.8).toString() : "");
  };

  const setKetPria = (i: number, val: string) => {
    const arr = [...formData.keteranganPria];
    arr[i] = val;
    setField("keteranganPria", arr);
  };

  const setKetWanita = (i: number, val: string) => {
    const arr = [...formData.keteranganWanita];
    arr[i] = val;
    setField("keteranganWanita", arr);
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
    return (
      <Shell>
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
                <label className={labelCls}>Acara</label>
                <select
                  value={formData.acara}
                  onChange={(e) => setField("acara", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih jenis acara</option>
                  {["Lamaran", "Nikah", "Anniversary", "Kado", "Lain-lain"].map(
                    (v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className={labelCls}>Kebutuhan Acara</label>
                <select
                  value={formData.kebutuhanAcara}
                  onChange={(e) => setField("kebutuhanAcara", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Pilih kebutuhan acara</option>
                  {[
                    "Pernikahan",
                    "Tunangan/Lamaran",
                    "Anniversary",
                    "Daily",
                    "Other",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Order Via</label>
                <input
                  type="text"
                  value={formData.orderVia}
                  onChange={(e) => setField("orderVia", e.target.value)}
                  placeholder="WhatsApp / Tokopedia / Instagram / dll"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Order Cincin Via</label>
                <div className="flex gap-4 mt-1">
                  {["Online", "Offline"].map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="orderViaChannel"
                        value={v}
                        checked={formData.orderViaChannel === v}
                        onChange={() => setField("orderViaChannel", v)}
                        className="w-4 h-4"
                        style={{ accentColor: GOLD }}
                      />
                      <span className="text-sm text-zinc-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sumber block */}
              <div className="space-y-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Tau Kotagede Jewellery darimana Kak?
                </p>
                <div>
                  <label className={labelCls}>
                    Tahu Kotagede Jewellery dari
                  </label>
                  <div className="flex gap-4 mt-1">
                    {["Instagram", "Other"].map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="sumberMedia"
                          value={v}
                          checked={formData.sumberMedia === v}
                          onChange={() => setField("sumberMedia", v)}
                          className="w-4 h-4"
                          style={{ accentColor: GOLD }}
                        />
                        <span className="text-sm text-zinc-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.sumberMedia === "Other" && (
                  <div>
                    <label className={labelCls}>
                      Keterangan sumber lainnya
                    </label>
                    <input
                      type="text"
                      value={formData.sumber}
                      onChange={(e) => setField("sumber", e.target.value)}
                      placeholder="Contoh: Google, Rekomendasi teman, dll"
                      className={inputCls}
                    />
                  </div>
                )}

                {formData.sumberMedia === "Instagram" && (
                  <div className="space-y-2">
                    <label className={labelCls}>
                      Akun Instagram KGJ mana yang Anda tahu / hubungi?{" "}
                      <span className="text-zinc-400 text-xs font-normal">
                        (pilih salah satu)
                      </span>
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        "@kotagede_jewellery",
                        "@kotagede_jewellery.semarang",
                        "@kotagede_jewellery.surabaya",
                        "@kotagede_jewellery.bandung",
                        "@katalog.kotagedejewellery",
                        "@ready.kotagedejewellery",
                        "@kotagedejewellery.signature",
                        "@littleringsbykotagedejewellery",
                      ].map((acc) => (
                        <label
                          key={acc}
                          className="flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <input
                            type="radio"
                            name="kgjInstagramAccount"
                            value={acc}
                            checked={formData.kgjInstagramAccount === acc}
                            onChange={() =>
                              setField("kgjInstagramAccount", acc)
                            }
                            className="w-4 h-4 flex-shrink-0"
                            style={{ accentColor: GOLD }}
                          />
                          <span className="text-sm text-zinc-700 font-mono">
                            {acc}
                          </span>
                        </label>
                      ))}
                      <label className="flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                        <input
                          type="radio"
                          name="kgjInstagramAccount"
                          value="other"
                          checked={formData.kgjInstagramAccount === "other"}
                          onChange={() =>
                            setField("kgjInstagramAccount", "other")
                          }
                          className="w-4 h-4 flex-shrink-0"
                          style={{ accentColor: GOLD }}
                        />
                        <span className="text-sm text-zinc-700">
                          Yang lainnya
                        </span>
                      </label>
                      {formData.kgjInstagramAccount === "other" && (
                        <input
                          type="text"
                          value={formData.kgjInstagramAccountCustom}
                          onChange={(e) =>
                            setField(
                              "kgjInstagramAccountCustom",
                              e.target.value,
                            )
                          }
                          placeholder="Tulis akun Instagram lainnya..."
                          className={`${inputCls} ml-7`}
                        />
                      )}
                    </div>
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
                          onChange={() => setField("dariArtis", v)}
                          className="w-4 h-4"
                          style={{ accentColor: GOLD }}
                        />
                        <span className="text-sm text-zinc-700">{v}</span>
                      </label>
                    ))}
                  </div>
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
                <label className={labelCls}>DP 80%</label>
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
                <p className="text-xs text-zinc-400 mt-0.5">
                  Otomatis 80% dari harga
                </p>
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
                <input
                  type="text"
                  value={formData.alatUkur}
                  onChange={(e) => setField("alatUkur", e.target.value)}
                  placeholder="Contoh: cincin referensi, mandrel, dll"
                  className={inputCls}
                />
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
                  <label className={labelCls}>Font</label>
                  <input
                    type="text"
                    value={formData.font}
                    onChange={(e) => setField("font", e.target.value)}
                    placeholder="Script, Block, Arial, dll"
                    className={inputCls}
                  />
                </div>
                <div>
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
            </div>

            {/* ── Jenis Cincin ─────────────────────────────────────────── */}
            <SectionDivider title="Jenis Cincin" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cincin Pria</label>
                <input
                  type="text"
                  value={formData.jenisCincinPria}
                  onChange={(e) => setField("jenisCincinPria", e.target.value)}
                  placeholder="Contoh: Polos, Berlian"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Cincin Wanita</label>
                <input
                  type="text"
                  value={formData.jenisCincinWanita}
                  onChange={(e) =>
                    setField("jenisCincinWanita", e.target.value)
                  }
                  placeholder="Contoh: Polos, Permata"
                  className={inputCls}
                />
              </div>
            </div>

            {/* ── Keterangan ───────────────────────────────────────────── */}
            <SectionDivider title="Keterangan" />

            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-zinc-700 mb-3">
                  Cincin Pria
                </p>
                <div className="space-y-2">
                  {formData.keteranganPria.map((k, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-zinc-300 text-sm font-medium w-5 flex-shrink-0">
                        —
                      </span>
                      <input
                        type="text"
                        value={k}
                        onChange={(e) => setKetPria(i, e.target.value)}
                        placeholder={`Detail ${i + 1}`}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-700 mb-3">
                  Cincin Wanita
                </p>
                <div className="space-y-2">
                  {formData.keteranganWanita.map((k, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-zinc-300 text-sm font-medium w-5 flex-shrink-0">
                        —
                      </span>
                      <input
                        type="text"
                        value={k}
                        onChange={(e) => setKetWanita(i, e.target.value)}
                        placeholder={`Detail ${i + 1}`}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Pengiriman & Box ─────────────────────────────────────── */}
            <SectionDivider title="Pengiriman & Kemasan" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Pengiriman</label>
                <input
                  type="text"
                  value={formData.pengiriman}
                  onChange={(e) => setField("pengiriman", e.target.value)}
                  placeholder="JNE, J&T, Ambil sendiri"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Box</label>
                <input
                  type="text"
                  value={formData.box}
                  onChange={(e) => setField("box", e.target.value)}
                  placeholder="Standar, Premium"
                  className={inputCls}
                />
              </div>
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
