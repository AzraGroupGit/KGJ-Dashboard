// components/ui/Alert.tsx

"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  message: string;
  description?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function Alert({
  type,
  message,
  description,
  onClose,
  autoClose = true,
  duration = 5000,
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  if (!isVisible) return null;

  const types = {
    success: {
      bg: "bg-[#c9a227]/10",
      border: "border-green-400",
      text: "text-green-800",
      titleText: "text-green-800",
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
    },
    error: {
      bg: "bg-red-500/[0.08]",
      border: "border-red-400",
      text: "text-red-800",
      titleText: "text-red-800",
      icon: <XCircle className="w-5 h-5 text-red-400" />,
    },
    warning: {
      bg: "bg-yellow-500/[0.08]",
      border: "border-yellow-400",
      text: "text-yellow-800",
      titleText: "text-yellow-800",
      icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    },
    info: {
      bg: "bg-[#c9a227]/10",
      border: "border-blue-400",
      text: "text-blue-800",
      titleText: "text-blue-800",
      icon: <Info className="w-5 h-5 text-blue-400" />,
    },
  };

  const current = types[type];

  return (
    <div
      className={`${current.bg} border-l-4 ${current.border} p-4 rounded-lg shadow-sm animate-slide-down`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{current.icon}</div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${current.titleText}`}>
            {message}
          </p>
          {description && (
            <p className={`text-sm mt-1 ${current.text}`}>{description}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="ml-auto flex-shrink-0"
          >
            <X className="w-4 h-4 text-white/30 hover:text-[#e8e2d4]" />
          </button>
        )}
      </div>
    </div>
  );
}
