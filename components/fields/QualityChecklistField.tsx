// components/fields/QualityChecklistField.tsx
"use client";

import type { QualityRow, FieldItem } from "./types";
import { Check } from "lucide-react";

export default function QualityChecklistField({
  items,
  value,
  onChange,
  disabled,
  error,
}: {
  items: FieldItem[];
  value: QualityRow[];
  onChange: (r: QualityRow[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const toggle = (key: string) =>
    onChange(value.map((r) => (r.check_key === key ? { ...r, passed: !r.passed } : r)));

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const row = value.find((r) => r.check_key === item.key);
        const passed = row?.passed ?? false;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            disabled={disabled}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
              passed ? "border-emerald-200 bg-emerald-50/60" : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${passed ? "border-emerald-500 bg-emerald-500" : "border-stone-300"}`}>
              {passed && (
                <Check className="h-3 w-3 text-white" strokeWidth={1.5} />
              )}
            </span>
            <span className="flex-1 text-[13px] text-stone-700">
              {item.label}
              {item.required === false && <span className="ml-1 text-[11px] text-stone-400 font-normal">(Opsional)</span>}
            </span>
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
