// components/qr/LoadingSplas.tsx

"use client";

import { useEffect, useState } from "react";

interface LoadingSplashProps {
  message?: string;
}

export default function LoadingSplash({
  message = "Memuat...",
}: LoadingSplashProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Animated ring */}
      <div className="relative mb-8">
        <div className="h-16 w-16 rounded-full border-2 border-stone-200 border-t-amber-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border border-stone-100" />
      </div>

      <p className="text-[14px] text-stone-400 font-medium tracking-wide">
        {message}
        <span className="inline-block w-5 text-left">{dots}</span>
      </p>
    </div>
  );
}
