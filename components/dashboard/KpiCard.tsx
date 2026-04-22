// components/dashboard/KpiCard.tsx

"use client";

import { useEffect, useState } from "react";

interface KpiApiResponse {
  success: boolean;
  data: {
    totalOrdersAktif: number;
    potensiKeterlambatan: number;
    nilaiBarangWIP: {
      beratEmas: number;
      jumlahPermata: number;
      estimasiRupiah: number;
      avgKarat: number;
    };
    rataCycleTime: number;
    targetCycleTime: number;
    additional: {
      ordersHariIni: number;
      selesaiHariIni: number;
      totalRework: number;
      criticalRework: number;
      completedCount: number;
    };
    trend: {
      currentWeekOrders: number;
      lastWeekOrders: number;
      trendPercent: number;
    };
    meta: {
      generatedAt: string;
      hargaEmas24kPerGram: number;
    };
  };
  error?: string;
  message?: string;
}

export function KpiCards() {
  const [apiData, setApiData] = useState<KpiApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/owner/dashboard");
      if (!res.ok) throw new Error("Failed to fetch KPI data");
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "API returned error");
      setApiData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto refresh setiap 30 detik
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <KpiCardsSkeleton />;
  if (error) return <KpiCardsError error={error} onRetry={fetchData} />;
  if (!apiData?.data) return null;

  const data = apiData.data;
  const isOverCycle = data.rataCycleTime > data.targetCycleTime;
  const hasDelayWarning = data.potensiKeterlambatan > 0;
  const trendIsPositive = data.trend.trendPercent > 0;

  const formatRupiah = (value: number): string => {
    if (value >= 1000000000) {
      return `Rp ${(value / 1000000000).toFixed(1)} M`;
    }
    if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(0)} Jt`;
    }
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const formatWeight = (weight: number): string => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(2)} kg`;
    }
    return `${weight.toFixed(0)} g`;
  };

  return (
    <div className="space-y-4">
      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Order Aktif */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Order Aktif
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {data.totalOrdersAktif}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <p className="text-xs text-gray-500">Order dalam proses</p>
            </div>
            {trendIsPositive ? (
              <span className="text-xs text-green-600">
                ↑ {data.trend.trendPercent}%
              </span>
            ) : (
              <span className="text-xs text-red-600">
                ↓ {Math.abs(data.trend.trendPercent)}%
              </span>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">
                Hari ini masuk: {data.additional.ordersHariIni}
              </span>
              <span className="text-gray-400">
                Selesai: {data.additional.selesaiHariIni}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Potensi Keterlambatan */}
        <div
          className={`bg-white rounded-xl shadow-sm p-5 border transition-all ${
            hasDelayWarning
              ? "border-orange-200 hover:shadow-md hover:border-orange-300"
              : "border-gray-100 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Potensi Keterlambatan
              </p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  hasDelayWarning ? "text-orange-600" : "text-gray-900"
                }`}
              >
                {data.potensiKeterlambatan}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                hasDelayWarning
                  ? "bg-gradient-to-br from-orange-500 to-orange-600"
                  : "bg-gradient-to-br from-gray-400 to-gray-500"
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                hasDelayWarning ? "bg-orange-500 animate-pulse" : "bg-gray-400"
              }`}
            ></span>
            <p
              className={`text-xs ${
                hasDelayWarning
                  ? "text-orange-600 font-medium"
                  : "text-gray-500"
              }`}
            >
              {hasDelayWarning
                ? "⚠️ Butuh perhatian segera"
                : "Semua order on track"}
            </p>
          </div>
          {data.additional.criticalRework > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-red-500">
                🔴 {data.additional.criticalRework} critical rework
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Nilai Barang WIP */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Nilai Barang WIP
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatRupiah(data.nilaiBarangWIP.estimasiRupiah)}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">🟡</span>
              <span className="text-xs text-gray-600">
                {formatWeight(data.nilaiBarangWIP.beratEmas)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-500">💎</span>
              <span className="text-xs text-gray-600">
                {data.nilaiBarangWIP.jumlahPermata} Permata
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Rata-rata {data.nilaiBarangWIP.avgKarat}K • Harga: Rp{" "}
              {data.meta.hargaEmas24kPerGram.toLocaleString("id-ID")}/g (24K)
            </p>
          </div>
        </div>

        {/* Card 4: Rata-rata Cycle Time */}
        <div
          className={`bg-white rounded-xl shadow-sm p-5 border transition-all ${
            isOverCycle
              ? "border-red-200 hover:shadow-md hover:border-red-300"
              : "border-green-200 hover:shadow-md hover:border-green-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Rata-rata Cycle Time
              </p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  isOverCycle ? "text-red-600" : "text-green-600"
                }`}
              >
                {data.rataCycleTime.toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">hari</p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                isOverCycle
                  ? "bg-gradient-to-br from-red-500 to-red-600"
                  : "bg-gradient-to-br from-green-500 to-green-600"
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">
                Target: {data.targetCycleTime} hari
              </span>
              <span className={isOverCycle ? "text-red-600" : "text-green-600"}>
                {isOverCycle
                  ? `+${(data.rataCycleTime - data.targetCycleTime).toFixed(1)}`
                  : `-${(data.targetCycleTime - data.rataCycleTime).toFixed(1)}`}{" "}
                hari
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  isOverCycle ? "bg-red-500" : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min((data.rataCycleTime / data.targetCycleTime) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Completed count */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              📊 {data.additional.completedCount} order selesai (30 hari)
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated Indicator */}
      <div className="flex justify-end">
        <p className="text-xs text-gray-400">
          Terakhir diperbarui:{" "}
          {new Date(data.meta.generatedAt).toLocaleTimeString("id-ID")}
          <span className="ml-2 text-gray-300">|</span>
          <button
            onClick={fetchData}
            className="ml-2 text-blue-500 hover:text-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </p>
      </div>
    </div>
  );
}

// ========== SKELETON LOADING ==========
function KpiCardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3 animate-pulse"></div>
                <div className="h-8 bg-gray-300 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
            <div className="mt-3">
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== ERROR STATE ==========
function KpiCardsError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-red-50 rounded-xl border border-red-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">
            Gagal memuat data KPI
          </p>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

export default KpiCards;
