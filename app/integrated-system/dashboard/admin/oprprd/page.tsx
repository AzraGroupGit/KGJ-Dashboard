"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import Link from "next/link";
import { Package, Play, CheckCircle2, AlertTriangle, BarChart3, ArrowRight, RefreshCw, Search } from "lucide-react";

interface OprPrdOverview {
  total: number; inProgress: number; completed: number; rework: number;
  stageCounts: Record<string, number>;
  recentOrders: Array<{ id: string; kode_order: string; nama: string; tgl_order: string | null; tracking: { current_stage: string; stage_status: string }[] }>;
}

export default function AdminOprPrdPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (stageFilter !== "all") params.set("stage", stageFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);

  const { data, isLoading } = useQuery<{ data: OprPrdOverview }>({
    queryKey: ["integrated-system", "admin", "oprprd", "overview", search, stageFilter, statusFilter],
    queryFn: () => fetcher(`/api/integrated-system/admin/oprprd/overview?${params}`),
    refetchInterval: 30_000,
  });

  const overview = data?.data;
  const total = overview?.total ?? 0;
  const inProgress = overview?.inProgress ?? 0;
  const completed = overview?.completed ?? 0;
  const rework = overview?.rework ?? 0;
  const stageEntries = STAGE_SEQUENCE.map((s) => ({ stage: s, label: STAGE_LABELS[s], count: overview?.stageCounts?.[s] ?? 0 }));
  const maxCount = Math.max(...stageEntries.map((e) => e.count), 1);
  const recentOrders = overview?.recentOrders ?? [];
  const hasFilters = search || stageFilter !== "all" || statusFilter !== "all";

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-gray-200 bg-white p-5"><div className="h-3 w-16 rounded bg-gray-100" /><div className="mt-2 h-8 w-12 rounded bg-gray-200" /></div>)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">OPR-PRD Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview produksi order dari sistem live</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode order atau nama..." className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
          <option value="all">Semua Stage</option>
          {STAGE_SEQUENCE.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
          <option value="all">Semua Status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rework">Rework</option>
        </select>
        {hasFilters && <button onClick={() => { setSearch(""); setStageFilter("all"); setStatusFilter("all"); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-100"><RefreshCw className="h-3 w-3" />Reset</button>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Package className="h-3.5 w-3.5" />Total</div><p className="mt-1 text-2xl font-bold text-gray-800">{total}</p></div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-blue-700"><Play className="h-3.5 w-3.5" />In Progress</div><p className="mt-1 text-2xl font-bold text-blue-800">{inProgress}</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Completed</div><p className="mt-1 text-2xl font-bold text-emerald-800">{completed}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Rework</div><p className="mt-1 text-2xl font-bold text-amber-800">{rework}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-gray-400" /><h2 className="text-sm font-semibold text-gray-700">Distribusi Stage</h2></div>
          <div className="space-y-2.5">
            {stageEntries.map(({ stage, label, count }) => (
              <Link key={stage} href={`/integrated-system/dashboard/admin/oprprd/monitoring?stage=${stage}`} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-indigo-50/50 transition-colors">
                <span className="w-28 flex-shrink-0 text-xs text-gray-600 truncate">{label}</span>
                <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? "8px" : "0" }} /></div>
                <span className="w-8 text-right text-xs font-semibold text-gray-700">{count}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Order Terbaru</h2>
          {recentOrders.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">Belum ada order</p> : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/integrated-system/tracking/${o.id}`} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <div className="flex-1 min-w-0"><span className="text-xs font-mono font-medium text-indigo-600">{o.kode_order}</span><p className="text-xs text-gray-500 mt-0.5 truncate">{o.nama}</p></div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-50 text-emerald-700" : o.tracking?.[0]?.stage_status === "rework" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? "-"}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/integrated-system/dashboard/admin/oprprd/monitoring" className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50"><BarChart3 className="h-5 w-5 text-indigo-600" /></div>
          <div><p className="text-sm font-medium text-gray-800">Monitoring</p><p className="text-xs text-gray-500">Pantau semua order secara detail</p></div>
        </Link>
        <Link href="/integrated-system/dashboard/admin/oprprd/analisis" className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50"><ArrowRight className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-sm font-medium text-gray-800">Analisis</p><p className="text-xs text-gray-500">Analisis performa dan bottleneck</p></div>
        </Link>
      </div>
    </div>
  );
}
