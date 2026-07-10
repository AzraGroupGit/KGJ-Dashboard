"use client";

import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_SEQUENCE, STAGE_LABELS } from "@/services/integrated-system/tracking.service";
import { BarChart3, Clock, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface BottleneckData {
  stageCounts: Array<{ stage: string; label: string; count: number }>;
  maxCount: number;
  oldestInStage: Array<{ stage: string; label: string; oldestDays: number | null; count: number }>;
  totalActive: number;
}

const FILTER_TABS = ["all", "production", "operational"] as const;

export default function SupervisorBottleneckPage() {
  const [filter, setFilter] = useState<typeof FILTER_TABS[number]>("all");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: BottleneckData }>({
    queryKey: ["integrated-system", "supervisor", "bottleneck"],
    queryFn: () => fetcher("/api/integrated-system/supervisor/bottleneck"),
    refetchInterval: 60_000,
  });

  const d = data?.data;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-white/[0.04] mb-6" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/[0.03]" />)}
        </div>
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-white/[0.03]" />)}</div>
      </div>
    );
  }

  const stageCounts = d?.stageCounts ?? STAGE_SEQUENCE.map((s) => ({ stage: s, label: STAGE_LABELS[s], count: 0 }));
  const totalActive = d?.totalActive ?? 0;
  const oldestInStage = d?.oldestInStage ?? [];

  const productionCount = stageCounts.filter((s) => {
    const labels: Record<string, string> = { lebur_bahan: "p", pembentukan_cincin: "p", pemasangan_permata: "p", pemolesan: "p", cek_kadar: "p", finishing: "p" };
    return labels[s.stage];
  }).reduce((a, b) => a + b.count, 0);

  const operationalCount = stageCounts.filter((s) => {
    const labels: Record<string, string> = { lebur_bahan: "p", pembentukan_cincin: "p", pemasangan_permata: "p", pemolesan: "p", cek_kadar: "p", finishing: "p" };
    return !labels[s.stage] && !s.stage.startsWith("approval_");
  }).reduce((a, b) => a + b.count, 0);

  const approvalCount = stageCounts.filter((s) => s.stage.startsWith("approval_")).reduce((a, b) => a + b.count, 0);

  const criticalStages = stageCounts.filter((s) => s.count > 5).length;
  const slowStages = stageCounts.filter((s) => s.count >= 2 && s.count <= 5).length;

  const sortedByCount = [...stageCounts].sort((a, b) => b.count - a.count);
  const topStage = sortedByCount[0];

  const filteredStages = stageCounts.filter((s) => {
    if (filter === "all") return true;
    const labels: Record<string, string> = { lebur_bahan: "p", pembentukan_cincin: "p", pemasangan_permata: "p", pemolesan: "p", cek_kadar: "p", finishing: "p" };
    const isProduction = labels[s.stage];
    if (filter === "production") return isProduction && !s.stage.startsWith("approval_");
    return !isProduction && !s.stage.startsWith("approval_");
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-bold text-[#f0f4ff]">Bottleneck Monitoring</h1>
        <p className="text-xs sm:text-sm text-white/40">Identifikasi tahap dengan penumpukan order terbanyak</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Total</p>
          <p className="text-xl font-bold text-[#f0f4ff]">{totalActive}</p>
        </div>
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60">Produksi</p>
          <p className="text-xl font-bold text-amber-300">{productionCount}</p>
        </div>
        <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.04] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/60">Operasional</p>
          <p className="text-xl font-bold text-blue-300">{operationalCount}</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Menunggu</p>
          <p className="text-xl font-bold text-[#c9a227]">{approvalCount}</p>
        </div>
        <div className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/60">Kritis</p>
          <p className="text-xl font-bold text-red-300">{criticalStages}</p>
        </div>
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60">Lambat</p>
          <p className="text-xl font-bold text-amber-300">{slowStages}</p>
        </div>
      </div>

      {topStage && topStage.count > 0 && (
        <div className="mb-4 rounded-lg bg-amber-500/[0.06] border border-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Tahap dengan penumpukan terbanyak: <strong>{topStage.label}</strong> — {topStage.count} order
        </div>
      )}

      <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[#c9a227]/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#d4ae3a]" />
            <h3 className="text-sm font-semibold text-[#e8e2d4]">Penumpukan per Stage</h3>
          </div>
          <div className="flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
            {FILTER_TABS.map((t) => {
              const count = t === "all" ? stageCounts.length : t === "production" ? productionCount : operationalCount;
              return (
                <button key={t} onClick={() => setFilter(t)} className={`rounded-md px-3 py-1 text-[11px] font-medium ${filter === t ? "bg-[#c9a227]/15 text-[#c9a227]" : "text-white/30 hover:text-white/50"}`}>
                  {t === "all" ? "Semua" : t === "production" ? "Produksi" : "Operasional"} ({count})
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[#c9a227]/5">
              <tr>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Tahap</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">Rata-rata</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Terlama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c9a227]/5">
              {filteredStages.map(({ stage, label, count }) => {
                const oldest = oldestInStage.find((o) => o.stage === stage);
                const isExpanded = expandedStage === stage;
                return (
                  <Fragment key={stage}>
                    <tr key={stage} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandedStage(isExpanded ? null : stage)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-white/30" /> : <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
                          <span className="text-xs font-medium text-[#e8e2d4]">{label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${count > 10 ? "bg-red-500/[0.08] text-red-300" : count > 5 ? "bg-amber-500/[0.08] text-amber-300" : "bg-white/[0.04] text-[#e8e2d4]"}`}>{count}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs ${(oldest?.oldestDays ?? 0) > 10 ? "text-red-300" : (oldest?.oldestDays ?? 0) > 5 ? "text-[#d4ae3a]" : "text-white/30"}`}>
                          {oldest?.oldestDays != null ? `${oldest.oldestDays}h` : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs ${(oldest?.oldestDays ?? 0) > 10 ? "text-red-300" : "text-white/30"}`}>
                          {oldest?.oldestDays != null ? `${oldest.oldestDays}h` : "-"}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-white/[0.01]">
                        <td colSpan={4} className="px-4 py-2">
                          <Link href={`/integrated-system/dashboard/admin/oprprd/monitoring?stage=${stage}`} className="text-xs text-[#c9a227] hover:underline">
                            Lihat {count} order di tahap ini →
                          </Link>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStages.length === 0 && <div className="py-12 text-center text-sm text-white/30">Tidak ada tahap terdeteksi</div>}
      </div>

      <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-white/30" /><h3 className="text-sm font-semibold text-[#e8e2d4]">Order Terlama per Stage</h3></div>
        <div className="space-y-2">
          {oldestInStage.filter((s) => s.oldestDays !== null).sort((a, b) => (b.oldestDays ?? 0) - (a.oldestDays ?? 0)).slice(0, 5).map(({ stage, label, oldestDays, count }) => (
            <div key={stage} className="flex items-center justify-between rounded-lg border border-[#c9a227]/5 bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#e8e2d4]">{label}</span>
                <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/30">{count} order</span>
              </div>
              <span className={`text-xs font-medium ${(oldestDays ?? 0) > 10 ? "text-red-300" : (oldestDays ?? 0) > 5 ? "text-[#d4ae3a]" : "text-white/30"}`}>{oldestDays} hari</span>
            </div>
          ))}
          {oldestInStage.filter((s) => s.oldestDays !== null).length === 0 && <p className="py-4 text-center text-sm text-white/30">Tidak ada data</p>}
        </div>
      </div>
    </div>
  );
}
