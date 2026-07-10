"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS } from "@/services/integrated-system/tracking.service";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { Package, Play, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface AdminOverview {
  total: number; inProgress: number; completed: number; rework: number;
  stageCounts: Record<string, number>;
  lastSync: { orders_synced: number; status: string; created_at: string } | null;
}

export default function SupervisorDashboard() {
  const { data, isLoading } = useQuery<{ data: AdminOverview }>({
    queryKey: ["integrated-system", "admin", "overview"],
    queryFn: () => fetcher("/api/integrated-system/admin/overview"),
    refetchInterval: 30_000,
  });

  const overview = data?.data;
  const total = overview?.total ?? 0;
  const inProgress = overview?.inProgress ?? 0;
  const completed = overview?.completed ?? 0;
  const rework = overview?.rework ?? 0;

  const chartData = Object.entries(overview?.stageCounts ?? {}).map(([stage, count]) => ({
    stage: STAGE_LABELS[stage] ?? stage,
    count,
  }));

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-white/[0.04] mb-6" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/[0.03]" />)}
        </div>
        <div className="h-64 rounded-xl bg-white/[0.03]" />
      </div>
    );
  }

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const reworkRate = total > 0 ? Math.round((rework / total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-bold text-[#f0f4ff]">Dashboard Overview</h1>
        <p className="text-xs sm:text-sm text-white/40">Ringkasan kinerja order dari sistem live</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-white/40"><Package className="h-3.5 w-3.5" />Total Order</div>
          <p className="mt-1 text-2xl font-bold text-[#f0f4ff]">{total}</p>
          <p className="mt-0.5 text-[11px] text-white/20">Semua periode</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/5 p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#c9a227]"><Play className="h-3.5 w-3.5" />In Progress</div>
          <p className="mt-1 text-2xl font-bold text-[#d4ae3a]">{inProgress}</p>
          <p className="mt-0.5 text-[11px] text-[#c9a227]/50">{completionRate}% completion rate</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Completed</div>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{completed}</p>
          <p className="mt-0.5 text-[11px] text-emerald-500/50">{completionRate}% dari total</p>
        </div>
        <div className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-red-400"><AlertTriangle className="h-3.5 w-3.5" />Rework</div>
          <p className="mt-1 text-2xl font-bold text-red-300">{rework}</p>
          <p className="mt-0.5 text-[11px] text-red-400/50">{reworkRate}% rework rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 mb-6">
        <div className="lg:col-span-3 rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5">
          <h3 className="text-sm font-semibold text-[#e8e2d4] mb-4">Distribusi Stage</h3>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#2a2522", border: "1px solid #c9a22730", borderRadius: "8px", color: "#e8e2d4" }} />
                  <Bar dataKey="count" fill="#c9a227" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-white/30">Belum ada data</div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5">
          <h3 className="text-sm font-semibold text-[#e8e2d4] mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-white/30" />Ringkasan</h3>
          <div className="space-y-3">
            {[
              { label: "Total Order", value: total, color: "text-[#f0f4ff]" },
              { label: "In Progress", value: inProgress, color: "text-[#c9a227]" },
              { label: "Completed", value: completed, color: "text-emerald-300" },
              { label: "Rework", value: rework, color: "text-red-300" },
              { label: "Completion Rate", value: `${completionRate}%`, color: "text-emerald-300" },
              { label: "Rework Rate", value: `${reworkRate}%`, color: "text-amber-300" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-[#c9a227]/5 last:border-0">
                <span className="text-xs text-white/40">{label}</span>
                <span className={`text-sm font-semibold`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/integrated-system/dashboard/supervisor/persetujuan" className="flex items-center gap-3 rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4 hover:border-[#c9a227]/30 transition-all">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/[0.08]"><CheckCircle2 className="h-5 w-5 text-amber-400" /></div>
          <div><p className="text-sm font-medium text-[#e8e2d4]">Persetujuan</p><p className="text-xs text-white/40">Review & setujui order</p></div>
        </Link>
        <Link href="/integrated-system/dashboard/supervisor/bottleneck" className="flex items-center gap-3 rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4 hover:border-[#c9a227]/30 transition-all">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/[0.08]"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
          <div><p className="text-sm font-medium text-[#e8e2d4]">Bottleneck</p><p className="text-xs text-white/40">Identifikasi penumpukan</p></div>
        </Link>
        <Link href="/integrated-system/dashboard/supervisor/monitoring" className="flex items-center gap-3 rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4 hover:border-[#c9a227]/30 transition-all">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c9a227]/10"><Play className="h-5 w-5 text-[#c9a227]" /></div>
          <div><p className="text-sm font-medium text-[#e8e2d4]">Monitoring</p><p className="text-xs text-white/40">Pantau semua order</p></div>
        </Link>
      </div>
    </div>
  );
}
