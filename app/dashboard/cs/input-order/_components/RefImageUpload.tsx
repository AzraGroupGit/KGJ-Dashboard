"use client";

import { useRef } from "react";
import { Image } from "lucide-react";

export function RefImageUpload({
  label,
  side,
  currentUrl,
  isUploading,
  onUpload,
}: {
  label: string;
  side: "pria" | "wanita";
  currentUrl: string | null;
  isUploading: boolean;
  onUpload: (side: "pria" | "wanita", file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(side, file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </p>
      <div
        className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        style={{ aspectRatio: "4/3" }}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={`Referensi ${label}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400">
            <Image aria-hidden="true" className="w-8 h-8" />
            <span className="text-xs">Klik untuk upload foto</span>
            <span className="text-[10px] text-gray-300">
              JPG / PNG / WebP · maks 5 MB
            </span>
          </div>
        )}

        {/* Overlay saat uploading */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Ganti foto badge (bila sudah ada gambar) */}
        {currentUrl && !isUploading && (
          <div className="absolute bottom-0 inset-x-0 bg-black/50 py-1.5 text-center">
            <span className="text-[10px] text-white font-medium">
              Klik untuk ganti foto
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
