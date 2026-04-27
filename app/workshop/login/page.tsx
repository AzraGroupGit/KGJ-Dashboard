// app/workshop/login/page.tsx

"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandHeader from "@/components/qr/BrandHeader";
import LoginForm from "@/components/qr/LoginForm";

// Wrapper karena useSearchParams perlu Suspense
function WorkshopLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Ambil parameter dari QR code
  const redirectTo = searchParams.get("redirect") || "/workshop/input";
  const orderId = searchParams.get("order_id");
  const stage = searchParams.get("stage");
  const qrToken = searchParams.get("qr_token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Panggil API QR login
        const response = await fetch("/api/auth/qr-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Login gagal");
        }

        // Build redirect URL dengan parameter asli dari QR
        const params = new URLSearchParams();
        if (orderId) params.set("order_id", orderId);
        if (stage) params.set("stage", stage);
        if (qrToken) params.set("qr_token", qrToken);

        const targetUrl = `${redirectTo}?${params.toString()}`;
        router.push(targetUrl);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [router, redirectTo, orderId, stage, qrToken],
  );

  return (
    <div className="w-full max-w-[380px]">
      <BrandHeader subtitle="Workshop Access Point" />

      {/* Info stage dari QR */}
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

      <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm p-7 shadow-sm">
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
      </div>

      <p className="mt-6 text-center text-[11px] text-stone-400 leading-relaxed">
        Hanya untuk staf workshop terdaftar.
        <br />
        Hubungi admin jika mengalami kendala akses.
      </p>
    </div>
  );
}

// Main component dengan Suspense boundary
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
