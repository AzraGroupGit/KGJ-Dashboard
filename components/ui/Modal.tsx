// components/ui/Modal.tsx

"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal card — flex column, capped height so footer never goes off-screen */}
      <div
        ref={modalRef}
        className={`${sizes[size]} w-full bg-[#2a2522] rounded-xl shadow-xl flex flex-col max-h-[90vh] relative z-10`}
      >
        {/* Header — never scrolls */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#c9a227]/10 flex-shrink-0">
          <h3 className="text-xl font-semibold text-[#f0f4ff]">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-white/30 hover:text-[#e8e2d4] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Body — scrolls when content overflows */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer — pinned, never scrolls */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#c9a227]/10 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
