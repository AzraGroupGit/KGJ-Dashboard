// components/fields/PaymentArrayField.tsx
"use client";

import type { PaymentRow } from "./types";
import { iCls, sCls, lCls } from "./types";
import { Plus } from "lucide-react";

export default function PaymentArrayField({
  value,
  onChange,
  disabled,
  error,
}: {
  value: PaymentRow[];
  onChange: (r: PaymentRow[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const blank: PaymentRow = { type: "pelunasan", amount: "", method: "cash", reference_no: "", paid_at: "", notes: "" };
  const add = () => onChange([...value, { ...blank }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const upd = (i: number, p: Partial<PaymentRow>) => onChange(value.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 py-3 text-center text-[12px] text-stone-400">Belum ada pembayaran ditambahkan</p>
      )}
      {value.map((row, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Pembayaran #{i + 1}</span>
            {!disabled && (
              <button type="button" onClick={() => remove(i)} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">Hapus</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Tipe</label>
              <select value={row.type} onChange={(e) => upd(i, { type: e.target.value })} disabled={disabled} className={sCls}>
                <option value="dp">DP</option>
                <option value="pelunasan">Pelunasan</option>
                <option value="refund">Refund</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className={lCls}>Metode</label>
              <select value={row.method} onChange={(e) => upd(i, { method: e.target.value })} disabled={disabled} className={sCls}>
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
              <input type="number" value={row.amount === "" ? "" : row.amount} onChange={(e) => upd(i, { amount: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="0" min={0} disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Tanggal Bayar</label>
              <input type="date" value={row.paid_at} onChange={(e) => upd(i, { paid_at: e.target.value })} disabled={disabled} className={iCls} />
            </div>
          </div>
          <div>
            <label className={lCls}>No. Referensi</label>
            <input type="text" value={row.reference_no} onChange={(e) => upd(i, { reference_no: e.target.value })} placeholder="Nomor transfer / bukti" disabled={disabled} className={iCls} />
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
          Tambah Pembayaran
        </button>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
