// components/fields/MultiSelectField.tsx
"use client";

import type { FieldOption } from "./types";
import { Check } from "lucide-react";

export default function MultiSelectField({
  options,
  value,
  onChange,
  disabled,
  error,
}: {
  options: FieldOption[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const grouped = options.reduce<Record<string, { value: string; label: string }[]>>((acc, opt) => {
    const g = opt.group ?? "Lainnya";
    if (!acc[g]) acc[g] = [];
    acc[g].push({ value: opt.value, label: opt.label });
    return acc;
  }, {});

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const selectedCount = value.length;

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([group, opts]) => (
        <details key={group} className="group">
          <summary className="cursor-pointer text-[13px] font-medium text-stone-700 hover:text-stone-900">{group}</summary>
          <div className="mt-1 space-y-1 pl-2">
            {opts.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                    checked ? "border-emerald-200 bg-emerald-50/60 text-emerald-800" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${checked ? "border-emerald-500 bg-emerald-500" : "border-stone-300 bg-white"}`}>
                    {checked && (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    )}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </details>
      ))}
      {selectedCount > 0 && <p className="text-[12px] text-emerald-600">{selectedCount} dipilih</p>}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
