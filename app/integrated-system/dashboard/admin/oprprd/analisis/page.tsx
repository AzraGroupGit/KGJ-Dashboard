"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import { Package, Play, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";

interface AnalisisData {
  total: number; completed: number; inProgress: number; rework: number;
  completionRate: number;
  stageDistribution: Record<string, number>;
}

export default function AdminOprPrdAnalisisPage() {
  const { data, isLoading } = useQuery<{ data: AnalisisData }>({
    queryKey: ["integrated-system", "admin", "oprprd", "analisis"],
    queryFn: () => fetcher("/api/integrated-system/admin/oprprd/analisis"),
    refetchInterval: 60_000,
  });

  const d = data?.data;
  if (isLoading) {
    return <div className="p-4 sm:p-6 animate-pulse"><div className="h-7 w-48 rounded bg-gray-200 mb-6" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5"><div className="h-3 w-16 rounded bg-white/[0.04]" /><div className="mt-2 h-8 w-12 rounded bg-gray-200" /></div>)}</div></div>;
  }

  const total = d?.total ?? 0;
  const completed = d?.completed ?? 0;
  const inProgress = d?.inProgress ?? 0;
  const rework = d?.rework ?? 0;
  const completionRate = d?.completionRate ?? 0;
  const stageDistribution = d?.stageDistribution ?? {};
  const maxStage = Math.max(...Object.values(stageDistribution), 1);

  const reworkRate = total > 0 ? Math.round((rework / total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#f0f4ff]">Analisis Kinerja</h1>
        <p className="mt-1 text-sm text-white/40">Analisis performa order dari sistem live</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-white/40"><Package className="h-3.5 w-3.5" />Total Order</div><p className="mt-1 text-2xl font-bold text-[#f0f4ff]">{total}</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-500/[0.08] p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><TrendingUp className="h-3.5 w-3.5" />Completion Rate</div><p className="mt-1 text-2xl font-bold text-emerald-300">{completionRate}%</p></div>
        <div className="rounded-xl border border-blue-200 bg-[#c9a227]/10 p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-[#c9a227]"><Play className="h-3.5 w-3.5" />In Progress</div><p className="mt-1 text-2xl font-bold text-[#d4ae3a]">{inProgress}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-500/[0.08] p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />Rework Rate</div><p className="mt-1 text-2xl font-bold text-amber-300">{reworkRate}%</p></div>
      </div>

      <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="h-4 w-4 text-white/30" /><h2 className="text-sm font-semibold text-[#e8e2d4]">Distribusi Stage</h2></div>
        <div className="space-y-2.5">
          {STAGE_SEQUENCE.map((stage) => {
            const count = stageDistribution[stage] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-28 flex-shrink-0 text-xs text-[#e8e2d4] truncate">{STAGE_LABELS[stage]}</span>
                <div className="flex-1 h-6 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${pct > 25 ? "bg-[#c9a227]/100" : pct > 10 ? "bg-indigo-400" : "bg-indigo-300"}`} style={{ width: `${(count / maxStage) * 100}%`, minWidth: count > 0 ? "8px" : "0" }} />
                </div>
                <span className="w-12 text-right text-xs text-white/40">{count} <span className="text-white/30">({pct}%)</span></span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#e8e2d4] mb-2">Ringkasan</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/40">Completed</span><span className="font-semibold text-emerald-300">{completed}</span></div>
            <div className="flex justify-between"><span className="text-white/40">In Progress</span><span className="font-semibold text-[#c9a227]">{inProgress}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Rework</span><span className="font-semibold text-amber-300">{rework}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Completion Rate</span><span className="font-semibold text-emerald-300">{completionRate}%</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#e8e2d4] mb-2">Status Terbanyak</h3>
          <div className="space-y-2">
            {Object.entries(stageDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([stage, count]) => (
              <div key={stage} className="flex justify-between text-sm"><span className="text-[#e8e2d4]">{STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}</span><span className="font-medium text-[#f0f4ff]">{count}</span></div>
            ))}
            {Object.keys(stageDistribution).length === 0 && <p className="text-sm text-white/30">Belum ada data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
