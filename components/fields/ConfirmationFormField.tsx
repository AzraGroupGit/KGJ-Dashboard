// components/fields/ConfirmationFormField.tsx
"use client";

import { sCls, iCls, lCls } from "./types";

export default function ConfirmationFormField({
  value,
  onChange,
  disabled,
  error,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
  error?: string;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  const status = (value.confirmation_status as string) ?? "";
  const needsReason = status === "rejected" || status === "request_changes";

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Jenis Konfirmasi</label>
          <select value={(value.confirmation_type as string) ?? "initial"} onChange={(e) => upd("confirmation_type", e.target.value)} disabled={disabled} className={sCls}>
            <option value="initial">Konfirmasi Awal</option>
            <option value="follow_up">Follow Up</option>
          </select>
        </div>
        <div>
          <label className={lCls}>Metode Konfirmasi</label>
          <select value={(value.confirmation_method as string) ?? ""} onChange={(e) => upd("confirmation_method", e.target.value)} disabled={disabled} className={sCls}>
            <option value="">Pilih...</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Telepon</option>
            <option value="in_person">Tatap Muka</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>
      <div>
        <label className={lCls}>Status Konfirmasi <span className="text-red-400">*</span></label>
        <select value={status} onChange={(e) => upd("confirmation_status", e.target.value)} disabled={disabled} className={sCls}>
          <option value="">Pilih status...</option>
          <option value="approved">Disetujui Customer</option>
          <option value="rejected">Ditolak Customer</option>
          <option value="request_changes">Minta Perubahan</option>
          <option value="pending">Menunggu Konfirmasi</option>
        </select>
      </div>
      {needsReason && (
        <div>
          <label className={lCls}>Alasan / Permintaan Perubahan</label>
          <textarea value={(value.rejection_reason as string) ?? ""} onChange={(e) => upd("rejection_reason", e.target.value)} rows={2} disabled={disabled}
            placeholder="Deskripsikan alasan atau perubahan yang diminta..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50" />
        </div>
      )}
      {status === "approved" && (
        <div>
          <label className={lCls}>Waktu Konfirmasi</label>
          <input type="datetime-local" value={(value.confirmed_at as string) ?? ""} onChange={(e) => upd("confirmed_at", e.target.value)} disabled={disabled} className={iCls} />
        </div>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
