// components/qr/StageInputForm.tsx

"use client";

import { useState, FormEvent, useRef } from "react";

interface Field {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "boolean" | "file";
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
}

interface StageInputFormProps {
  fields: Field[];
  permissions: {
    can_submit: boolean;
    can_edit: boolean;
    can_reject: boolean;
  };
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export default function StageInputForm({
  fields,
  permissions,
  initialData = {},
  onSubmit,
}: StageInputFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    fields.forEach((field) => {
      defaults[field.name] =
        initialData[field.name] ?? (field.type === "boolean" ? false : "");
    });
    return defaults;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const value = formData[field.name];
      if (field.required && !value && value !== false) {
        newErrors[field.name] = `${field.label} wajib diisi`;
      }
      if (field.type === "number" && value !== "" && value !== null) {
        const num = Number(value);
        if (field.min !== undefined && num < field.min) {
          newErrors[field.name] = `Minimal ${field.min} ${field.unit || ""}`;
        }
        if (field.max !== undefined && num > field.max) {
          newErrors[field.name] = `Maksimal ${field.max} ${field.unit || ""}`;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || !permissions.can_submit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  if (fields.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/90 p-7 shadow-sm text-center">
        <p className="text-stone-400 text-[14px]">
          Tidak ada data yang perlu diinput untuk tahap ini.
        </p>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm p-6 shadow-sm space-y-4"
      >
        {fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-stone-400">
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>

            {/* Text Input */}
            {field.type === "text" && (
              <input
                type="text"
                value={String(formData[field.name] ?? "")}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={!permissions.can_edit}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            )}

            {/* Number Input */}
            {field.type === "number" && (
              <div className="relative">
                <input
                  type="number"
                  value={String(formData[field.name] ?? "")}
                  onChange={(e) =>
                    updateField(
                      field.name,
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step="any"
                  disabled={!permissions.can_edit}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 pr-12 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {field.unit && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-stone-400 font-medium">
                    {field.unit}
                  </span>
                )}
              </div>
            )}

            {/* Select */}
            {field.type === "select" && field.options && (
              <select
                value={String(formData[field.name] ?? "")}
                onChange={(e) => updateField(field.name, e.target.value)}
                disabled={!permissions.can_edit}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="">Pilih...</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {/* Textarea */}
            {field.type === "textarea" && (
              <textarea
                value={String(formData[field.name] ?? "")}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                disabled={!permissions.can_edit}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            )}

            {/* Boolean / Toggle */}
            {field.type === "boolean" && (
              <button
                type="button"
                onClick={() => updateField(field.name, !formData[field.name])}
                disabled={!permissions.can_edit}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  formData[field.name] ? "bg-amber-500" : "bg-stone-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    formData[field.name] ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            )}

            {/* Error */}
            {errors[field.name] && (
              <p className="mt-1 text-[12px] text-red-500">
                {errors[field.name]}
              </p>
            )}
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {permissions.can_reject && (
            <button
              type="button"
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-red-200 bg-white py-2.5 text-[14px] font-medium text-red-600 transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
              onClick={() => {
                if (confirm("Tolak hasil tahap ini?")) {
                  // Handle reject logic
                }
              }}
            >
              Tolak
            </button>
          )}
          {permissions.can_submit && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-stone-800 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-stone-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      fill="currentColor"
                      className="opacity-75"
                    />
                  </svg>
                  Menyimpan...
                </span>
              ) : (
                "Simpan Data"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
