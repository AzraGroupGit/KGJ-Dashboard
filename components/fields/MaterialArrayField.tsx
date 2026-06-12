// components/fields/MaterialArrayField.tsx
"use client";

import type { MaterialRow, MaterialType, TransactionType } from "./types";
import { TX_TYPE_LABELS, MAT_TYPE_LABELS, ALL_TX_TYPES, ALL_MAT_TYPES, iCls, sCls, lCls } from "./types";
import { Plus } from "lucide-react";

export default function MaterialArrayField({
  value,
  onChange,
  transactionTypes,
  disabled,
  error,
}: {
  value: MaterialRow[];
  onChange: (r: MaterialRow[]) => void;
  transactionTypes: TransactionType[];
  disabled: boolean;
  error?: string;
}) {
  const allowed = transactionTypes.length > 0 ? transactionTypes : ALL_TX_TYPES;
  const add = () =>
    onChange([
      ...value,
      { transaction_type: allowed[0], material_type: "gold" as const, karat: "" as number | "", weight_grams: "" as number | "", notes: "" },
    ]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const upd = (i: number, p: Partial<MaterialRow>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 py-4 text-center text-[12px] text-stone-400">Belum ada bahan ditambahkan</p>
      )}
      {value.map((row, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Bahan #{i + 1}</span>
            {!disabled && (
              <button type="button" onClick={() => remove(i)} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">Hapus</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Jenis Transaksi</label>
              {allowed.length === 1 ? (
                <div className="rounded-lg border border-stone-200 bg-stone-100 py-2 px-3 text-[13px] text-stone-500">{TX_TYPE_LABELS[allowed[0]]}</div>
              ) : (
                <select value={row.transaction_type} onChange={(e) => upd(i, { transaction_type: e.target.value as TransactionType })} disabled={disabled} className={sCls}>
                  {allowed.map((t) => (<option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>))}
                </select>
              )}
            </div>
            <div>
              <label className={lCls}>Jenis Bahan</label>
              <select value={row.material_type} onChange={(e) => upd(i, { material_type: e.target.value as MaterialType })} disabled={disabled} className={sCls}>
                {ALL_MAT_TYPES.map((m) => (<option key={m} value={m}>{MAT_TYPE_LABELS[m]}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lCls}>Karat</label>
              <input type="number" value={row.karat === "" ? "" : row.karat} onChange={(e) => upd(i, { karat: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="18" min={0} max={24} step="any" disabled={disabled} className={iCls} />
            </div>
            <div>
              <label className={lCls}>Berat (gram)</label>
              <input type="number" value={row.weight_grams === "" ? "" : row.weight_grams} onChange={(e) => upd(i, { weight_grams: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="0.00" min={0.001} step="any" disabled={disabled} className={iCls} />
            </div>
          </div>
          <div>
            <label className={lCls}>Catatan Bahan</label>
            <input type="text" value={row.notes} onChange={(e) => upd(i, { notes: e.target.value })} placeholder="Opsional" disabled={disabled} className={iCls} />
          </div>
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 py-2.5 text-[13px] font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors">
          <Plus className="h-4 w-4" />
          Tambah Bahan
        </button>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
