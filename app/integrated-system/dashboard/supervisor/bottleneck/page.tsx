"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_SEQUENCE, STAGE_LABELS } from "@/services/integrated-system/tracking.service";
import { BarChart3, Clock } from "lucide-react";
import Link from "next/link";

interface BottleneckData {
  stageCounts: Array<{ stage: string; label: string; count: number }>;
  maxCount: number;
  oldestInStage: Array<{ stage: string; label: string; oldestDays: number | null; count: number }>;
  totalActive: number;
}

export default function SupervisorBottleneckPage() {
  const { data, isLoading } = useQuery<{ data: BottleneckData }>({
    queryKey: ["integrated-system", "supervisor", "bottleneck"],
    queryFn: () => fetcher("/api/integrated-system/supervisor/bottleneck"),
    refetchInterval: 60_000,
  });

  const d = data?.data;
  if (isLoading) {
    return <div className="p-4 sm:p-6 animate-pulse"><div className="h-7 w-48 rounded bg-gray-200 mb-6" /><div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-gray-100" />)}</div></div>;
  }

  const sortedByCount = (d?.stageCounts ?? []).slice().sort((a, b) => b.count - a.count);
  const bottleneckStages = sortedByCount.filter((s) => s.count > 0).slice(0, 5);
  const maxCount = d?.maxCount ?? 1;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Bottleneck</h1>
        <p className="mt-1 text-sm text-gray-500">Identifikasi stage dengan penumpukan order terbanyak</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-gray-400">Total Aktif</p><p className="text-lg font-bold text-gray-800">{d?.totalActive ?? 0}</p></div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-amber-500">Bottleneck Stage</p><p className="text-lg font-bold text-amber-700 truncate">{bottleneckStages[0]?.label ?? "-"}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3"><p className="text-[11px] uppercase tracking-wider text-gray-400">Order di Bottleneck</p><p className="text-lg font-bold text-red-600">{bottleneckStages[0]?.count ?? 0}</p></div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="h-4 w-4 text-gray-400" /><h2 className="text-sm font-semibold text-gray-700">Penumpukan per Stage</h2></div>
        <div className="space-y-3">
          {(d?.stageCounts ?? STAGE_SEQUENCE.map((s) => ({ stage: s, label: STAGE_LABELS[s], count: 0 }))).map(({ stage, label, count }) => (
            <Link key={stage} href={`/integrated-system/dashboard/admin/oprprd/monitoring?stage=${stage}`} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-amber-50/50 transition-colors">
              <span className="w-28 flex-shrink-0 text-xs text-gray-600 truncate">{label}</span>
              <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${count > 10 ? "bg-red-500" : count > 5 ? "bg-amber-400" : "bg-indigo-400"}`} style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? "8px" : "0" }} />
              </div>
              <span className="w-8 text-right text-xs font-semibold text-gray-700">{count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-gray-400" /><h2 className="text-sm font-semibold text-gray-700">Order Terlama per Stage</h2></div>
        <div className="space-y-2">
          {(d?.oldestInStage ?? []).filter((s) => s.oldestDays !== null).sort((a, b) => (b.oldestDays ?? 0) - (a.oldestDays ?? 0)).slice(0, 5).map(({ stage, label, oldestDays, count }) => (
            <div key={stage} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{label}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{count} order</span>
              </div>
              <span className="text-xs font-medium text-red-600">{oldestDays} hari di stage ini</span>
            </div>
          ))}
          {(d?.oldestInStage ?? []).filter((s) => s.oldestDays !== null).length === 0 && <p className="py-4 text-center text-sm text-gray-400">Tidak ada data</p>}
        </div>
      </div>
    </div>
  );
}
