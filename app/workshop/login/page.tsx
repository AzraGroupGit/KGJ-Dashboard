"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandHeader from "@/components/qr/BrandHeader";
import LoginForm from "@/components/qr/LoginForm";
import WorkerSelect from "@/components/qr/WorkerSelect";
import PinPad from "@/components/qr/PinPad";
import { getDashboardPath } from "@/lib/routes";

type Step = "loading" | "workers" | "pin" | "setup" | "manual";

interface WorkerInfo {
  id: string;
  full_name: string;
  username: string;
  has_pin?: boolean;
}

const PIN_LENGTH = 6;

function PinDots({ filled }: { filled: number }) {
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <div
          key={i}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-lg font-bold transition-all ${
            i < filled
              ? "border-stone-800 bg-stone-800 text-white"
              : "border-stone-200 bg-white text-transparent"
          }`}
        >
          {i < filled ? "●" : "○"}
        </div>
      ))}
    </div>
  );
}

function Numpad({
  onDigit, onClear, onSubmit, disabled, showSubmit,
}: {
  onDigit: (d: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  disabled: boolean;
  showSubmit: boolean;
}) {
  return (
    <div className="mx-auto max-w-[260px]">
      {[
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        ["", "0", ""],
      ].map((row, rowIdx) => (
        <div key={rowIdx} className="mb-3 flex justify-center gap-3">
          {row.map((digit, colIdx) => {
            if (rowIdx === 3 && colIdx === 0) {
              return (
                <button
                  key="clear"
                  type="button"
                  onClick={onClear}
                  disabled={disabled}
                  className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-stone-200 bg-white text-[13px] font-medium text-stone-400 transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.95] disabled:opacity-30"
                >
                  Hapus
                </button>
              );
            }
            if (rowIdx === 3 && colIdx === 2) {
              return showSubmit ? (
                <button
                  key="submit"
                  type="button"
                  onClick={onSubmit}
                  disabled={disabled}
                  className="flex h-16 w-16 items-center justify-center rounded-xl bg-stone-800 text-white shadow-sm transition-all hover:bg-stone-900 active:scale-[0.95] disabled:opacity-30"
                >
                  {disabled ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ) : (
                <div key="sp" className="h-16 w-16" />
              );
            }
            if (digit === "") return <div key={`e-${colIdx}`} className="h-16 w-16" />;
            return (
              <button
                key={digit}
                type="button"
                onClick={() => onDigit(digit)}
                disabled={disabled}
                className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-stone-200 bg-white text-[22px] font-semibold text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.95] disabled:opacity-50"
              >
                {digit}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WorkshopLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect") || "/workshop/input";
  const orderId = searchParams.get("order_id");
  const stage = searchParams.get("stage");
  const qrToken = searchParams.get("qr_token");

  const [step, setStep] = useState<Step>(qrToken ? "workers" : "manual");
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Setup state
  const [setupPin, setSetupPin] = useState("");
  const [setupPhase, setSetupPhase] = useState<"enter" | "confirm">("enter");
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const setupNewPinRef = useRef("");

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Helpers to redirect after login ─────────────────────────────

  const doRedirect = useCallback(
    (roleName: string, roleGroup: string) => {
      const SUPERVISOR_ROLE_NAMES = ["operational_supervisor", "production_supervisor"];
      if (SUPERVISOR_ROLE_NAMES.includes(roleName) || roleGroup === "management") {
        const path = getDashboardPath(roleName) || "/dashboard/supervisor/monitoring";
        router.push(path);
        router.refresh();
        return;
      }

      const params = new URLSearchParams();
      if (orderId) params.set("order_id", orderId);
      if (stage) params.set("stage", stage);
      if (qrToken) params.set("qr_token", qrToken);
      const targetUrl = `${redirectTo}?${params.toString()}`;
      router.push(targetUrl);
      router.refresh();
    },
    [router, redirectTo, orderId, stage, qrToken],
  );

  // ── Manual login handler (username + password) ──────────────────

  const handleManualLogin = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/qr-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Login gagal");
        }

        doRedirect(data.user?.role ?? "", data.user?.roleDetail?.role_group ?? "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [doRedirect],
  );

  // Fetch workers on mount
  useEffect(() => {
    if (!qrToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/workshop/workers?qr_token=${encodeURIComponent(qrToken)}`);
        const data = await res.json();
        if (data.success && data.data?.workers) {
          setWorkers(data.data.workers);
        }
        if (data.error) {
          setError(data.error);
        }
      } catch {
        setError("Gagal memuat daftar pekerja");
      }
    })();
  }, [qrToken]);

  // ── PIN login handler ──────────────────────────────────────────

  const handlePinLogin = useCallback(
    async (pin: string) => {
      if (!selectedWorker || !qrToken) return;
      setIsLoading(true);
      setError(null);
      setRemainingAttempts(null);

      try {
        const res = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: selectedWorker.id,
            pin,
            qr_token: qrToken,
          }),
        });

        const data = await res.json();

        // If PIN needs setup, show setup screen
        if (data.needs_pin_setup) {
          setStep("setup");
          setSetupPhase("enter");
          setSetupPin("");
          setSetupError(null);
          return;
        }

        if (!res.ok) {
          if (data.remaining_attempts !== undefined) {
            setRemainingAttempts(data.remaining_attempts);
          }
          throw new Error(data.error || "Login gagal");
        }

        // Successful PIN login — redirect
        doRedirect(data.user?.role ?? "", data.user?.roleDetail?.role_group ?? "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedWorker, qrToken, doRedirect],
  );

  // ── PIN setup handler (single API call with setup_pin) ──────────

  const submitPinSetup = useCallback(
    async (newPin: string) => {
      if (!selectedWorker || !qrToken) return;
      setSetupSubmitting(true);
      setSetupError(null);

      try {
        const res = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: selectedWorker.id,
            pin: newPin,
            qr_token: qrToken,
            setup_pin: newPin,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Gagal menyimpan PIN");
        }

        // Success — redirect
        doRedirect(data.user?.role ?? "", data.user?.roleDetail?.role_group ?? "");
      } catch (err) {
        setSetupError(
          err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi",
        );
      } finally {
        setSetupSubmitting(false);
      }
    },
    [selectedWorker, qrToken, doRedirect],
  );

  // ── Step transitions ───────────────────────────────────────────

  const handleSelectWorker = useCallback((worker: WorkerInfo) => {
    setSelectedWorker(worker);
    if (worker.has_pin === false) {
      setStep("setup");
      setSetupPhase("enter");
      setSetupPin("");
      setSetupError(null);
    } else {
      setStep("pin");
    }
    setError(null);
    setRemainingAttempts(null);
  }, []);

  const handleBackToWorkers = useCallback(() => {
    setStep("workers");
    setSelectedWorker(null);
    setError(null);
    setRemainingAttempts(null);
  }, []);

  const handleBackFromSetup = useCallback(() => {
    setStep("workers");
    setSelectedWorker(null);
    setSetupPin("");
    setSetupError(null);
    setSetupPhase("enter");
  }, []);

  const handleSwitchToManual = useCallback(() => {
    setStep("manual");
    setError(null);
    setRemainingAttempts(null);
  }, []);

  const handleBackFromManual = useCallback(() => {
    setStep(qrToken ? "workers" : "manual");
    setError(null);
  }, [qrToken]);

  // ── Setup PIN input handling ───────────────────────────────────

  const handleSetupDigit = useCallback((d: string) => {
    setSetupPin((prev) => (prev.length < PIN_LENGTH ? prev + d : prev));
  }, []);

  const handleSetupClear = useCallback(() => {
    setSetupPin("");
  }, []);

  const handleSetupDelete = useCallback(() => {
    setSetupPin((prev) => prev.slice(0, -1));
  }, []);

  // Auto-advance setup when PIN is full
  useEffect(() => {
    if (setupSubmitting || setupPin.length !== PIN_LENGTH) return;

    if (setupPhase === "enter") {
      setupNewPinRef.current = setupPin;
      setSetupPin("");
      setSetupPhase("confirm");
      return;
    }

    if (setupPhase === "confirm") {
      if (setupPin !== setupNewPinRef.current) {
        setSetupError("PIN tidak cocok. Silakan coba lagi.");
        setSetupPin("");
        setSetupPhase("enter");
        return;
      }
      submitPinSetup(setupPin);
    }
  }, [setupPin, setupPhase, setupSubmitting, submitPinSetup]);

  const handleSetupKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleSetupDigit(e.key);
      else if (e.key === "Backspace" || e.key === "Delete") handleSetupDelete();
      else if (e.key === "Escape") handleSetupClear();
    },
    [handleSetupDigit, handleSetupDelete, handleSetupClear],
  );

  // If no QR token, show manual login directly
  if (!qrToken && step === "manual") {
    return (
      <div className="w-full max-w-[420px]">
        <BrandHeader subtitle="Workshop Access Point" className="mb-5" />

        <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm p-6 shadow-sm min-h-[280px] flex flex-col justify-center">
          <LoginForm onSubmit={handleManualLogin} isLoading={isLoading} error={error} />
        </div>

        <p className="mt-3 text-center text-[11px] text-stone-400 leading-relaxed">
          Hanya untuk staf workshop terdaftar.
          <br />
          Hubungi admin jika mengalami kendala akses.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <BrandHeader subtitle="Workshop Access Point" className="mb-5" />

      {/* Stage info from QR */}
      {stage && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600/70">
            Akses Stage
          </p>
          <p className="mt-1 text-[15px] font-medium text-stone-800 capitalize">
            {stage.replace(/_/g, " ")}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm p-6 shadow-sm min-h-[280px] flex flex-col justify-center">
        {step === "workers" && (
          <WorkerSelect
            workers={workers}
            onSelect={handleSelectWorker}
            onManualLogin={handleSwitchToManual}
            isLoading={isLoading}
          />
        )}

        {step === "pin" && selectedWorker && (
          <PinPad
            onSubmit={handlePinLogin}
            onBack={handleBackToWorkers}
            isLoading={isLoading}
            error={error}
            workerName={selectedWorker.full_name}
            remainingAttempts={remainingAttempts}
          />
        )}

        {step === "setup" && selectedWorker && (
          <div ref={containerRef} tabIndex={0} onKeyDown={handleSetupKeyDown} className="outline-none">
            <div className="mb-6 text-center">
              <p className="text-[11px] uppercase tracking-wider text-stone-400">
                {setupPhase === "enter" ? "Buat PIN Baru (6 digit)" : "Konfirmasi PIN"}
              </p>
              <p className="mt-1 text-lg font-semibold text-stone-800">
                {selectedWorker.full_name}
              </p>
              <p className="mt-1 text-[12px] text-stone-400">
                PIN digunakan untuk login via QR Code
              </p>
            </div>

            <PinDots filled={setupPin.length} />

            <div className="mt-4 mb-2 text-center text-[12px] text-stone-400">
              {setupPin.length}/{PIN_LENGTH} digit
            </div>

            {setupError && (
              <div className="mb-6 rounded-lg bg-red-50 px-4 py-2.5 text-center text-[13px] text-red-600 border border-red-100">
                {setupError}
              </div>
            )}

            <Numpad
              onDigit={handleSetupDigit}
              onClear={handleSetupClear}
              onSubmit={() => {}}
              disabled={setupSubmitting}
              showSubmit={false}
            />

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleSetupDelete}
                disabled={setupPin.length === 0 || setupSubmitting}
                className="mb-3 flex h-12 w-[148px] items-center justify-center gap-1.5 rounded-xl border-2 border-stone-200 bg-white text-[14px] font-medium text-stone-500 transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.95] disabled:opacity-30 mx-auto"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                </svg>
                Hapus
              </button>
              <br />
              <button
                type="button"
                onClick={handleBackFromSetup}
                disabled={setupSubmitting}
                className="text-[13px] text-stone-400 underline underline-offset-2 transition-colors hover:text-stone-600 disabled:opacity-40"
              >
                ← Kembali ke daftar pekerja
              </button>
            </div>
          </div>
        )}

        {step === "manual" && (
          <>
            <LoginForm onSubmit={handleManualLogin} isLoading={isLoading} error={error} />
            {qrToken && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleBackFromManual}
                  className="text-[13px] text-stone-400 underline underline-offset-2 transition-colors hover:text-stone-600"
                >
                  ← Kembali ke PIN
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-stone-400 leading-relaxed">
        Hanya untuk staf workshop terdaftar.
        <br />
        Hubungi admin jika mengalami kendala akses.
      </p>
    </div>
  );
}

export default function WorkshopLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-10 w-10 rounded-full border-2 border-stone-200 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <WorkshopLoginContent />
    </Suspense>
  );
}
