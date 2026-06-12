// components/fields/HandoverFormField.tsx
"use client";

import { sCls, lCls } from "./types";

export default function HandoverFormField({
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
      <div>
        <label className={lCls}>Tipe Serah Terima</label>
        <select value={(value.handover_type as string) ?? "store_to_customer"} onChange={(e) => upd("handover_type", e.target.value)} disabled={disabled} className={sCls}>
          <option value="store_to_customer">Toko → Customer</option>
          <option value="internal">Internal</option>
        </select>
      </div>
      <div>
        <label className={lCls}>Catatan Serah Terima</label>
        <textarea value={(value.notes as string) ?? ""} onChange={(e) => upd("notes", e.target.value)} rows={2} disabled={disabled}
          className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50" />
      </div>
    </div>
  );
}
