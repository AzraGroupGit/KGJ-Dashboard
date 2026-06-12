// components/fields/CertificateArrayField.tsx
"use client";

import type { CertRow } from "./types";
import { iCls, lCls } from "./types";
import { Plus } from "lucide-react";

export default function CertificateArrayField({
  value,
  onChange,
  disabled,
  error,
}: {
  value: CertRow[];
  onChange: (r: CertRow[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const blank: CertRow = { certificate_type: "", certificate_number: "", issuing_body: "", is_verified: false, notes: "" };
  const add = () => onChange([...value, { ...blank }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const upd = (i: number, p: Partial<CertRow>) => onChange(value.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 py-3 text-center text-[12px] text-stone-400">Belum ada sertifikat</p>
      )}
      {value.map((row, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Sertifikat #{i + 1}</span>
            {!disabled && (
              <button type="button" onClick={() => remove(i)} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">Hapus</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Tipe Sertifikat</label>
              <input type="text" value={row.certificate_type} onChange={(e) => upd(i, { certificate_type: e.target.value })} placeholder="GIA, IGI, dll" disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Nomor Sertifikat</label>
              <input type="text" value={row.certificate_number} onChange={(e) => upd(i, { certificate_number: e.target.value })} disabled={disabled} className={iCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Lembaga Penerbit</label>
              <input type="text" value={row.issuing_body} onChange={(e) => upd(i, { issuing_body: e.target.value })} disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Terverifikasi</label>
              <button type="button" onClick={() => upd(i, { is_verified: !row.is_verified })} disabled={disabled} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${row.is_verified ? "bg-amber-500" : "bg-stone-200"} disabled:opacity-50`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${row.is_verified ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <div>
            <label className={lCls}>Catatan</label>
            <input type="text" value={row.notes} onChange={(e) => upd(i, { notes: e.target.value })} placeholder="Opsional" disabled={disabled} className={iCls} />
          </div>
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 py-2.5 text-[13px] font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors">
          <Plus className="h-4 w-4" />
          Tambah Sertifikat
        </button>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
