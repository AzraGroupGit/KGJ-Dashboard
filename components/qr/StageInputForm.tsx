// components/qr/StageInputForm.tsx
"use client";

import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionType = "input" | "output" | "waste" | "return";
type MaterialType = "gold" | "silver" | "platinum" | "alloy" | "gemstone" | "other";

interface MaterialRow {
  transaction_type: TransactionType;
  material_type: MaterialType;
  karat: number | "";
  weight_grams: number | "";
  notes: string;
}

interface QualityRow   { check_key: string; passed: boolean; notes: string; }
interface ComplRow     { item_key: string;  checked: boolean; notes: string; }
interface CertRow      { certificate_type: string; certificate_number: string; issuing_body: string; is_verified: boolean; notes: string; }
interface PaymentRow   { type: string; amount: number | ""; method: string; reference_no: string; paid_at: string; notes: string; }

interface Field {
  name: string;
  label: string;
  type:
    | "text" | "number" | "select" | "textarea" | "boolean" | "file" | "date" | "time"
    | "material_array" | "quality_checklist" | "completeness_list"
    | "confirmation_form" | "packaging_form" | "certificate_array"
    | "payment_array" | "delivery_form" | "delivery_update_form"
    | "handover_form" | "attachment_list" | "object"
    | "customer_selector" | "gemstone_array";
  required: boolean;
  options?:         { value: string; label: string }[];
  placeholder?:     string;
  unit?:            string;
  min?:             number;
  max?:             number;
  transactionTypes?: TransactionType[];
  items?:           { key: string; label: string }[];
  allowedFileTypes?: string[];
}

interface StageInputFormProps {
  fields: Field[];
  permissions: { can_submit: boolean; can_edit: boolean; can_reject: boolean };
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  input:  "Input (Masuk)",
  output: "Output (Keluar)",
  waste:  "Sisa / Limbah",
  return: "Kembali",
};

const MAT_TYPE_LABELS: Record<MaterialType, string> = {
  gold:     "Emas",
  silver:   "Perak",
  platinum: "Platinum",
  alloy:    "Campuran (Alloy)",
  gemstone: "Batu Permata",
  other:    "Lainnya",
};

const ALL_TX_TYPES: TransactionType[] = ["input", "output", "waste", "return"];
const ALL_MAT_TYPES: MaterialType[]   = ["gold", "silver", "platinum", "alloy", "gemstone", "other"];

// ─── Shared styles ────────────────────────────────────────────────────────────

const iCls =
  "w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const sCls =
  iCls + " appearance-none";
const lCls =
  "mb-1 block text-[10px] uppercase tracking-wider text-stone-400";

// ─── MaterialArrayField ───────────────────────────────────────────────────────

