// components/fields/PackagingFormField.tsx
"use client";

import { iCls, lCls } from "./types";

export default function PackagingFormField({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Tipe Box</label>
          <input type="text" value={(value.box_type as string) ?? ""} onChange={(e) => upd("box_type", e.target.value)} placeholder="Contoh: Premium, Standard" disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>Tipe Gift / Wrapping</label>
          <input type="text" value={(value.gift_type as string) ?? ""} onChange={(e) => upd("gift_type", e.target.value)} placeholder="Contoh: Gift wrap, Pouch" disabled={disabled} className={iCls} />
        </div>
      </div>
      <div>
        <label className={lCls}>Versi Price List</label>
        <input type="text" value={(value.price_list_version as string) ?? ""} onChange={(e) => upd("price_list_version", e.target.value)} placeholder="Contoh: v2024-Q1" disabled={disabled} className={iCls} />
      </div>
      <div>
        <label className={lCls}>Catatan Packaging</label>
        <input type="text" value={(value.notes as string) ?? ""} onChange={(e) => upd("notes", e.target.value)} placeholder="Opsional" disabled={disabled} className={iCls} />
      </div>
    </div>
  );
}
