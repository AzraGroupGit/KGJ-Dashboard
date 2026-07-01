"use client";

import { useState, useEffect, startTransition } from "react";
import {
  KATEGORI_THRESHOLDS,
  addWorkingDays,
} from "@/lib/working-days";
import { checkSlotAvailability, checkAllSlots, type SlotCheckResult } from "@/lib/slot-check";
import { formatRupiah, SUB_SOURCES, paymentCategory, BANKS } from "./shared";
import AddressAutocomplete from "@/components/order/AddressAutocomplete";
import FontPicker from "@/components/order/FontPicker";
import MaterialSelect from "@/components/order/MaterialSelect";
import EngravingSelect from "@/components/order/EngravingSelect";
import AddsOnAccordion from "@/components/order/AddsOnAccordion";
import { Plus, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { OrderFormData } from "@/lib/schemas/cs-order";

// ── OrderFormFields ────────────────────────────────────────────────────────

interface FormFieldsProps {
  data: OrderFormData;
  disabled: boolean;
  orderNumber: string;
  onChangeField: <K extends keyof OrderFormData>(
    key: K,
    value: OrderFormData[K],
  ) => void;
  workingDays: number | null;
  onChangeHarga: (raw: string) => void;
}
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-bold tracking-widest text-gray-500 uppercase whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function FieldRow({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 items-start">
      <label className="text-sm font-medium text-gray-600 pt-2 col-span-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

const inputCls = (disabled: boolean) =>
  `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${disabled ? "bg-gray-50 text-gray-600" : "bg-white"}`;

export function OrderFormFields({
  data,
  disabled,
  orderNumber,
  onChangeField,
  workingDays,
  onChangeHarga,
}: FormFieldsProps) {
  const [hargaDisplay, setHargaDisplay] = useState<string>(() => formatRupiah(data.harga));

  const [slotInfo, setSlotInfo] = useState<SlotCheckResult | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [fullSlots, setFullSlots] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(1);

  const STEPS = [
    { num: 1, label: "Info Order" },
    { num: 2, label: "Data & Cincin" },
    { num: 3, label: "Finalisasi" },
  ];

  useEffect(() => {
    if (data.kategori && data.tglOrder) {
      const threshold = KATEGORI_THRESHOLDS.find(
        (k) => k.value === data.kategori,
      );
      if (threshold) {
        const suggestedDeadline = addWorkingDays(
          data.tglOrder,
          threshold.minDays,
        );
        if (!data.deadline && suggestedDeadline) {
          onChangeField("deadline", suggestedDeadline);
        }
      }
    }
  }, [data.kategori, data.tglOrder, data.deadline, onChangeField]);

  useEffect(() => {
    if (data.kategori && data.tglOrder) {
      startTransition(() => {
        setSlotLoading(true);
      });
      checkSlotAvailability(data.kategori, data.tglOrder).then((result) => {
        setSlotInfo(result);
        setSlotLoading(false);
      });
    } else {
      startTransition(() => {
        setSlotInfo(null);
      });
    }
  }, [data.kategori, data.tglOrder]);

  useEffect(() => {
    if (data.tglOrder) {
      checkAllSlots(data.tglOrder).then(setFullSlots);
    } else {
      setFullSlots({});
    }
  }, [data.tglOrder]);

  const _detailField = (prefix: string, gender: "Pria" | "Wanita") =>
    `${prefix}${gender}` as keyof OrderFormData;

  const addDetailRow = (field: keyof OrderFormData) => {
    const arr = [...(data[field] as string[])];
    arr.push("");
    onChangeField(field, arr as string[]);
  };
  const removeDetailRow = (field: keyof OrderFormData, i: number) => {
    const arr = (data[field] as string[]).filter((_, idx) => idx !== i);
    onChangeField(field, (arr.length ? arr : [""]) as string[]);
  };

  const handleHargaInput = (val: string) => {
    const raw = val.replace(/[^\d]/g, "");
    setHargaDisplay(raw ? formatRupiah(raw) : "");
    onChangeHarga(raw);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          No. Order
        </p>
        <p className="font-mono font-bold text-indigo-700 text-lg">
          {orderNumber || "—"}
        </p>
        <p className="font-bold text-gray-800 mt-1">FORMULIR ORDER CINCIN</p>
        <p className="text-sm text-gray-600">PT. KOTAGEDE JEWELLERY</p>
      </div>

      {/* Step indicator (edit mode only) */}
      {!disabled && (
        <div className="flex items-center justify-center gap-2 mb-2 mt-1">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  step === s.num
                    ? "bg-indigo-600 text-white shadow-sm"
                    : step > s.num
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.num ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-3 h-3 flex items-center justify-center text-[10px] font-bold">
                    {s.num}
                  </span>
                )}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px ${step > i + 1 ? "bg-indigo-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {(disabled || step === 1) && (
        <>
      <SectionHeader title="Informasi Order" />

      <div className="space-y-3">
        <FieldRow label="Tgl Chat">
          <input
            type="date"
            value={data.tglChat}
            onChange={(e) => onChangeField("tglChat", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Tgl Order">
          <input
            type="date"
            value={data.tglOrder}
            onChange={(e) => onChangeField("tglOrder", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Tgl Acara">
          <input
            type="date"
            value={data.tglAcara}
            onChange={(e) => onChangeField("tglAcara", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Deadline">
          <input
            type="date"
            value={data.deadline}
            onChange={(e) => onChangeField("deadline", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kategori">
          <select
            value={data.kategori}
            onChange={(e) => onChangeField("kategori", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih kategori</option>
            {KATEGORI_THRESHOLDS.map((k) => {
                const isFull = fullSlots[k.value];
                const tooFewDays = workingDays !== null && workingDays < k.minDays;
                const slotDisabled = isFull;
                return (
              <option
                key={k.value}
                value={k.value}
                disabled={tooFewDays || slotDisabled}
              >
                {k.label}
                {tooFewDays
                  ? ` (butuh ${k.minDays} hari)`
                  : isFull
                  ? " (slot penuh)"
                  : ""}
              </option>
                );
              })}
          </select>
          {workingDays !== null && (
            <p
              className={`text-xs mt-1 ${workingDays < 3 ? "text-red-500 font-medium" : "text-gray-400"}`}
            >
              {workingDays < 3
                ? `Hanya ${workingDays} hari kerja tersedia — tidak cukup untuk paket manapun`
                : `${workingDays} hari kerja tersedia`}
            </p>
          )}
          {slotLoading && (
            <p className="text-xs text-gray-400 mt-1">Memeriksa slot...</p>
          )}
          {slotInfo && slotInfo.is_full && (
            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              <span>⚠</span>
              <span>
                Slot {slotInfo.label} untuk{" "}
                {new Date(slotInfo.tgl_order).toLocaleDateString("id-ID")} penuh
                ({slotInfo.used}/{slotInfo.total_slots} terpakai)
              </span>
            </p>
          )}
          {slotInfo && !slotInfo.is_full && slotInfo.total_slots > 0 && (
            <p className="text-xs text-emerald-600 mt-1">
              Slot tersedia: {slotInfo.available} dari {slotInfo.total_slots}
            </p>
          )}
        </FieldRow>
        <FieldRow label="Kebutuhan Acara">
          <select
            value={data.acara}
            onChange={(e) => onChangeField("acara", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih acara</option>
            {[
              "Daily",
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
        </FieldRow>
        <FieldRow label="Order Via">
          <select
            value={data.orderVia}
            onChange={(e) => onChangeField("orderVia", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih cara order</option>
            <option value="Offline">Offline</option>
            <option value="Online+Offline">Online + Offline</option>
            <option value="Online">Online</option>
            <option value="Marketplace">Marketplace</option>
          </select>
        </FieldRow>

        {/* Sumber block */}
        <div className="col-span-3 mt-2">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
              Dari mana Anda mengetahui tentang Kotagede Jewelry?
            </p>

            <FieldRow label="Sumber informasi">
              <select
                value={data.sumberMedia}
                onChange={(e) => {
                  onChangeField("sumberMedia", e.target.value);
                  onChangeField("sumber", "");
                }}
                className={inputCls(disabled)}
                disabled={disabled}
              >
                <option value="">Pilih sumber</option>
                <option value="Instagram">Instagram</option>
                <option value="Google">Google</option>
                <option value="TikTok">TikTok</option>
                <option value="Marketplace">Marketplace</option>
                <option value="Recommendation">Recommendation</option>
                <option value="OTS">On The Spot (OTS)</option>
              </select>
            </FieldRow>

            {data.sumberMedia && (
              <FieldRow label={data.sumberMedia === "TikTok" ? "" : "Detail"}>
                {data.sumberMedia === "TikTok" ? (
                  <p className="text-sm text-gray-500 py-2">TikTok</p>
                ) : (
                  (() => {
                    const REC_OPTS = ["friends", "family", "others"];
                    const isRecCustom =
                      data.sumberMedia === "Recommendation" &&
                      data.sumber &&
                      !REC_OPTS.includes(data.sumber);
                    return (
                      <>
                        <select
                          value={isRecCustom ? "others" : data.sumber}
                          onChange={(e) =>
                            onChangeField("sumber", e.target.value)
                          }
                          className={inputCls(disabled)}
                          disabled={disabled}
                        >
                          <option value="">Pilih detail</option>
                          {(
                            SUB_SOURCES[data.sumberMedia.toLowerCase()] || []
                          ).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {data.sumberMedia === "Recommendation" &&
                          (data.sumber === "others" || isRecCustom) && (
                            <input
                              type="text"
                              value={isRecCustom ? data.sumber : ""}
                              onChange={(e) =>
                                onChangeField("sumber", e.target.value)
                              }
                              placeholder="Tulis siapa yang merekomendasikan..."
                              className={`${inputCls(disabled)} mt-2`}
                              disabled={disabled}
                            />
                          )}
                      </>
                    );
                  })()
                )}
              </FieldRow>
            )}

            <FieldRow label="Dari Artis/Selebgram?">
              <div className="flex gap-4 pt-1">
                {["Iya", "Tidak"].map((v) => (
                  <label
                    key={v}
                    className={`flex items-center gap-2 ${disabled ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name="dariArtis"
                      value={v}
                      checked={data.dariArtis === v}
                      onChange={() => {
                        if (disabled) return;
                        onChangeField("dariArtis", v);
                        if (v !== "Iya") onChangeField("dariArtisDetail", "");
                      }}
                      disabled={disabled}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
              {data.dariArtis === "Iya" && (
                <input
                  type="text"
                  value={data.dariArtisDetail}
                  onChange={(e) =>
                    onChangeField("dariArtisDetail", e.target.value)
                  }
                  placeholder="Tulis nama artis / selebgram..."
                  className={`${inputCls(disabled)} mt-2`}
                  disabled={disabled}
                />
              )}
            </FieldRow>
          </div>
        </div>
      </div>

      <SectionHeader title="Harga" />

      <div className="space-y-3">
        <FieldRow label="Harga (±)">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm pointer-events-none">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={hargaDisplay}
              onChange={(e) => handleHargaInput(e.target.value)}
              placeholder="0"
              className={`${inputCls(disabled)} pl-9`}
              disabled={disabled}
            />
          </div>
          {hargaDisplay && (
            <p className="text-xs text-gray-400 mt-1">Rp {hargaDisplay}</p>
          )}
        </FieldRow>
        <FieldRow label="DP">
          <div className="flex gap-3 mb-2">
            {["33", "50", "80"].map((pct) => (
              <label
                key={pct}
                className={`flex items-center gap-1.5 ${disabled ? "cursor-default" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="dpPercent"
                  value={pct}
                  checked={data.dpPercent === pct}
                  onChange={() => {
                    if (disabled) return;
                    onChangeField("dpPercent", pct);
                    const h = parseInt(data.harga, 10);
                    const p = parseInt(pct, 10);
                    onChangeField(
                      "dp",
                      h && p ? Math.round((h * p) / 100).toString() : "",
                    );
                  }}
                  disabled={disabled}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700">{pct}%</span>
              </label>
            ))}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm pointer-events-none">
              Rp
            </span>
            <input
              type="text"
              value={data.dp ? formatRupiah(data.dp) : ""}
              readOnly
              className={`${inputCls(true)} pl-9 text-gray-500`}
            />
          </div>
        </FieldRow>
      </div>

          {!disabled && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
              >
                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {(disabled || step === 2) && (
        <>
      <SectionHeader title="Data Pelanggan" />

      <div className="space-y-3">
        <FieldRow label="Nama Lengkap" required>
          <input
            type="text"
            value={data.namaLengkap}
            onChange={(e) => onChangeField("namaLengkap", e.target.value)}
            placeholder="Nama lengkap sesuai KTP"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <div className="col-span-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
          <label className="block text-sm font-semibold text-indigo-800">
            Cari Alamat Otomatis
          </label>
          <p className="text-xs text-indigo-600">
            Ketik nama jalan atau area, lalu pilih dari daftar — kolom alamat di
            bawah terisi otomatis.
          </p>
          <AddressAutocomplete
            accentColor="#4f46e5"
            onSelect={(parsed) => {
              onChangeField("alamatPengiriman", parsed.alamatPengiriman);
              onChangeField("kelurahan", parsed.kelurahan);
              onChangeField("kecamatan", parsed.kecamatan);
              onChangeField("kabupatenKota", parsed.kabupatenKota);
              onChangeField("provinsi", parsed.provinsi);
              onChangeField("kodepos", parsed.kodepos);
            }}
          />
        </div>
        <FieldRow label="Alamat Pengiriman">
          <textarea
            value={data.alamatPengiriman}
            onChange={(e) => onChangeField("alamatPengiriman", e.target.value)}
            rows={2}
            placeholder="Nama jalan, nomor rumah, RT/RW"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kelurahan">
          <input
            type="text"
            value={data.kelurahan}
            onChange={(e) => onChangeField("kelurahan", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kecamatan">
          <input
            type="text"
            value={data.kecamatan}
            onChange={(e) => onChangeField("kecamatan", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kabupaten/Kota">
          <input
            type="text"
            value={data.kabupatenKota}
            onChange={(e) => onChangeField("kabupatenKota", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Provinsi">
          <input
            type="text"
            value={data.provinsi}
            onChange={(e) => onChangeField("provinsi", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kode Pos">
          <input
            type="text"
            value={data.kodepos}
            onChange={(e) => onChangeField("kodepos", e.target.value)}
            placeholder="12345"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="No. WhatsApp" required>
          <input
            type="tel"
            value={data.noWA}
            onChange={(e) => onChangeField("noWA", e.target.value)}
            placeholder="08xxxxxxxxxx"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Email">
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChangeField("email", e.target.value)}
            placeholder="email@contoh.com"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Akun Instagram">
          <input
            type="text"
            value={data.instagram}
            onChange={(e) => onChangeField("instagram", e.target.value)}
            placeholder="@username_pelanggan"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
      </div>

      <SectionHeader title="Ukuran Cincin" />

      <div className="space-y-3">
        <FieldRow label="Alat Ukur">
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="alatUkur"
                value="Dari Store"
                checked={data.alatUkur === "Dari Store"}
                onChange={() => onChangeField("alatUkur", "Dari Store")}
                disabled={disabled}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-sm text-gray-700">Dari Store</span>
            </label>
            {data.alatUkur === "Dari Store" && (
              <p className="text-xs text-emerald-600 ml-6">
                ✓ Tercover garansi re-size 2 Angka
              </p>
            )}
            <label
              className={`flex items-center gap-2 ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="alatUkur"
                value="Luar Store"
                checked={data.alatUkur === "Luar Store"}
                onChange={() => onChangeField("alatUkur", "Luar Store")}
                disabled={disabled}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-sm text-gray-700">Luar Store</span>
            </label>
            {data.alatUkur === "Luar Store" && (
              <p className="text-xs text-rose-500 ml-6">
                ✗ Tidak tercover garansi re-size
              </p>
            )}
          </div>
        </FieldRow>
        <FieldRow label="Ukuran Pria">
          <input
            type="text"
            value={data.ukuranPria}
            onChange={(e) => onChangeField("ukuranPria", e.target.value)}
            placeholder="Contoh: 18 / L / 57mm"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Ukuran Wanita">
          <input
            type="text"
            value={data.ukuranWanita}
            onChange={(e) => onChangeField("ukuranWanita", e.target.value)}
            placeholder="Contoh: 15 / M / 52mm"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
      </div>

      <SectionHeader title="Ukiran Nama" />

      <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Maks. 15 karakter termasuk simbol dan spasi
      </p>

      <div className="space-y-3 mt-3">
        <FieldRow label="Cincin Pria">
          <input
            type="text"
            value={data.ukiranPria}
            onChange={(e) =>
              onChangeField("ukiranPria", e.target.value.slice(0, 15))
            }
            placeholder="Maks 15 karakter"
            className={inputCls(disabled)}
            disabled={disabled}
            maxLength={15}
          />
          <p className="text-xs text-gray-400 mt-1">
            {data.ukiranPria.length}/15 karakter
          </p>
        </FieldRow>
        <FieldRow label="Cincin Wanita">
          <input
            type="text"
            value={data.ukiranWanita}
            onChange={(e) =>
              onChangeField("ukiranWanita", e.target.value.slice(0, 15))
            }
            placeholder="Maks 15 karakter"
            className={inputCls(disabled)}
            disabled={disabled}
            maxLength={15}
          />
          <p className="text-xs text-gray-400 mt-1">
            {data.ukiranWanita.length}/15 karakter
          </p>
        </FieldRow>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Ukiran Cincin Pria
            </label>
            <EngravingSelect
              value={data.ukiranCincinPria}
              onChange={(v) => onChangeField("ukiranCincinPria", v)}
              disabled={disabled}
              placeholder="Pilih jenis ukiran"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Ukiran Cincin Wanita
            </label>
            <EngravingSelect
              value={data.ukiranCincinWanita}
              onChange={(v) => onChangeField("ukiranCincinWanita", v)}
              disabled={disabled}
              placeholder="Pilih jenis ukiran"
            />
          </div>
        </div>
        <FieldRow label="Font">
          <FontPicker
            value={data.font}
            onChange={(v) => onChangeField("font", v)}
          />
        </FieldRow>
        <FieldRow label="Posisi Laser">
          <select
            value={data.laserPosition}
            onChange={(e) => onChangeField("laserPosition", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih posisi</option>
            <option value="dalam">Di dalam cincin</option>
            <option value="luar">Di luar cincin</option>
            <option value="dalam_luar">Dalam & luar</option>
          </select>
        </FieldRow>
      </div>

      <SectionHeader title="Jenis Cincin" />

      <div className="space-y-3">
        <FieldRow label="Jenis Cincin Pria">
          <MaterialSelect
            value={data.jenisCincinPria}
            onChange={(v) => onChangeField("jenisCincinPria", v)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Jenis Cincin Wanita">
          <MaterialSelect
            value={data.jenisCincinWanita}
            onChange={(v) => onChangeField("jenisCincinWanita", v)}
            disabled={disabled}
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Gramasi Pria (gram)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.gramasiPria}
            onChange={(e) => onChangeField("gramasiPria", e.target.value)}
            placeholder="0.00"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Gramasi Wanita (gram)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.gramasiWanita}
            onChange={(e) => onChangeField("gramasiWanita", e.target.value)}
            placeholder="0.00"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </div>
      </div>

      <SectionHeader title="Adds-On" />

      <div className="space-y-3">
        <AddsOnAccordion
          label="Laser"
          prefix="laser_"
          selected={data.jenisCincinFeatures}
          onChange={(arr) => onChangeField("jenisCincinFeatures", arr)}
          disabled={disabled}
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
          selected={data.jenisCincinFeatures}
          onChange={(arr) => onChangeField("jenisCincinFeatures", arr)}
          disabled={disabled}
          items={[
            {
              key: "micro_setting_micro_finishing_biasa",
              label: "Micro Finishing Biasa",
            },
            { key: "micro_setting_black_finishing", label: "Black Finishing" },
          ]}
        />
        <AddsOnAccordion
          label="Permata"
          prefix="permata_"
          selected={data.jenisCincinFeatures}
          onChange={(arr) => onChangeField("jenisCincinFeatures", arr)}
          disabled={disabled}
          items={[
            { key: "permata_berlian_gia", label: "Berlian GIA" },
            { key: "permata_berlian_natural", label: "Berlian Natural" },
            {
              key: "permata_berlian_labground_diamond",
              label: "Berlian Labground Diamond",
            },
            { key: "permata_blue_shapire", label: "Blue Shapire" },
            { key: "permata_rubby", label: "Rubby" },
            { key: "permata_moisanet", label: "Moisanet" },
          ]}
        />
        <label
          className={`flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg transition-colors ${disabled ? "cursor-default" : "cursor-pointer hover:bg-slate-50"}`}
        >
          <input
            type="checkbox"
            checked={data.jenisCincinFeatures.includes("3d_design")}
            onChange={() => {
              if (disabled) return;
              const arr = data.jenisCincinFeatures.includes("3d_design")
                ? data.jenisCincinFeatures.filter(
                    (f: string) => f !== "3d_design",
                  )
                : [...data.jenisCincinFeatures, "3d_design"];
              onChangeField("jenisCincinFeatures", arr);
            }}
            disabled={disabled}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="text-sm font-semibold text-gray-700">3D Design</span>
        </label>
      </div>

          {!disabled && (
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
              >
                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {(disabled || step === 3) && (
        <>
      <SectionHeader title="Detail" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          {
            label: "Model/Bentuk",
            fieldPria: "modelBentukPria" as const,
            fieldWanita: "modelBentukWanita" as const,
          },
          {
            label: "Microsetting",
            fieldPria: "microsettingPria" as const,
            fieldWanita: "microsettingWanita" as const,
          },
          {
            label: "Laser",
            fieldPria: "detailLaserPria" as const,
            fieldWanita: "detailLaserWanita" as const,
          },
          {
            label: "Finishing",
            fieldPria: "detailFinishingPria" as const,
            fieldWanita: "detailFinishingWanita" as const,
          },
        ].map((cfg) => (
          <div key={cfg.label} className="space-y-1">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              {cfg.label}
            </p>
            <div className="space-y-2">
              {[
                { gender: "Pria", field: cfg.fieldPria },
                { gender: "Wanita", field: cfg.fieldWanita },
              ].map(({ gender, field }) => {
                const arr = data[field] as string[];
                return (
                  <div key={gender}>
                    <p className="text-xs text-gray-500 mb-1">{gender}</p>
                    {arr.map((val: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => {
                            const copy = [...arr];
                            copy[i] = e.target.value;
                            onChangeField(field, copy);
                          }}
                          className={inputCls(disabled)}
                          disabled={disabled}
                        />
                        {arr.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDetailRow(field, i)}
                            disabled={disabled}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addDetailRow(field)}
                      disabled={disabled}
                      className="flex items-center gap-1 text-xs font-medium mt-0.5 text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <SectionHeader title="Pengiriman & Kemasan" />

      <div className="space-y-3">
        <FieldRow label="Pengiriman">
          <select
            value={data.pengiriman}
            onChange={(e) => onChangeField("pengiriman", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih pengiriman</option>
            <option value="Alamat Customer">Alamat Customer</option>
            <option value="Store Yogyakarta">Store Yogyakarta</option>
            <option value="Store Solo">Store Solo</option>
            <option value="Store Semarang">Store Semarang</option>
            <option value="Store Surabaya">Store Surabaya</option>
            <option value="Store Bandung">Store Bandung</option>
          </select>
        </FieldRow>
        <FieldRow label="Kemasan">
          <select
            value={data.box}
            onChange={(e) => onChangeField("box", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih kemasan</option>
            <option value="Standart">Standart</option>
            <option value="Premium">Premium</option>
            <option value="Exclusive">Exclusive</option>
          </select>
        </FieldRow>
      </div>

      <SectionHeader title="Pembayaran" />

      <div className="space-y-3">
        {(paymentCategory(data.transferKeBank) === "ke_pt" ||
          paymentCategory(data.transferKeBank) === "non_pt_cash") && (
          <FieldRow label="Tipe Pembayaran">
            <select
              value={paymentCategory(data.transferKeBank)}
              onChange={(e) =>
                onChangeField(
                  "transferKeBank",
                  e.target.value === "ke_pt"
                    ? "Ke PT"
                    : e.target.value === "non_pt_cash"
                      ? "Non PT / Cash"
                      : "",
                )
              }
              className={inputCls(disabled)}
              disabled={disabled}
            >
              <option value="ke_pt">Ke PT</option>
              <option value="non_pt_cash">Non PT / Cash</option>
            </select>
          </FieldRow>
        )}
        {paymentCategory(data.transferKeBank) === "ke_pt" && (
          <FieldRow label="Pilih Bank">
            <select
              value={
                (BANKS as readonly string[]).includes(data.transferKeBank)
                  ? data.transferKeBank
                  : ""
              }
              onChange={(e) =>
                onChangeField("transferKeBank", e.target.value)
              }
              className={inputCls(disabled)}
              disabled={disabled}
            >
              <option value="">Pilih bank</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </FieldRow>
        )}
        {paymentCategory(data.transferKeBank) === "non_pt_cash" && (
          <FieldRow label="Metode Pembayaran">
            <select
              value={
                data.transferKeBank === "Non PT" ||
                data.transferKeBank === "Cash"
                  ? data.transferKeBank
                  : ""
              }
              onChange={(e) =>
                onChangeField("transferKeBank", e.target.value)
              }
              className={inputCls(disabled)}
              disabled={disabled}
            >
              <option value="">Pilih metode</option>
              <option value="Non PT">Non PT</option>
              <option value="Cash">Cash</option>
            </select>
          </FieldRow>
        )}
        {!paymentCategory(data.transferKeBank) && (
          <FieldRow label="Metode Pembayaran">
            <select
              value={data.transferKeBank}
              onChange={(e) =>
                onChangeField("transferKeBank", e.target.value)
              }
              className={inputCls(disabled)}
              disabled={disabled}
            >
              <option value="">Pilih metode</option>
              <option value="Pembayaran Ke PT">Pembayaran Ke PT</option>
              <option value="Pembayaran non PT">Pembayaran non PT</option>
              <option value="Cash">Cash</option>
            </select>
          </FieldRow>
        )}
      </div>

      <SectionHeader title="Keterangan Tambahan" />

      <div className="space-y-3">
        <FieldRow label="Keterangan Tambahan (internal CS)">
          <textarea
            value={data.keteranganTambahan}
            onChange={(e) =>
              onChangeField("keteranganTambahan", e.target.value)
            }
            className={inputCls(disabled)}
            disabled={disabled}
            rows={3}
            placeholder="Contoh: DIKIRIM PROSES CEPAT / TANPA HARGA / GIFT RELASI PAK JOKO"
          />
        </FieldRow>
      </div>

          {!disabled && (
            <div className="flex justify-between pt-2">
              <span />
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
