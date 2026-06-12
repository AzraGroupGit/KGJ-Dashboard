// components/fields/CompletenessListField.tsx
"use client";

import type { ComplRow, FieldItem } from "./types";
import { Check } from "lucide-react";

export default function CompletenessListField({
  items,
  value,
  onChange,
  disabled,
  error,
}: {
  items: FieldItem[];
  value: ComplRow[];
  onChange: (r: ComplRow[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const toggle = (key: string) =>
    onChange(value.map((r) => (r.item_key === key ? { ...r, checked: !r.checked } : r)));

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const row = value.find((r) => r.item_key === item.key);
        const checked = row?.checked ?? false;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            disabled={disabled}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
              checked ? "border-blue-200 bg-blue-50/60" : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${checked ? "border-blue-500 bg-blue-500" : "border-stone-300"}`}>
              {checked && (
                <Check className="h-3 w-3 text-white" strokeWidth={1.5} />
              )}
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
