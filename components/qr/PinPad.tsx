"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface PinPadProps {
  onSubmit: (pin: string) => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
  workerName: string;
  remainingAttempts: number | null;
}

export default function PinPad({
  onSubmit,
  onBack,
  isLoading,
  error,
  workerName,
  remainingAttempts,
}: PinPadProps) {
  const [pin, setPin] = useState<string[]>([]);
  const pinLength = 6;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < pinLength && !isLoading) {
        setPin((prev) => [...prev, digit]);
      }
    },
    [pin.length, isLoading],
  );

  const handleDelete = useCallback(() => {
    if (!isLoading) {
      setPin((prev) => prev.slice(0, -1));
    }
  }, [isLoading]);

  const handleClear = useCallback(() => {
    if (!isLoading) {
      setPin([]);
    }
  }, [isLoading]);

  const handleSubmit = useCallback(() => {
    if (pin.length === pinLength && !isLoading) {
      onSubmit(pin.join(""));
    }
  }, [pin, pinLength, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleDelete();
      } else if (e.key === "Enter" && pin.length === pinLength) {
        handleSubmit();
      } else if (e.key === "Escape") {
        handleClear();
      }
    },
    [handleDigit, handleDelete, handleSubmit, handleClear, pin.length],
  );

  const digits = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", ""],
  ];

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="outline-none"
    >
      {/* Worker name */}
      <div className="mb-6 text-center">
        <p className="text-[11px] uppercase tracking-wider text-stone-400">
          Masukkan PIN
        </p>
        <p className="mt-1 text-xl font-semibold text-stone-800">
          {workerName}
        </p>
      </div>

      {/* PIN dots display */}
      <div className="mb-8 flex justify-center gap-3">
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-lg font-bold transition-all ${
              i < pin.length
                ? "border-stone-800 bg-stone-800 text-white"
                : "border-stone-200 bg-white text-transparent"
            }`}
          >
            {i < pin.length ? "●" : "○"}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-2.5 text-center text-[13px] text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {/* Remaining attempts */}
      {remainingAttempts !== null && remainingAttempts > 0 && (
        <p className="mb-4 text-center text-[12px] text-amber-600">
          Sisa percobaan: {remainingAttempts}
        </p>
      )}

      {/* Numpad */}
      <div className="mx-auto max-w-[260px]">
        {digits.map((row, rowIdx) => (
          <div key={rowIdx} className="mb-3 flex justify-center gap-3">
            {row.map((digit, colIdx) => {
              if (rowIdx === 3 && colIdx === 0) {
                return (
                  <button
                    key="clear"
                    type="button"
                    onClick={handleClear}
                    disabled={isLoading || pin.length === 0}
                    className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-stone-200 bg-white text-[13px] font-medium text-stone-400 transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.95] disabled:opacity-30"
                  >
                    Hapus
                  </button>
                );
              }
              if (rowIdx === 3 && colIdx === 2) {
                return (
                  <button
                    key="submit"
                    type="button"
                    onClick={handleSubmit}
                    disabled={pin.length !== pinLength || isLoading}
                    className="flex h-16 w-16 items-center justify-center rounded-xl bg-stone-800 text-white shadow-sm transition-all hover:bg-stone-900 active:scale-[0.95] disabled:opacity-30"
                  >
                    {isLoading ? (
                      <svg
                        className="h-5 w-5 animate-spin"
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
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </button>
                );
              }
              if (digit === "" && rowIdx === 0) {
                return <div key={`empty-${colIdx}`} className="h-16 w-16" />;
              }
              if (digit === "" && rowIdx === 1) {
                return <div key={`empty-${colIdx}`} className="h-16 w-16" />;
              }
              if (digit === "" && rowIdx === 2) {
                return <div key={`empty-${colIdx}`} className="h-16 w-16" />;
              }
              return (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  disabled={isLoading}
                  className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-stone-200 bg-white text-[22px] font-semibold text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.95] disabled:opacity-50"
                >
                  {digit}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Backspace */}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pin.length === 0 || isLoading}
          className="flex h-12 w-[148px] items-center justify-center gap-1.5 rounded-xl border-2 border-stone-200 bg-white text-[14px] font-medium text-stone-500 transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.95] disabled:opacity-30"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z"
            />
          </svg>
          Hapus
        </button>
      </div>

      {/* Back to worker select */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="text-[13px] text-stone-400 underline underline-offset-2 transition-colors hover:text-stone-600 disabled:opacity-40"
        >
          ← Kembali ke daftar pekerja
        </button>
      </div>
    </div>
  );
}
