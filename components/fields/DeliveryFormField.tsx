// components/fields/DeliveryFormField.tsx
"use client";

import { sCls, iCls, lCls } from "./types";

export default function DeliveryFormField({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const upd = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  const method = (value.delivery_method as string) ?? "pickup_store";
  const needsCourier = method !== "pickup_store";

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-3 space-y-3">
      <div>
        <label className={lCls}>Metode Pengiriman</label>
        <select value={method} onChange={(e) => upd("delivery_method", e.target.value)} disabled={disabled} className={sCls}>
          <option value="pickup_store">Ambil di Toko</option>
          <option value="courier_local">Kurir Lokal</option>
          <option value="courier_intercity">Kurir Antar Kota</option>
          <option value="in_house_delivery">Antar ke Rumah</option>
          <option value="other">Lainnya</option>
        </select>
      </div>
      {needsCourier && (
        <div>
          <label className={lCls}>Nama Kurir / Ekspedisi</label>
          <input type="text" value={(value.courier_name as string) ?? ""} onChange={(e) => upd("courier_name", e.target.value)} placeholder="Contoh: JNE, Gojek" disabled={disabled} className={iCls} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Nama Penerima</label>
          <input type="text" value={(value.recipient_name as string) ?? ""} onChange={(e) => upd("recipient_name", e.target.value)} disabled={disabled} className={iCls} />
        </div>
        <div>
          <label className={lCls}>No. Telepon</label>
          <input type="text" value={(value.recipient_phone as string) ?? ""} onChange={(e) => upd("recipient_phone", e.target.value)} placeholder="08xx" disabled={disabled} className={iCls} />
        </div>
      </div>
      {needsCourier && (
        <div>
          <label className={lCls}>Alamat Pengiriman</label>
          <textarea value={(value.delivery_address as string) ?? ""} onChange={(e) => upd("delivery_address", e.target.value)} rows={2} disabled={disabled}
            className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none disabled:opacity-50" />
        </div>
      )}
      <div>
        <label className={lCls}>Catatan Pengiriman</label>
        <input type="text" value={(value.notes as string) ?? ""} onChange={(e) => upd("notes", e.target.value)} placeholder="Opsional" disabled={disabled} className={iCls} />
      </div>
    </div>
  );
}
