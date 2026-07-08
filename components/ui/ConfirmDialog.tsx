// components/ui/ConfirmDialog.tsx

"use client";

import { useEffect } from "react";
import { AlertTriangle, Info, LogOut, Loader2 } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig = {
  danger: {
    iconBg: "bg-red-500/[0.08]",
    iconColor: "text-red-300",
    iconRing: "ring-red-100",
    confirmBg:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800",
    confirmRing: "focus:ring-red-500",
    icon: <LogOut className="w-6 h-6" />,
  },
  warning: {
    iconBg: "bg-yellow-500/[0.08]",
    iconColor: "text-yellow-600",
    iconRing: "ring-yellow-100",
    confirmBg:
      "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600",
    confirmRing: "focus:ring-yellow-500",
    icon: <AlertTriangle className="w-6 h-6" />,
  },
  info: {
    iconBg: "bg-[#c9a227]/10",
    iconColor: "text-[#c9a227]",
    iconRing: "ring-[#c9a227]/10",
    confirmBg:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
    confirmRing: "focus:ring-[#c9a227]",
    icon: <Info className="w-6 h-6" />,
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "info",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, isLoading, onCancel]);

  // Lock scroll body saat dialog terbuka
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-fade-in"
        onClick={() => !isLoading && onCancel()}
      />

      {/* Dialog */}
      <div className="relative bg-[#2a2522] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full ${config.iconBg} ${config.iconColor} ring-8 ${config.iconRing} flex items-center justify-center flex-shrink-0`}
            >
              {config.icon}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold text-[#f0f4ff] mb-1"
              >
                {title}
              </h3>
              <p className="text-sm text-white/40 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#1C1917] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#e8e2d4] bg-[#2a2522] border border-[#c9a227]/10 rounded-lg hover:bg-[#1C1917] hover:border-[#c9a227]/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white ${config.confirmBg} rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${config.confirmRing} focus:ring-offset-1 min-w-[88px] flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
