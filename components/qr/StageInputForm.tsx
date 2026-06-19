// components/qr/StageInputForm.tsx
"use client";

import { useState, useRef } from "react";

import type {
  MaterialRow,
  QualityRow,
  ComplRow,
  CertRow,
  PaymentRow,
  Field,
} from "@/components/fields/types";
import { ALL_TX_TYPES } from "@/components/fields/types";
import LeburBahanMaterialField from "@/components/fields/LeburBahanMaterialField";
import PembentukanMaterialField from "@/components/fields/PembentukanMaterialField";
import PemasanganPermataMaterialField from "@/components/fields/PemasanganPermataMaterialField";
import MaterialArrayField from "@/components/fields/MaterialArrayField";
import QualityChecklistField from "@/components/fields/QualityChecklistField";
import CompletenessListField from "@/components/fields/CompletenessListField";
import MultiSelectField from "@/components/fields/MultiSelectField";
import FileUploadField from "@/components/fields/FileUploadField";
import ConfirmationFormField from "@/components/fields/ConfirmationFormField";
import PackagingFormField from "@/components/fields/PackagingFormField";
import CertificateArrayField from "@/components/fields/CertificateArrayField";
import PaymentArrayField from "@/components/fields/PaymentArrayField";
import DeliveryFormField from "@/components/fields/DeliveryFormField";
import DeliveryUpdateFormField from "@/components/fields/DeliveryUpdateFormField";
import HandoverFormField from "@/components/fields/HandoverFormField";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageInputFormProps {
  fields: Field[];
  permissions: { can_submit: boolean; can_edit: boolean; can_reject: boolean };
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  stageType?: string;
  orderId?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

const COMPLEX_ARRAY_TYPES = new Set([
  "material_array",
  "certificate_array",
  "payment_array",
  "attachment_list",
]);
const COMPLEX_OBJ_TYPES = new Set([
  "confirmation_form",
  "packaging_form",
  "delivery_form",
  "delivery_update_form",
  "handover_form",
  "object",
]);
const SKIP_TYPES = new Set([
  "customer_selector",
  "gemstone_array",
  "attachment_list",
]);

function initField(field: Field, initial: Record<string, unknown>): unknown {
  const v = initial[field.name];
  if (
    field.type === "material_array" ||
    field.type === "certificate_array" ||
    field.type === "payment_array"
  )
    return Array.isArray(v) ? v : [];
  if (field.type === "attachment_list") return Array.isArray(v) ? v : [];
  if (field.type === "file") return v ?? "";
  if (field.type === "quality_checklist")
    return (field.items ?? []).map((item) => {
      const ex = (Array.isArray(v) ? (v as QualityRow[]) : []).find(
        (r) => r.check_key === item.key,
      );
      return {
        check_key: item.key,
        passed: ex?.passed ?? false,
        notes: ex?.notes ?? "",
      };
    });
  if (field.type === "completeness_list")
    return (field.items ?? []).map((item) => {
      const ex = (Array.isArray(v) ? (v as ComplRow[]) : []).find(
        (r) => r.item_key === item.key,
      );
      return {
        item_key: item.key,
        checked: ex?.checked ?? false,
        notes: ex?.notes ?? "",
      };
    });
  if (field.type === "multi_select")
    return Array.isArray(v) ? v : [];
  if (COMPLEX_OBJ_TYPES.has(field.type))
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  if (field.type === "boolean") return v ?? false;
  return v ?? "";
}

const SUBMIT_LABELS: Record<string, string> = {
  quality_checklist: "Simpan Hasil QC",
  select_action: "Konfirmasi",
  delivery: "Simpan Pengiriman",
  done: "Simpan & Lanjut",
};

export default function StageInputForm({
  fields,
  permissions,
  initialData,
  onSubmit,
  stageType,
  orderId,
}: StageInputFormProps) {
  const submitLabel = (stageType && SUBMIT_LABELS[stageType]) ?? "Simpan & Lanjut";
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const d: Record<string, unknown> = {};
    fields.forEach((f) => {
      d[f.name] = initField(f, initialData ?? {});
    });
    return d;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    fields.forEach((field) => {
      const v = formData[field.name];
      if (field.type === "material_array") {
        const rows = v as MaterialRow[];
        if (field.required && (!rows || rows.length === 0))
          errs[field.name] = `${field.label} wajib diisi (minimal 1 bahan)`;
        else
          for (let i = 0; i < (rows ?? []).length; i++)
            if (!rows[i].weight_grams || Number(rows[i].weight_grams) <= 0) {
              errs[field.name] = `Bahan #${i + 1}: berat harus diisi`;
              break;
            }
        return;
      }
      if (field.type === "payment_array") {
        const rows = v as PaymentRow[];
        if (field.required && (!rows || rows.length === 0))
          errs[field.name] = "Minimal 1 pembayaran harus diisi";
        else
          for (let i = 0; i < (rows ?? []).length; i++)
            if (!rows[i].amount || Number(rows[i].amount) <= 0) {
              errs[field.name] = `Pembayaran #${i + 1}: jumlah harus > 0`;
              break;
            }
        return;
      }
      if (field.type === "confirmation_form") {
        if (field.required && !(v as Record<string, unknown>)?.confirmation_status)
          errs[field.name] = "Status konfirmasi wajib dipilih";
        return;
      }
      if (field.type === "delivery_update_form") {
        if (field.required && !(v as Record<string, unknown>)?.status)
          errs[field.name] = "Status pengiriman wajib dipilih";
        return;
      }
      if (
        SKIP_TYPES.has(field.type) ||
        COMPLEX_OBJ_TYPES.has(field.type) ||
        field.type === "quality_checklist" ||
        field.type === "completeness_list" ||
        field.type === "multi_select" ||
        field.type === "certificate_array"
      )
        return;
      if (field.required && !v && v !== false)
        errs[field.name] = `${field.label} wajib diisi`;
      if (field.type === "number" && v !== "" && v !== null) {
        const n = Number(v);
        if (field.min !== undefined && n < field.min)
          errs[field.name] = `Minimal ${field.min} ${field.unit || ""}`;
        if (field.max !== undefined && n > field.max)
          errs[field.name] = `Maksimal ${field.max} ${field.unit || ""}`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!validate() || !permissions.can_submit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch {
      /* handled by parent */
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  if (fields.filter((f) => !SKIP_TYPES.has(f.type)).length === 0) {
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
        {/* Sticky progress bar */}
        {(() => {
          const visible = fields.filter((f) => !SKIP_TYPES.has(f.type));
          if (visible.length < 2) return null;
          const filled = visible.filter((f) => {
            const v = formData[f.name];
            if (v == null || v === "") return false;
            if (Array.isArray(v)) return v.length > 0;
            if (typeof v === "object") return Object.keys(v as object).length > 0;
            return true;
          }).length;
          return (
            <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 pt-4 pb-2 rounded-t-2xl bg-white/95 backdrop-blur-sm border-b border-stone-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-stone-500">
                  Progress Input
                </span>
                <span className="text-[11px] font-semibold text-stone-600 tabular-nums">
                  {filled}/{visible.length} terisi
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${(filled / visible.length) * 100}%` }}
                />
              </div>
            </div>
          );
        })()}

        {fields.map((field) => {
          if (SKIP_TYPES.has(field.type)) return null;

          return (
            <div key={field.name}>
              {/* Skip label for complex field types that have their own internal labels */}
              {!COMPLEX_OBJ_TYPES.has(field.type) &&
                field.type !== "quality_checklist" &&
                field.type !== "completeness_list" &&
                field.type !== "material_array" &&
                field.type !== "certificate_array" &&
                field.type !== "payment_array" &&
                field.type !== "file" && (
                  <label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                    {field.label}
                    {field.required && <span className="text-red-400">*</span>}
                  </label>
                )}
              {/* Section header for complex types */}
              {(COMPLEX_OBJ_TYPES.has(field.type) ||
                field.type === "quality_checklist" ||
                field.type === "completeness_list" ||
                field.type === "material_array" ||
                field.type === "certificate_array" ||
                field.type === "payment_array") && (
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  {field.label}
                  {field.required && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </p>
              )}

              {/* ── Primitive types ── */}
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

              {(field.type === "date" || field.type === "time") && (
                <input
                  type={field.type}
                  value={String(formData[field.name] ?? "")}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  disabled={!permissions.can_edit}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-4 text-[15px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}

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
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}

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

              {field.type === "boolean" && (
                <button
                  type="button"
                  onClick={() => updateField(field.name, !formData[field.name])}
                  disabled={!permissions.can_edit}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${formData[field.name] ? "bg-amber-500" : "bg-stone-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${formData[field.name] ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              )}

              {/* ── Complex types ── */}
              {field.type === "material_array" && (
                <>
                  {field.transactionTypes?.length === 3 &&
                  field.transactionTypes.includes("input") &&
                  field.transactionTypes.includes("output") &&
                  field.transactionTypes.includes("waste") ? (
                    <PembentukanMaterialField
                      value={(formData[field.name] as MaterialRow[]) ?? []}
                      onChange={(rows) => updateField(field.name, rows)}
                      disabled={!permissions.can_edit}
                      error={errors[field.name]}
                    />
                  ) : field.transactionTypes?.length === 2 &&
                    field.transactionTypes.includes("output") &&
                    field.transactionTypes.includes("waste") &&
                    !field.transactionTypes.includes("input") ? (
                    <LeburBahanMaterialField
                      value={(formData[field.name] as MaterialRow[]) ?? []}
                      onChange={(rows) => updateField(field.name, rows)}
                      disabled={!permissions.can_edit}
                      error={errors[field.name]}
                    />
                  ) : field.transactionTypes?.length === 2 &&
                    field.transactionTypes.includes("input") &&
                    field.transactionTypes.includes("output") &&
                    !field.transactionTypes.includes("waste") ? (
                    <PemasanganPermataMaterialField
                      value={(formData[field.name] as MaterialRow[]) ?? []}
                      onChange={(rows) => updateField(field.name, rows)}
                      disabled={!permissions.can_edit}
                      error={errors[field.name]}
                    />
                  ) : (
                    <MaterialArrayField
                      value={(formData[field.name] as MaterialRow[]) ?? []}
                      onChange={(rows) => updateField(field.name, rows)}
                      transactionTypes={field.transactionTypes ?? ALL_TX_TYPES}
                      disabled={!permissions.can_edit}
                      error={errors[field.name]}
                    />
                  )}
                </>
              )}

              {field.type === "quality_checklist" && (
                <QualityChecklistField
                  items={field.items ?? []}
                  value={(formData[field.name] as QualityRow[]) ?? []}
                  onChange={(rows) => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "completeness_list" && (
                <CompletenessListField
                  items={field.items ?? []}
                  value={(formData[field.name] as ComplRow[]) ?? []}
                  onChange={(rows) => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "multi_select" && (
                <MultiSelectField
                  options={field.options ?? []}
                  value={(formData[field.name] as string[]) ?? []}
                  onChange={(vals) => updateField(field.name, vals)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "file" && (
                <FileUploadField
                  label={field.label}
                  value={String(formData[field.name] ?? "")}
                  accept={field.accept}
                  maxSize={field.maxSize}
                  disabled={!permissions.can_edit}
                  orderId={orderId}
                  fieldName={field.name}
                  error={errors[field.name]}
                  onChange={(url) => updateField(field.name, url)}
                />
              )}

              {field.type === "certificate_array" && (
                <CertificateArrayField
                  value={(formData[field.name] as CertRow[]) ?? []}
                  onChange={(rows) => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "payment_array" && (
                <PaymentArrayField
                  value={(formData[field.name] as PaymentRow[]) ?? []}
                  onChange={(rows) => updateField(field.name, rows)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "confirmation_form" && (
                <ConfirmationFormField
                  value={(formData[field.name] as Record<string, unknown>) ?? {}}
                  onChange={(v) => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "packaging_form" && (
                <PackagingFormField
                  value={(formData[field.name] as Record<string, unknown>) ?? {}}
                  onChange={(v) => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                />
              )}

              {field.type === "delivery_form" && (
                <DeliveryFormField
                  value={(formData[field.name] as Record<string, unknown>) ?? {}}
                  onChange={(v) => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                />
              )}

              {field.type === "delivery_update_form" && (
                <DeliveryUpdateFormField
                  value={(formData[field.name] as Record<string, unknown>) ?? {}}
                  onChange={(v) => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                  error={errors[field.name]}
                />
              )}

              {field.type === "handover_form" && (
                <HandoverFormField
                  value={(formData[field.name] as Record<string, unknown>) ?? {}}
                  onChange={(v) => updateField(field.name, v)}
                  disabled={!permissions.can_edit}
                />
              )}

              {/* Error for primitive types */}
              {!COMPLEX_ARRAY_TYPES.has(field.type) &&
                !COMPLEX_OBJ_TYPES.has(field.type) &&
                field.type !== "quality_checklist" &&
                field.type !== "completeness_list" &&
                field.type !== "multi_select" &&
                field.type !== "file" &&
                errors[field.name] && (
                  <p className="mt-1 text-[12px] text-red-500">
                    {errors[field.name]}
                  </p>
                )}
            </div>
          );
        })}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {permissions.can_reject && (
            <button
              type="button"
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-red-200 bg-white py-2.5 text-[14px] font-medium text-red-600 transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
              onClick={() => {
                if (confirm("Tolak hasil tahap ini?")) {
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
                submitLabel
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
