"use client";

import { useState } from "react";

const FONT_OPTIONS = [
  { value: "Alex Brush", family: "'Alex Brush', cursive", label: "Alex Brush" },
  {
    value: "Brush Script",
    family: "'Brush Script MT', 'Brush Script Std', cursive",
    label: "Brush Script",
  },
  {
    value: "Faradisa Script",
    family: "'Faradisa Script', cursive",
    label: "Faradisa Script",
  },
  {
    value: "Kingsman Demo",
    family: "'Kingsman Demo', serif",
    label: "Kingsman Demo",
  },
  { value: "Pristina", family: "'Pristina', serif", label: "Pristina" },
  {
    value: "Palatino Linotype",
    family: "'Palatino Linotype', 'Palatino', serif",
    label: "Palatino Linotype",
  },
  { value: "Gabriola", family: "'Gabriola', serif", label: "Gabriola" },
  { value: "Constantia", family: "'Constantia', serif", label: "Constantia" },
] as const;

const CUSTOM_VALUE = "__custom__";

export default function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = value !== "" && !FONT_OPTIONS.some((f) => f.value === value);
  const selectedValue = isCustom ? CUSTOM_VALUE : value;
  const customText = isCustom && value !== CUSTOM_VALUE ? value : "";
  const matchedFont = FONT_OPTIONS.find((f) => f.value === selectedValue);

  const [previewText, setPreviewText] = useState("");

  return (
    <div className="space-y-3">
      <select
        value={selectedValue}
        onChange={(e) =>
          onChange(
            e.target.value === CUSTOM_VALUE ? CUSTOM_VALUE : e.target.value,
          )
        }
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <option value="" disabled>
          Pilih font
        </option>
        <optgroup label="Gratis (8)">
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Berbayar">
          <option value={CUSTOM_VALUE}>Custom Font</option>
        </optgroup>
      </select>
      <p className="text-[11px] text-slate-400">
        8 font gratis tersedia. Font kustom (berbayar) dikenakan biaya tambahan.
      </p>

      {selectedValue === CUSTOM_VALUE && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Nama Font Kustom
          </label>
          <input
            type="text"
            value={customText}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Masukkan nama font..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      )}

      {selectedValue && selectedValue !== CUSTOM_VALUE && (
        <div className="space-y-2">
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Ketik sesuatu untuk preview font..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          {previewText && (
            <div
              className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-center"
              style={{ fontFamily: matchedFont?.family }}
            >
              <p className="text-xl text-slate-800 break-words">
                {previewText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
