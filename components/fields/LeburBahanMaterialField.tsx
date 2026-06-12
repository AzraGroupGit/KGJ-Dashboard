// components/fields/LeburBahanMaterialField.tsx
"use client";

import type { MaterialRow, MaterialType } from "./types";
import { MAT_TYPE_LABELS, ALL_MAT_TYPES, iCls, sCls, lCls } from "./types";

export default function LeburBahanMaterialField({
  value,
  onChange,
  disabled,
  error,
}: {
  value: MaterialRow[];
  onChange: (r: MaterialRow[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const rows =
    value.length === 0
      ? [
          {
            transaction_type: "output" as const,
            material_type: "gold" as MaterialType,
            karat: "" as number | "",
            weight_grams: "" as number | "",
            notes: "",
          },
          {
            transaction_type: "waste" as const,
            material_type: "gold" as MaterialType,
            karat: "" as number | "",
            weight_grams: "" as number | "",
            notes: "",
          },
        ]
      : value;

  const updOutput = (p: Partial<MaterialRow>) => {
    const newRows = [...rows];
    newRows[0] = { ...newRows[0], transaction_type: "output", ...p };
    onChange(newRows);
  };
  const updWaste = (p: Partial<MaterialRow>) => {
    const newRows = [...rows];
    newRows[1] = { ...newRows[1], transaction_type: "waste", ...p };
    onChange(newRows);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px] font-bold">1</span>
          <span className="text-[13px] font-semibold text-emerald-800">Hasil Lebur (Output)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lCls}>Jenis Bahan</label>
            <select value={rows[0]?.material_type ?? "gold"} onChange={(e) => updOutput({ material_type: e.target.value as MaterialType })} disabled={disabled} className={sCls}>
              {ALL_MAT_TYPES.map((m) => (<option key={m} value={m}>{MAT_TYPE_LABELS[m]}</option>))}
            </select>
          </div>
          <div>
            <label className={lCls}>Karat</label>
            <input type="number" value={rows[0]?.karat === "" ? "" : rows[0]?.karat} onChange={(e) => updOutput({ karat: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="18" min={0} max={24} step="any" disabled={disabled} className={iCls} />
          </div>
        </div>
        <div>
          <label className={lCls}>Berat Hasil Cetakan (gram) <span className="text-red-400">*</span></label>
          <input type="number" value={rows[0]?.weight_grams === "" ? "" : rows[0]?.weight_grams} onChange={(e) => updOutput({ weight_grams: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="0.00" min={0.001} step="any" disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>Catatan</label>
          <input type="text" value={rows[0]?.notes ?? ""} onChange={(e) => updOutput({ notes: e.target.value })} placeholder="Opsional" disabled={disabled} className={iCls} />
        </div>
      </div>
      <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold">2</span>
          <span className="text-[13px] font-semibold text-rose-800">Penyusutan (Waste)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lCls}>Jenis Bahan</label>
            <select value={rows[1]?.material_type ?? "gold"} onChange={(e) => updWaste({ material_type: e.target.value as MaterialType })} disabled={disabled} className={sCls}>
              {ALL_MAT_TYPES.map((m) => (<option key={m} value={m}>{MAT_TYPE_LABELS[m]}</option>))}
            </select>
          </div>
          <div>
            <label className={lCls}>Karat</label>
            <input type="number" value={rows[1]?.karat === "" ? "" : rows[1]?.karat} onChange={(e) => updWaste({ karat: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="18" min={0} max={24} step="any" disabled={disabled} className={iCls} />
          </div>
        </div>
        <div>
          <label className={lCls}>Berat yang Hilang (gram)</label>
          <input type="number" value={rows[1]?.weight_grams === "" ? "" : rows[1]?.weight_grams} onChange={(e) => updWaste({ weight_grams: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="0.00" min={0} step="any" disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>Catatan</label>
          <input type="text" value={rows[1]?.notes ?? ""} onChange={(e) => updWaste({ notes: e.target.value })} placeholder="Opsional" disabled={disabled} className={iCls} />
        </div>
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
