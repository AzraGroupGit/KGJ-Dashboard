// components/dashboard/KpiCard.tsx

"use client";

import { ClipboardCheck, Clock, DollarSign, Zap, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";

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
  const {
    data: raw,
    isLoading,
    error,
    refetch,
  } = useQuery<KpiApiResponse>({
    queryKey: ["kpi", "dashboard"],
    queryFn: () => fetcher<KpiApiResponse>("/api/owner/dashboard"),
    refetchInterval: 30000,
  });

  const apiData = raw?.success ? raw : null;

  if (isLoading) return <KpiCardsSkeleton />;
  if (error)
    return (
      <KpiCardsError
        error={error instanceof Error ? error.message : "Gagal memuat data"}
        onRetry={() => refetch()}
      />
    );
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
        <div className="bg-[#2a2522] rounded-xl shadow-sm p-5 border border-[#c9a227]/5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/40">
                Total Order Aktif
              </p>
              <p className="text-3xl font-bold text-[#f0f4ff] mt-1">
                {data.totalOrdersAktif}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#c9a227]/100 rounded-full"></span>
              <p className="text-xs text-white/40">Order dalam proses</p>
            </div>
            {trendIsPositive ? (
              <span className="text-xs text-green-600">
                ↑ {data.trend.trendPercent}%
              </span>
            ) : (
              <span className="text-xs text-red-300">
                ↓ {Math.abs(data.trend.trendPercent)}%
              </span>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-[#c9a227]/5">
            <div className="flex justify-between text-xs">
              <span className="text-white/30">
                Hari ini masuk: {data.additional.ordersHariIni}
              </span>
              <span className="text-white/30">
                Selesai: {data.additional.selesaiHariIni}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Potensi Keterlambatan */}
        <div
          className={`bg-[#2a2522] rounded-xl shadow-sm p-5 border transition-all ${
            hasDelayWarning
              ? "border-orange-200 hover:shadow-md hover:border-orange-300"
              : "border-[#c9a227]/5 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/40">
                Potensi Keterlambatan
              </p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  hasDelayWarning ? "text-orange-600" : "text-[#f0f4ff]"
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
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                hasDelayWarning ? "bg-orange-500/[0.08]0 animate-pulse" : "bg-gray-400"
              }`}
            ></span>
            <p
              className={`text-xs ${
                hasDelayWarning
                  ? "text-orange-600 font-medium"
                  : "text-white/40"
              }`}
            >
              {hasDelayWarning
                ? "⚠️ Butuh perhatian segera"
                : "Semua order on track"}
            </p>
          </div>
          {data.additional.criticalRework > 0 && (
            <div className="mt-2 pt-2 border-t border-[#c9a227]/5">
              <p className="text-xs text-red-400">
                🔴 {data.additional.criticalRework} critical rework
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Nilai Barang WIP */}
        <div className="bg-[#2a2522] rounded-xl shadow-sm p-5 border border-[#c9a227]/5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/40">
                Nilai Barang WIP
              </p>
              <p className="text-2xl font-bold text-[#f0f4ff] mt-1">
                {formatRupiah(data.nilaiBarangWIP.estimasiRupiah)}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">🟡</span>
              <span className="text-xs text-[#e8e2d4]">
                {formatWeight(data.nilaiBarangWIP.beratEmas)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-500">💎</span>
              <span className="text-xs text-[#e8e2d4]">
                {data.nilaiBarangWIP.jumlahPermata} Permata
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#c9a227]/5">
            <p className="text-xs text-white/30">
              Rata-rata {data.nilaiBarangWIP.avgKarat}K • Harga: Rp{" "}
              {data.meta.hargaEmas24kPerGram.toLocaleString("id-ID")}/g (24K)
            </p>
          </div>
        </div>

        {/* Card 4: Rata-rata Cycle Time */}
        <div
          className={`bg-[#2a2522] rounded-xl shadow-sm p-5 border transition-all ${
            isOverCycle
              ? "border-red-200 hover:shadow-md hover:border-red-300"
              : "border-green-200 hover:shadow-md hover:border-green-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/40">
                Rata-rata Cycle Time
              </p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  isOverCycle ? "text-red-300" : "text-green-600"
                }`}
              >
                {data.rataCycleTime.toFixed(1)}
              </p>
              <p className="text-xs text-white/30 mt-0.5">hari</p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                isOverCycle
                  ? "bg-gradient-to-br from-red-500 to-red-600"
                  : "bg-gradient-to-br from-green-500 to-green-600"
              }`}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">
                Target: {data.targetCycleTime} hari
              </span>
              <span className={isOverCycle ? "text-red-300" : "text-green-600"}>
                {isOverCycle
                  ? `+${(data.rataCycleTime - data.targetCycleTime).toFixed(1)}`
                  : `-${(data.targetCycleTime - data.rataCycleTime).toFixed(1)}`}{" "}
                hari
              </span>
            </div>
            <div className="w-full bg-[#332d29] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  isOverCycle ? "bg-red-500/[0.08]0" : "bg-[#c9a227]/100"
                }`}
                style={{
                  width: `${Math.min((data.rataCycleTime / data.targetCycleTime) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Completed count */}
          <div className="mt-2 pt-2 border-t border-[#c9a227]/5">
            <p className="text-xs text-white/30">
              📊 {data.additional.completedCount} order selesai (30 hari)
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated Indicator */}
      <div className="flex justify-end">
        <p className="text-xs text-white/30">
          Terakhir diperbarui:{" "}
          {new Date(data.meta.generatedAt).toLocaleTimeString("id-ID")}
          <span className="ml-2 text-white/20">|</span>
          <button
            onClick={() => refetch()}
            className="ml-2 text-blue-500 hover:text-[#e8e2d4] transition-colors"
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
            className="bg-[#2a2522] rounded-xl shadow-sm p-5 border border-[#c9a227]/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-[#332d29] rounded w-2/3 mb-3 animate-pulse"></div>
                <div className="h-8 bg-gray-300 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-[#332d29] rounded-xl animate-pulse"></div>
            </div>
            <div className="mt-3">
              <div className="h-3 bg-[#332d29] rounded w-1/2 animate-pulse"></div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#c9a227]/5">
              <div className="h-3 bg-[#332d29] rounded w-full animate-pulse"></div>
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
    <div className="bg-red-500/[0.08] rounded-xl border border-red-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-500/[0.12] rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">
            Gagal memuat data KPI
          </p>
          <p className="text-xs text-red-300 mt-0.5">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="text-xs bg-red-500/[0.12] text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

export default KpiCards;
