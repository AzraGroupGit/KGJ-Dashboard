// components/fields/DeliveryUpdateFormField.tsx
"use client";

import { sCls, iCls, lCls } from "./types";

export default function DeliveryUpdateFormField({
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
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div>
        <label className={lCls}>Status Pengiriman <span className="text-red-400">*</span></label>
        <select value={(value.status as string) ?? ""} onChange={(e) => upd("status", e.target.value)} disabled={disabled} className={sCls}>
          <option value="">Pilih status...</option>
          <option value="dispatched">Dikirim / Diambil Kurir</option>
          <option value="delivered">Terkirim / Diterima</option>
          <option value="failed">Gagal Terkirim</option>
          <option value="returned">Dikembalikan</option>
        </select>
      </div>
      <div>
        <label className={lCls}>Nomor Resi / Tracking</label>
        <input type="text" value={(value.tracking_number as string) ?? ""} onChange={(e) => upd("tracking_number", e.target.value)} placeholder="Nomor resi kurir" disabled={disabled} className={iCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Tgl. Dikirim</label>
          <input type="datetime-local" value={(value.dispatched_at as string) ?? ""} onChange={(e) => upd("dispatched_at", e.target.value)} disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>Tgl. Diterima</label>
          <input type="datetime-local" value={(value.delivered_at as string) ?? ""} onChange={(e) => upd("delivered_at", e.target.value)} disabled={disabled} className={iCls} />
        </div>
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