function MaterialArrayField({ value, onChange, transactionTypes, disabled, error }: {
  value: MaterialRow[]; onChange: (r: MaterialRow[]) => void;
  transactionTypes: TransactionType[]; disabled: boolean; error?: string;
}) {
  const allowed = transactionTypes.length > 0 ? transactionTypes : ALL_TX_TYPES;
  const add = () => onChange([...value, { transaction_type: allowed[0], material_type: "gold", karat: "", weight_grams: "", notes: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const upd = (i: number, p: Partial<MaterialRow>) => onChange(value.map((r, idx) => idx === i ? { ...r, ...p } : r));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 py-4 text-center text-[12px] text-stone-400">
          Belum ada bahan ditambahkan
        </p>
      )}
      {value.map((row, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Bahan #{i + 1}</span>
            {!disabled && <button type="button" onClick={() => remove(i)} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">Hapus</button>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Jenis Transaksi</label>
              {allowed.length === 1
                ? <div className="rounded-lg border border-stone-200 bg-stone-100 py-2 px-3 text-[13px] text-stone-500">{TX_TYPE_LABELS[allowed[0]]}</div>
                : <select value={row.transaction_type} onChange={e => upd(i, { transaction_type: e.target.value as TransactionType })} disabled={disabled} className={sCls}>
                    {allowed.map(t => <option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>)}
                  </select>
              }
            </div>
            <div>
              <label className={lCls}>Jenis Bahan</label>
              <select value={row.material_type} onChange={e => upd(i, { material_type: e.target.value as MaterialType })} disabled={disabled} className={sCls}>
                {ALL_MAT_TYPES.map(m => <option key={m} value={m}>{MAT_TYPE_LABELS[m]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Karat</label>
              <input type="number" value={row.karat === "" ? "" : row.karat} onChange={e => upd(i, { karat: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="18" min={0} max={24} step="any" disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Berat (gram)</label>
              <input type="number" value={row.weight_grams === "" ? "" : row.weight_grams} onChange={e => upd(i, { weight_grams: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="0.00" min={0.001} step="any" disabled={disabled} className={iCls} />
            </div>
          </div>
          <div>
            <label className={lCls}>Catatan Bahan</label>
            <input type="text" value={row.notes} onChange={e => upd(i, { notes: e.target.value })} placeholder="Opsional" disabled={disabled} className={iCls} />
          </div>
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 py-2.5 text-[13px] font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
          Tambah Bahan
        </button>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── QualityChecklistField ────────────────────────────────────────────────────

function QualityChecklistField({ items, value, onChange, disabled, error }: {
  items: { key: string; label: string }[]; value: QualityRow[];
  onChange: (r: QualityRow[]) => void; disabled: boolean; error?: string;
}) {
  const toggle = (key: string) =>
    onChange(value.map(r => r.check_key === key ? { ...r, passed: !r.passed } : r));

  return (
    <div className="space-y-2">
      {items.map(item => {
        const row = value.find(r => r.check_key === item.key);
        const passed = row?.passed ?? false;
        return (
          <button key={item.key} type="button" onClick={() => toggle(item.key)} disabled={disabled}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
              passed ? "border-emerald-200 bg-emerald-50/60" : "border-stone-200 bg-white hover:border-stone-300"
            }`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              passed ? "border-emerald-500 bg-emerald-500" : "border-stone-300"
            }`}>
              {passed && <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span className="flex-1 text-[13px] text-stone-700">{item.label}</span>
            <span className={`text-[11px] font-semibold ${passed ? "text-emerald-600" : "text-rose-400"}`}>
              {passed ? "OK ✓" : "Gagal"}
            </span>
          </button>
        );
      })}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── CompletenessListField ────────────────────────────────────────────────────

function CompletenessListField({ items, value, onChange, disabled, error }: {
  items: { key: string; label: string }[]; value: ComplRow[];
  onChange: (r: ComplRow[]) => void; disabled: boolean; error?: string;
}) {
  const toggle = (key: string) =>
    onChange(value.map(r => r.item_key === key ? { ...r, checked: !r.checked } : r));

  return (
    <div className="space-y-2">
      {items.map(item => {
        const row = value.find(r => r.item_key === item.key);
        const checked = row?.checked ?? false;
        return (
          <button key={item.key} type="button" onClick={() => toggle(item.key)} disabled={disabled}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
              checked ? "border-blue-200 bg-blue-50/60" : "border-stone-200 bg-white hover:border-stone-300"
            }`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              checked ? "border-blue-500 bg-blue-500" : "border-stone-300"
            }`}>
              {checked && <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span className="flex-1 text-[13px] text-stone-700">{item.label}</span>
            <span className={`text-[11px] font-semibold ${checked ? "text-blue-600" : "text-stone-400"}`}>
              {checked ? "Ada ✓" : "Belum"}
            </span>
          </button>
        );
      })}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── ConfirmationFormField ────────────────────────────────────────────────────

function ConfirmationFormField({ value, onChange, disabled, error }: {
  value: Record<string, any>; onChange: (v: Record<string, any>) => void;
  disabled: boolean; error?: string;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  const status = value.confirmation_status ?? "";
  const needsReason = status === "rejected" || status === "request_changes";

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Jenis Konfirmasi</label>
          <select value={value.confirmation_type ?? "initial"} onChange={e => upd("confirmation_type", e.target.value)} disabled={disabled} className={sCls}>
            <option value="initial">Konfirmasi Awal</option>
            <option value="follow_up">Follow Up</option>
          </select>
        </div>
        <div>
          <label className={lCls}>Metode Konfirmasi</label>
          <select value={value.confirmation_method ?? ""} onChange={e => upd("confirmation_method", e.target.value)} disabled={disabled} className={sCls}>
            <option value="">Pilih...</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Telepon</option>
            <option value="in_person">Tatap Muka</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>
      <div>
        <label className={lCls}>Status Konfirmasi <span className="text-red-400">*</span></label>
        <select value={status} onChange={e => upd("confirmation_status", e.target.value)} disabled={disabled} className={sCls}>
          <option value="">Pilih status...</option>
          <option value="approved">Disetujui Customer</option>
          <option value="rejected">Ditolak Customer</option>
          <option value="request_changes">Minta Perubahan</option>
          <option value="pending">Menunggu Konfirmasi</option>
        </select>
      </div>
      {needsReason && (
        <div>
          <label className={lCls}>Alasan / Permintaan Perubahan</label>
          <textarea value={value.rejection_reason ?? ""} onChange={e => upd("rejection_reason", e.target.value)} rows={2} disabled={disabled}
            placeholder="Deskripsikan alasan atau perubahan yang diminta..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50" />
        </div>
      )}
      {status === "approved" && (
        <div>
          <label className={lCls}>Waktu Konfirmasi</label>
          <input type="datetime-local" value={value.confirmed_at ?? ""} onChange={e => upd("confirmed_at", e.target.value)} disabled={disabled} className={iCls} />
        </div>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── PackagingFormField ───────────────────────────────────────────────────────

function PackagingFormField({ value, onChange, disabled }: {
  value: Record<string, any>; onChange: (v: Record<string, any>) => void; disabled: boolean;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Tipe Box</label>
          <input type="text" value={value.box_type ?? ""} onChange={e => upd("box_type", e.target.value)} placeholder="Contoh: Premium, Standard" disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>Tipe Gift / Wrapping</label>
          <input type="text" value={value.gift_type ?? ""} onChange={e => upd("gift_type", e.target.value)} placeholder="Contoh: Gift wrap, Pouch" disabled={disabled} className={iCls} />
        </div>
      </div>
      <div>
        <label className={lCls}>Versi Price List</label>
        <input type="text" value={value.price_list_version ?? ""} onChange={e => upd("price_list_version", e.target.value)} placeholder="Contoh: v2024-Q1" disabled={disabled} className={iCls} />
      </div>
      <div>
        <label className={lCls}>Catatan Packaging</label>
        <input type="text" value={value.notes ?? ""} onChange={e => upd("notes", e.target.value)} placeholder="Opsional" disabled={disabled} className={iCls} />
      </div>
    </div>
  );
}

// ─── CertificateArrayField ────────────────────────────────────────────────────

function CertificateArrayField({ value, onChange, disabled, error }: {
  value: CertRow[]; onChange: (r: CertRow[]) => void; disabled: boolean; error?: string;
}) {
  const blank: CertRow = { certificate_type: "", certificate_number: "", issuing_body: "", is_verified: false, notes: "" };
  const add = () => onChange([...value, { ...blank }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const upd = (i: number, p: Partial<CertRow>) => onChange(value.map((r, idx) => idx === i ? { ...r, ...p } : r));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 py-3 text-center text-[12px] text-stone-400">Belum ada sertifikat</p>
      )}
      {value.map((row, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Sertifikat #{i + 1}</span>
            {!disabled && <button type="button" onClick={() => remove(i)} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">Hapus</button>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Tipe Sertifikat</label>
              <input type="text" value={row.certificate_type} onChange={e => upd(i, { certificate_type: e.target.value })} placeholder="GIA, IGI, dll" disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Nomor Sertifikat</label>
              <input type="text" value={row.certificate_number} onChange={e => upd(i, { certificate_number: e.target.value })} disabled={disabled} className={iCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Lembaga Penerbit</label>
              <input type="text" value={row.issuing_body} onChange={e => upd(i, { issuing_body: e.target.value })} disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Terverifikasi</label>
              <button type="button" onClick={() => upd(i, { is_verified: !row.is_verified })} disabled={disabled}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${row.is_verified ? "bg-amber-500" : "bg-stone-200"} disabled:opacity-50`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${row.is_verified ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <div>
            <label className={lCls}>Catatan</label>
            <input type="text" value={row.notes} onChange={e => upd(i, { notes: e.target.value })} placeholder="Opsional" disabled={disabled} className={iCls} />
          </div>
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 py-2.5 text-[13px] font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
          Tambah Sertifikat
        </button>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── PaymentArrayField ────────────────────────────────────────────────────────

function PaymentArrayField({ value, onChange, disabled, error }: {
  value: PaymentRow[]; onChange: (r: PaymentRow[]) => void; disabled: boolean; error?: string;
}) {
  const blank: PaymentRow = { type: "pelunasan", amount: "", method: "cash", reference_no: "", paid_at: "", notes: "" };
  const add = () => onChange([...value, { ...blank }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const upd = (i: number, p: Partial<PaymentRow>) => onChange(value.map((r, idx) => idx === i ? { ...r, ...p } : r));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 py-3 text-center text-[12px] text-stone-400">Belum ada pembayaran ditambahkan</p>
      )}
      {value.map((row, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Pembayaran #{i + 1}</span>
            {!disabled && <button type="button" onClick={() => remove(i)} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">Hapus</button>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Tipe</label>
              <select value={row.type} onChange={e => upd(i, { type: e.target.value })} disabled={disabled} className={sCls}>
                <option value="dp">DP</option>
                <option value="pelunasan">Pelunasan</option>
                <option value="refund">Refund</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className={lCls}>Metode</label>
              <select value={row.method} onChange={e => upd(i, { method: e.target.value })} disabled={disabled} className={sCls}>
                <option value="cash">Cash</option>
                <option value="transfer_bank">Transfer Bank</option>
                <option value="qris">QRIS</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Jumlah (IDR) <span className="text-red-400">*</span></label>
              <input type="number" value={row.amount === "" ? "" : row.amount} onChange={e => upd(i, { amount: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="0" min={0} disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Tanggal Bayar</label>
              <input type="date" value={row.paid_at} onChange={e => upd(i, { paid_at: e.target.value })} disabled={disabled} className={iCls} />
            </div>
          </div>
          <div>
            <label className={lCls}>No. Referensi</label>
            <input type="text" value={row.reference_no} onChange={e => upd(i, { reference_no: e.target.value })} placeholder="Nomor transfer / bukti" disabled={disabled} className={iCls} />
          </div>
          <div>
            <label className={lCls}>Catatan</label>
            <input type="text" value={row.notes} onChange={e => upd(i, { notes: e.target.value })} placeholder="Opsional" disabled={disabled} className={iCls} />
          </div>
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 py-2.5 text-[13px] font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
          Tambah Pembayaran
        </button>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── DeliveryFormField ────────────────────────────────────────────────────────

function DeliveryFormField({ value, onChange, disabled }: {
  value: Record<string, any>; onChange: (v: Record<string, any>) => void; disabled: boolean;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  const method = value.delivery_method ?? "pickup_store";
  const needsCourier = method !== "pickup_store";

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div>
        <label className={lCls}>Metode Pengiriman</label>
        <select value={method} onChange={e => upd("delivery_method", e.target.value)} disabled={disabled} className={sCls}>
          <option value="pickup_store">Ambil di Toko</option>
          <option value="courier_local">Kurir Lokal</option>
          <option value="courier_intercity">Kurir Antar Kota</option>
          <option value="in_house_delivery">Antar ke Rumah</option>
          <option value="other">Lainnya</option>
        </select>
      </div>
      {needsCourier && (
        <div>
          <label className={lCls}>Nama Kurir / Ekspedisi</label>
          <input type="text" value={value.courier_name ?? ""} onChange={e => upd("courier_name", e.target.value)} placeholder="Contoh: JNE, Gojek" disabled={disabled} className={iCls} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Nama Penerima</label>
          <input type="text" value={value.recipient_name ?? ""} onChange={e => upd("recipient_name", e.target.value)} disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>No. Telepon</label>
          <input type="text" value={value.recipient_phone ?? ""} onChange={e => upd("recipient_phone", e.target.value)} placeholder="08xx" disabled={disabled} className={iCls} />
        </div>
      </div>
      {needsCourier && (
        <div>
          <label className={lCls}>Alamat Pengiriman</label>
          <textarea value={value.delivery_address ?? ""} onChange={e => upd("delivery_address", e.target.value)} rows={2} disabled={disabled}
            className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50" />
        </div>
      )}
      <div>
        <label className={lCls}>Catatan Pengiriman</label>
        <input type="text" value={value.notes ?? ""} onChange={e => upd("notes", e.target.value)} placeholder="Opsional" disabled={disabled} className={iCls} />
      </div>
    </div>
  );
}

// ─── DeliveryUpdateFormField ──────────────────────────────────────────────────

function DeliveryUpdateFormField({ value, onChange, disabled, error }: {
  value: Record<string, any>; onChange: (v: Record<string, any>) => void;
  disabled: boolean; error?: string;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div>
        <label className={lCls}>Status Pengiriman <span className="text-red-400">*</span></label>
        <select value={value.status ?? ""} onChange={e => upd("status", e.target.value)} disabled={disabled} className={sCls}>
          <option value="">Pilih status...</option>
          <option value="dispatched">Dikirim / Diambil Kurir</option>
          <option value="delivered">Terkirim / Diterima</option>
          <option value="failed">Gagal Terkirim</option>
          <option value="returned">Dikembalikan</option>
        </select>
      </div>
      <div>
        <label className={lCls}>Nomor Resi / Tracking</label>
        <input type="text" value={value.tracking_number ?? ""} onChange={e => upd("tracking_number", e.target.value)} placeholder="Nomor resi kurir" disabled={disabled} className={iCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Tgl. Dikirim</label>
          <input type="datetime-local" value={value.dispatched_at ?? ""} onChange={e => upd("dispatched_at", e.target.value)} disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>Tgl. Diterima</label>
          <input type="datetime-local" value={value.delivered_at ?? ""} onChange={e => upd("delivered_at", e.target.value)} disabled={disabled} className={iCls} />
        </div>
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── HandoverFormField ────────────────────────────────────────────────────────

function HandoverFormField({ value, onChange, disabled }: {
  value: Record<string, any>; onChange: (v: Record<string, any>) => void; disabled: boolean;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div>
        <label className={lCls}>Tipe Serah Terima</label>
        <select value={value.handover_type ?? "store_to_customer"} onChange={e => upd("handover_type", e.target.value)} disabled={disabled} className={sCls}>
          <option value="store_to_customer">Toko → Customer</option>
          <option value="internal">Internal</option>
        </select>
      </div>
      <div>
        <label className={lCls}>Catatan Serah Terima</label>
        <textarea value={value.notes ?? ""} onChange={e => upd("notes", e.target.value)} rows={2} disabled={disabled}
          className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const COMPLEX_ARRAY_TYPES = new Set(["material_array", "certificate_array", "payment_array", "attachment_list"]);
const COMPLEX_OBJ_TYPES   = new Set(["confirmation_form", "packaging_form", "delivery_form", "delivery_update_form", "handover_form", "object"]);
const SKIP_TYPES          = new Set(["customer_selector", "gemstone_array", "attachment_list"]);

function initField(field: Field, initial: Record<string, unknown>): unknown {
  const v = initial[field.name];
  if (field.type === "material_array" || field.type === "certificate_array" || field.type === "payment_array")
    return Array.isArray(v) ? v : [];
  if (field.type === "attachment_list")
    return Array.isArray(v) ? v : [];
  if (field.type === "quality_checklist")
    return (field.items ?? []).map(item => {
      const ex = (Array.isArray(v) ? v as any[] : []).find((r: any) => r.check_key === item.key);
      return { check_key: item.key, passed: ex?.passed ?? false, notes: ex?.notes ?? "" };
    });
  if (field.type === "completeness_list")
    return (field.items ?? []).map(item => {
      const ex = (Array.isArray(v) ? v as any[] : []).find((r: any) => r.item_key === item.key);
      return { item_key: item.key, checked: ex?.checked ?? false, notes: ex?.notes ?? "" };
    });
  if (COMPLEX_OBJ_TYPES.has(field.type))
    return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
  if (field.type === "boolean")
    return v ?? false;
  return v ?? "";
}

export default function StageInputForm({ fields, permissions, initialData = {}, onSubmit }: StageInputFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const d: Record<string, unknown> = {};
    fields.forEach(f => { d[f.name] = initField(f, initialData); });
    return d;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    fields.forEach(field => {
      const v = formData[field.name];
      if (field.type === "material_array") {
        const rows = v as MaterialRow[];
        if (field.required && (!rows || rows.length === 0))
          errs[field.name] = `${field.label} wajib diisi (minimal 1 bahan)`;
        else for (let i = 0; i < (rows ?? []).length; i++)
          if (!rows[i].weight_grams || Number(rows[i].weight_grams) <= 0) { errs[field.name] = `Bahan #${i + 1}: berat harus diisi`; break; }
        return;
      }
      if (field.type === "payment_array") {
        const rows = v as PaymentRow[];
        if (field.required && (!rows || rows.length === 0)) errs[field.name] = "Minimal 1 pembayaran harus diisi";
        else for (let i = 0; i < (rows ?? []).length; i++)
          if (!rows[i].amount || Number(rows[i].amount) <= 0) { errs[field.name] = `Pembayaran #${i + 1}: jumlah harus > 0`; break; }
        return;
      }
      if (field.type === "confirmation_form") {
        if (field.required && !(v as any)?.confirmation_status)
          errs[field.name] = "Status konfirmasi wajib dipilih";
        return;
      }
      if (field.type === "delivery_update_form") {
        if (field.required && !(v as any)?.status)
          errs[field.name] = "Status pengiriman wajib dipilih";
        return;
      }
      if (SKIP_TYPES.has(field.type) || COMPLEX_OBJ_TYPES.has(field.type) ||
          field.type === "quality_checklist" || field.type === "completeness_list" ||
          field.type === "certificate_array") return;
      if (field.required && !v && v !== false)
        errs[field.name] = `${field.label} wajib diisi`;
      if (field.type === "number" && v !== "" && v !== null) {
        const n = Number(v);
        if (field.min !== undefined && n < field.min) errs[field.name] = `Minimal ${field.min} ${field.unit || ""}`;
        if (field.max !== undefined && n > field.max) errs[field.name] = `Maksimal ${field.max} ${field.unit || ""}`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!validate() || !permissions.can_submit) return;
    setIsSubmitting(true);
    try { await onSubmit(formData); }
    catch { /* handled by parent */ }
    finally { setIsSubmitting(false); }
  };

  const updateField = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  if (fields.filter(f => !SKIP_TYPES.has(f.type)).length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/90 p-7 shadow-sm text-center">
        <p className="text-stone-400 text-[14px]">Tidak ada data yang perlu diinput untuk tahap ini.</p>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm p-6 shadow-sm space-y-4">
        {fields.map(field => {
          if (SKIP_TYPES.has(field.type)) return null;

          return (
            <div key={field.name}>
              {/* Skip label for complex field types that have their own internal labels */}
              {!COMPLEX_OBJ_TYPES.has(field.type) && field.type !== "quality_checklist" &&
               field.type !== "completeness_list" && field.type !== "material_array" &&
               field.type !== "certificate_array" && field.type !== "payment_array" && (
                <label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  {field.label}
                  {field.required && <span className="text-red-400">*</span>}
                </label>
              )}
              {/* Section header for complex types */}
              {(COMPLEX_OBJ_TYPES.has(field.type) || field.type === "quality_checklist" ||
                field.type === "completeness_list" || field.type === "material_array" ||
                field.type === "certificate_array" || field.type === "payment_array") && (
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  {field.label}{field.required && <span className="text-red-400 ml-1">*</span>}
                </p>
              )}

              {/* ── Primitive types ── */}
              {field.type === "text" && (
                <input type="text" value={String(formData[field.name] ?? "")} onChange={e => updateField(field.name, e.target.value)}
                  placeholder={field.placeholder} disabled={!permissions.can_edit}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
              )}

              {(field.type === "date" || field.type === "time") && (
                <input type={field.type} value={String(formData[field.name] ?? "")} onChange={e => updateField(field.name, e.target.value)}
                  disabled={!permissions.can_edit}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
              )}

              {field.type === "number" && (
                <div className="relative">
                  <input type="number" value={String(formData[field.name] ?? "")}
                    onChange={e => updateField(field.name, e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={field.placeholder} min={field.min} max={field.max} step="any" disabled={!permissions.can_edit}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 pr-12 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                  {field.unit && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-stone-400 font-medium">{field.unit}</span>}
                </div>
              )}

              {field.type === "select" && field.options && (
                <select value={String(formData[field.name] ?? "")} onChange={e => updateField(field.name, e.target.value)}
                  disabled={!permissions.can_edit}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "2.5rem" }}>
                  <option value="">Pilih...</option>
                  {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}

              {field.type === "textarea" && (
                <textarea value={String(formData[field.name] ?? "")} onChange={e => updateField(field.name, e.target.value)}
                  placeholder={field.placeholder} rows={3} disabled={!permissions.can_edit}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed" />
              )}

              {field.type === "boolean" && (
                <button type="button" onClick={() => updateField(field.name, !formData[field.name])} disabled={!permissions.can_edit}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${formData[field.name] ? "bg-amber-500" : "bg-stone-200"} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${formData[field.name] ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              )}

              {/* ── Complex types ── */}
              {field.type === "material_array" && (
                <MaterialArrayField
                  value={(formData[field.name] as MaterialRow[]) ?? []}
                  onChange={rows => updateField(field.name, rows)}
                  transactionTypes={field.transactionTypes ?? ALL_TX_TYPES}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "quality_checklist" && (
                <QualityChecklistField
                  items={field.items ?? []}
                  value={(formData[field.name] as QualityRow[]) ?? []}
                  onChange={rows => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "completeness_list" && (
                <CompletenessListField
                  items={field.items ?? []}
                  value={(formData[field.name] as ComplRow[]) ?? []}
                  onChange={rows => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "certificate_array" && (
                <CertificateArrayField
                  value={(formData[field.name] as CertRow[]) ?? []}
                  onChange={rows => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "payment_array" && (
                <PaymentArrayField
                  value={(formData[field.name] as PaymentRow[]) ?? []}
                  onChange={rows => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "confirmation_form" && (
                <ConfirmationFormField
                  value={(formData[field.name] as Record<string, any>) ?? {}}
                  onChange={v => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "packaging_form" && (
                <PackagingFormField
                  value={(formData[field.name] as Record<string, any>) ?? {}}
                  onChange={v => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                />
              )}

              {field.type === "delivery_form" && (
                <DeliveryFormField
                  value={(formData[field.name] as Record<string, any>) ?? {}}
                  onChange={v => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                />
              )}

              {field.type === "delivery_update_form" && (
                <DeliveryUpdateFormField
                  value={(formData[field.name] as Record<string, any>) ?? {}}
                  onChange={v => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "handover_form" && (
                <HandoverFormField
                  value={(formData[field.name] as Record<string, any>) ?? {}}
                  onChange={v => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                />
              )}

              {/* Error for primitive types */}
              {!COMPLEX_ARRAY_TYPES.has(field.type) && !COMPLEX_OBJ_TYPES.has(field.type) &&
               field.type !== "quality_checklist" && field.type !== "completeness_list" &&
               errors[field.name] && (
                <p className="mt-1 text-[12px] text-red-500">{errors[field.name]}</p>
              )}
            </div>
          );
        })}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {permissions.can_reject && (
            <button type="button" disabled={isSubmitting}
              className="flex-1 rounded-xl border border-red-200 bg-white py-2.5 text-[14px] font-medium text-red-600 transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
              onClick={() => { if (confirm("Tolak hasil tahap ini?")) {} }}>
              Tolak
            </button>
          )}
          {permissions.can_submit && (
            <button type="submit" disabled={isSubmitting}
              className="flex-1 rounded-xl bg-stone-800 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-stone-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
              {isSubmitting
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    Menyimpan...
                  </span>
                : "Simpan Data"
              }
            </button>
          )}
        </div>
      </form>
    </div>
  );
}