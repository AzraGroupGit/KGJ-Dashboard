// components/fields/PembentukanMaterialField.tsx
"use client";

import type { MaterialRow, MaterialType, TransactionType } from "./types";
import { MAT_TYPE_LABELS, ALL_MAT_TYPES, iCls, sCls, lCls } from "./types";

export default function PembentukanMaterialField({
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
          { transaction_type: "input" as TransactionType, material_type: "gold" as MaterialType, karat: "" as number | "", weight_grams: "" as number | "", notes: "" },
          { transaction_type: "output" as TransactionType, material_type: "gold" as MaterialType, karat: "" as number | "", weight_grams: "" as number | "", notes: "" },
          { transaction_type: "waste" as TransactionType, material_type: "gold" as MaterialType, karat: "" as number | "", weight_grams: "" as number | "", notes: "" },
        ]
      : value;

  const updRow = (index: number, p: Partial<MaterialRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...p };
    onChange(newRows);
  };

  const sections: { index: number; type: TransactionType; label: string; color: string; bgColor: string; textColor: string; required: boolean }[] = [
    { index: 0, type: "input", label: "Bahan Input (Sebelum Dibentuk)", color: "border-blue-200", bgColor: "bg-blue-50/30", textColor: "text-blue-800", required: true },
    { index: 1, type: "output", label: "Hasil Bentuk (Output)", color: "border-emerald-200", bgColor: "bg-emerald-50/30", textColor: "text-emerald-800", required: true },
    { index: 2, type: "waste", label: "Sisa Bahan / Berat Hilang", color: "border-rose-200", bgColor: "bg-rose-50/30", textColor: "text-rose-800", required: false },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.type} className={`rounded-xl border ${section.color} ${section.bgColor} p-4 space-y-3`}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-600 text-white text-[11px] font-bold">{section.index + 1}</span>
            <span className={`text-[13px] font-semibold ${section.textColor}`}>{section.label}{section.required && <span className="text-red-400 ml-0.5">*</span>}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lCls}>Jenis Bahan</label>
              <select value={rows[section.index]?.material_type ?? "gold"} onChange={(e) => updRow(section.index, { material_type: e.target.value as MaterialType, transaction_type: section.type })} disabled={disabled} className={sCls}>
                {ALL_MAT_TYPES.map((m) => (<option key={m} value={m}>{MAT_TYPE_LABELS[m]}</option>))}
              </select>
            </div>
            <div>
              <label className={lCls}>Karat</label>
              <input type="number" value={rows[section.index]?.karat === "" ? "" : rows[section.index]?.karat} onChange={(e) => updRow(section.index, { karat: e.target.value === "" ? "" : Number(e.target.value), transaction_type: section.type })} placeholder="18" min={0} max={24} step="any" disabled={disabled} className={iCls} />
            </div>
          </div>
          <div>
            <label className={lCls}>Berat (gram) {section.required && <span className="text-red-400">*</span>}</label>
            <input type="number" value={rows[section.index]?.weight_grams === "" ? "" : rows[section.index]?.weight_grams} onChange={(e) => updRow(section.index, { weight_grams: e.target.value === "" ? "" : Number(e.target.value), transaction_type: section.type })} placeholder="0.00" min={0.001} step="any" disabled={disabled} className={iCls} />
          </div>
          <div>
            <label className={lCls}>Catatan</label>
            <input type="text" value={rows[section.index]?.notes ?? ""} onChange={(e) => updRow(section.index, { notes: e.target.value, transaction_type: section.type })} placeholder="Opsional" disabled={disabled} className={iCls} />
          </div>
        </div>
      ))}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
