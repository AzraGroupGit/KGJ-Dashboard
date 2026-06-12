"use client";

const GROUPS = [
  {
    label: "Perak",
    options: [{ value: "Perak", label: "Perak" }],
  },
  {
    label: "Palladium",
    options: [
      { value: "PD-5", label: "PD-5" },
      { value: "PD-10", label: "PD-10" },
      { value: "PD-25", label: "PD-25" },
      { value: "PD-50", label: "PD-50" },
    ],
  },
  {
    label: "Platinum",
    options: [{ value: "White Rock Platinum", label: "White Rock Platinum" }],
  },
  {
    label: "Emas Putih Premium",
    options: [
      { value: "Emas Putih Premium 3K", label: "3K" },
      { value: "Emas Putih Premium 6K", label: "6K" },
      { value: "Emas Putih Premium 9K", label: "9K" },
      { value: "Emas Putih Premium 12K", label: "12K" },
      { value: "Emas Putih Premium 18K", label: "18K" },
    ],
  },
  {
    label: "Signature Premium",
    options: [
      { value: "Signature Premium 9K", label: "9K" },
      { value: "Signature Premium 12K", label: "12K" },
      { value: "Signature Premium 18K", label: "18K" },
    ],
  },
  {
    label: "Yellow Gold",
    options: [
      { value: "Yellow Gold 6K", label: "6K" },
      { value: "Yellow Gold 9K", label: "9K" },
      { value: "Yellow Gold 12K", label: "12K" },
      { value: "Yellow Gold 18K", label: "18K" },
    ],
  },
  {
    label: "Rose Gold",
    options: [
      { value: "Rose Gold 6K", label: "6K" },
      { value: "Rose Gold 9K", label: "9K" },
      { value: "Rose Gold 12K", label: "12K" },
      { value: "Rose Gold 18K", label: "18K" },
    ],
  },
] as const;

export default function MaterialSelect({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
    >
      <option value="">{placeholder || "Pilih bahan"}</option>
      {GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
