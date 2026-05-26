"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function AddsOnAccordion({
  label,
  items,
  selected,
  onChange,
  disabled,
  prefix,
}: {
  label: string;
  items: { key: string; label: string }[];
  selected: string[];
  onChange: (arr: string[]) => void;
  disabled?: boolean;
  prefix: string;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.filter((s) => s.startsWith(prefix)).length;

  const toggle = (key: string) => {
    if (disabled) return;
    const arr = selected.includes(key)
      ? selected.filter((f) => f !== key)
      : [...selected, key];
    onChange(arr);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-left bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          {count > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-slate-800 text-[10px] font-bold text-white px-1.5">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 py-2.5 bg-slate-50/50">
          {items.length === 0 && (
            <p className="text-xs text-slate-400 italic">
              Pilih {label.toLowerCase()} di atas terlebih dahulu
            </p>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {items.map((item) => (
              <label
                key={item.key}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  disabled
                    ? "cursor-default"
                    : "cursor-pointer hover:bg-white"
                } ${selected.includes(item.key) ? "bg-white ring-1 ring-slate-300" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.key)}
                  onChange={() => toggle(item.key)}
                  disabled={disabled}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
