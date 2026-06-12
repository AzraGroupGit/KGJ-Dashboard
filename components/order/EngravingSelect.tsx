"use client";

const OPTIONS = [
  { value: "Alphabet", label: "Alphabet" },
  { value: "Aksara Jawa", label: "Aksara Jawa" },
  { value: "Arab", label: "Arab" },
  { value: "Jepang Korea", label: "Jepang Korea" },
] as const;

const CUSTOM_VALUE = "__custom__";

export default function EngravingSelect({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const isCustom = value !== "" && !OPTIONS.some((o) => o.value === value);
  const selectedValue = isCustom ? CUSTOM_VALUE : value;
  const customText = isCustom && value !== CUSTOM_VALUE ? value : "";

  return (
    <div className="space-y-2">
      <select
        value={selectedValue}
        onChange={(e) =>
          onChange(
            e.target.value === CUSTOM_VALUE ? CUSTOM_VALUE : e.target.value,
          )
        }
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">{placeholder || "Pilih jenis ukiran"}</option>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Custom Ukiran</option>
      </select>

      {selectedValue === CUSTOM_VALUE && (
        <input
          type="text"
          value={customText}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik jenis ukiran..."
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
        />
      )}
    </div>
  );
}
