// components/fields/FileUploadField.tsx
"use client";

import { useState, useRef } from "react";
import { Image } from "lucide-react";

export default function FileUploadField({
  label,
  value,
  accept,
  maxSize,
  disabled,
  orderId,
  fieldName,
  error,
  onChange,
}: {
  label: string;
  value: string;
  accept?: string;
  maxSize?: number;
  disabled: boolean;
  orderId?: string;
  fieldName: string;
  error?: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (maxSize && file.size > maxSize) {
      alert(`Ukuran file maksimal ${Math.round(maxSize / 1024 / 1024)} MB`);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("order_id", orderId ?? "");
      fd.append("field_name", fieldName);
      const res = await fetch("/api/stages/upload", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah");
      onChange(body.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengunggah gambar");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-32 w-32 rounded-xl object-cover border border-stone-200" />
          {!disabled && (
            <button type="button" onClick={handleRemove} className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow hover:bg-red-600 transition-colors">✕</button>
          )}
        </div>
      ) : (
        <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 px-4 transition-colors ${
          uploading ? "border-amber-300 bg-amber-50/50" : "border-stone-200 bg-stone-50/50 hover:border-amber-300 hover:bg-amber-50/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
          {uploading ? (
            <div className="flex items-center gap-2 text-[13px] text-amber-700">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
              Mengunggah...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Image aria-hidden="true" className="h-8 w-8 text-stone-300" />
              <span className="text-[13px] text-stone-500">Klik untuk upload foto</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept={accept ?? "image/*"} onChange={handleFile} disabled={disabled || uploading} className="hidden" />
        </label>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
