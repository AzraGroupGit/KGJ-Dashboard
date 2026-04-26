// app/qr/input/page.tsx

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BrandHeader from "@/components/qr/BrandHeader";
import StageInputForm from "@/components/qr/StageInputForm";
import LoadingSplash from "@/components/qr/LoadingSplas";

interface StageConfig {
  stage: string;
  stage_label: string;
  order_number: string;
  product_name: string;
  customer_name?: string;
  fields: StageField[];
  permissions: {
    can_submit: boolean;
    can_edit: boolean;
    can_reject: boolean;
  };
  current_data?: Record<string, unknown>;
  stage_result_id?: string;
  attempt_number?: number;
}

interface StageField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "boolean" | "file";
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
}

function QRInputContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("order_id");
  const stage = searchParams.get("stage");
  const qrToken = searchParams.get("qr_token");
  const orderNumber = searchParams.get("order_number"); // alternatif

  const [config, setConfig] = useState<StageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Step 1: Inisiasi sesi kerja via /api/qr-scan (action: open)
  const initSession = useCallback(async () => {
    if (!qrToken || !orderNumber) {
      setError("Parameter QR tidak lengkap");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/qr-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_token: qrToken,
          order_number: orderNumber,
          action: "open",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Jika WORK_IN_PROGRESS (409) — tetap izinkan lihat data
        if (data.code === "WORK_IN_PROGRESS") {
          setError(
            `Order sedang dikerjakan oleh: ${data.current_handler || "user lain"}`,
          );
          // Tetap ambil form config untuk view-only
        } else {
          throw new Error(data.error || "Gagal memulai sesi");
        }
      }

      if (data.success && data.data?.stage_result_id) {
        setSessionStarted(true);
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                stage_result_id: data.data.stage_result_id,
                attempt_number: data.data.attempt,
              }
            : prev,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulai sesi kerja");
    }
  }, [qrToken, orderNumber]);

  // Step 2: Ambil konfigurasi form
  const fetchConfig = useCallback(async () => {
    if (!orderId && !orderNumber) {
      setError("Parameter order tidak lengkap");
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (orderId) params.set("order_id", orderId);
      if (orderNumber) params.set("order_number", orderNumber);
      if (stage) params.set("stage", stage || "");

      const response = await fetch(
        `/api/stages/form-config?${params.toString()}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memuat konfigurasi");
      }

      setConfig(data.data.config);
      setUser(data.data.user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat halaman input",
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId, orderNumber, stage]);

  // Jalankan init session dulu, lalu fetch config
  useEffect(() => {
    const initialize = async () => {
      if (qrToken && orderNumber) {
        await initSession();
      }
      await fetchConfig();
    };
    initialize();
  }, [initSession, fetchConfig]);

  // Submit data
  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      const payload: any = {
        order_id: orderId,
        stage,
        data: formData,
      };

      // Sertakan stage_result_id jika ada
      if (config?.stage_result_id) {
        payload.stage_result_id = config.stage_result_id;
      }

      // Sertakan qr_token jika ada (untuk complete session)
      if (qrToken && orderNumber) {
        payload.qr_token = qrToken;
        payload.order_number = orderNumber;
      }

      const response = await fetch("/api/stages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan data");
      }

      // Tampilkan success
      alert("✅ Data berhasil disimpan!");

      // Kembali ke halaman input (bisa untuk scan order berikutnya)
      router.push("/qr/input?submitted=true");
    } catch (err) {
      alert(
        "❌ " + (err instanceof Error ? err.message : "Gagal menyimpan data"),
      );
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/qr/login");
  };

  // Loading
  if (isLoading) {
    return <LoadingSplash message="Memuat data order..." />;
  }

  // Error
  if (error && !config) {
    return (
      <div className="w-full max-w-[380px] text-center">
        <BrandHeader subtitle="Akses Workshop" />
        <div className="rounded-2xl border border-red-100 bg-white/90 p-7 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-7 w-7 text-red-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-[15px] text-stone-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/qr/login")}
            className="text-[14px] font-medium text-amber-600 hover:text-amber-700"
          >
            Kembali ke halaman login
          </button>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="w-full max-w-[420px]">
      {/* Header dengan info user & stage */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            {config.stage_label}
          </p>
          <p className="text-[13px] text-stone-600 mt-0.5">
            #{config.order_number}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-medium text-stone-700">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="text-[11px] text-stone-400 hover:text-red-500 transition-colors mt-0.5"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Info produk */}
      <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600/70">
          Produk
        </p>
        <p className="mt-1 text-[15px] font-medium text-stone-800">
          {config.product_name}
        </p>
        {config.customer_name && (
          <p className="mt-0.5 text-[13px] text-stone-500">
            Customer: {config.customer_name}
          </p>
        )}
      </div>

      {/* Peringatan jika sesi sudah ada yang mengerjakan */}
      {error && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-[13px] text-amber-700 border border-amber-200">
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      <StageInputForm
        fields={config.fields}
        permissions={config.permissions}
        initialData={config.current_data}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// Main component dengan Suspense
export default function QRInputPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-10 w-10 rounded-full border-2 border-stone-200 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <QRInputContent />
    </Suspense>
  );
}
