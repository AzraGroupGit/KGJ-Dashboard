"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import SyncStatus from "@/components/integrated-system/sync-status";
import { STAGE_LABELS, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import Link from "next/link";
import {
  RefreshCw, Loader2, Package, Play, CheckCircle2, Search, ChevronLeft, ChevronRight,
  AlertTriangle, User,
} from "lucide-react";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

interface AdminOverview {
  total: number; inProgress: number; completed: number; rework: number;
  totalCount: number;
  stageCounts: Record<string, number>;
  recentOrders: OrderItem[];
  lastSync: { orders_synced: number; status: string; created_at: string } | null;
}

interface MonitoringData {
  data: OrderItem[]; count: number; page: number; limit: number;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const overviewParams = new URLSearchParams();
  if (search) overviewParams.set("search", search);
  if (stageFilter !== "all") overviewParams.set("stage", stageFilter);
  if (statusFilter !== "all") overviewParams.set("status", statusFilter);

  const { data, isLoading } = useQuery<{ data: AdminOverview }>({
    queryKey: ["integrated-system", "admin", "overview", search, stageFilter, statusFilter],
    queryFn: () => fetcher(`/api/integrated-system/admin/overview?${overviewParams}`),
    refetchInterval: 30_000,
  });

  const monitoringParams = new URLSearchParams();
  if (search) monitoringParams.set("search", search);
  if (stageFilter !== "all") monitoringParams.set("stage", stageFilter);
  if (statusFilter !== "all") monitoringParams.set("status", statusFilter);
  monitoringParams.set("page", String(page));
  monitoringParams.set("limit", "20");

  const { data: monitoringData, isLoading: monitoringLoading } = useQuery<MonitoringData>({
    queryKey: ["integrated-system", "admin", "monitoring", search, stageFilter, statusFilter, page],
    queryFn: () => fetcher(`/api/integrated-system/admin/oprprd/monitoring?${monitoringParams}`),
    refetchInterval: 30_000,
  });

  const overview = data?.data;
  const monitoringOrders = monitoringData?.data ?? [];
  const totalCount = monitoringData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);
  const hasFilters = search || stageFilter !== "all" || statusFilter !== "all";

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const r = await fetch("/api/integrated-system/sync", { method: "POST" });
      const json = await r.json();
      if (r.ok) {
        setSyncResult(`Berhasil: ${json.synced} order baru, ${json.skipped} dilewati${json.errors > 0 ? `, ${json.errors} error` : ""}`);
        queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
      } else {
        setSyncResult(`Gagal: ${json.error || "Unknown error"}`);
      }
    } catch {
      setSyncResult("Gagal menyinkronkan. Periksa koneksi ke live system.");
    } finally { setSyncing(false); }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <div className="h-7 w-28 animate-pulse rounded bg-white/[0.04]" />
          <div className="mt-1 h-4 w-48 animate-pulse rounded bg-white/[0.02]" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
              <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalOrders = overview?.total ?? 0;
  const inProgress = overview?.inProgress ?? 0;
  const completed = overview?.completed ?? 0;
  const rework = overview?.rework ?? 0;
  const totalSynced = overview?.lastSync?.orders_synced ?? 0;

  const stageEntries = STAGE_SEQUENCE.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: overview?.stageCounts?.[stage] ?? 0,
  }));
  const maxCount = Math.max(...stageEntries.map((s) => s.count), 1);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#f0f4ff]">Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">Overview order dari sistem live</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus lastSyncAt={overview?.lastSync?.created_at ?? null} />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#c9a227] px-3 py-2 text-xs font-medium text-[#15130f] hover:bg-[#d4ae3a] disabled:opacity-50 transition-colors"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing ? "Sync..." : "Sync Sekarang"}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="mb-4 rounded-lg bg-[#c9a227]/10 px-4 py-2.5 text-sm text-[#c9a227]">{syncResult}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-white/40"><Package className="h-3.5 w-3.5" />Total Order</div>
          <p className="mt-1 text-2xl font-bold text-[#f0f4ff]">{totalOrders}</p>
          <p className="mt-0.5 text-[11px] text-white/20">{hasFilters ? "Difilter" : "Semua periode"}</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/5 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-[#c9a227]"><Play className="h-3.5 w-3.5" />In Progress</div>
          <p className="mt-1 text-2xl font-bold text-[#d4ae3a]">{inProgress}</p>
          <p className="mt-0.5 text-[11px] text-[#c9a227]/50">{totalOrders > 0 ? Math.round((inProgress / totalOrders) * 100) : 0}% dari total</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Completed</div>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{completed}</p>
          <p className="mt-0.5 text-[11px] text-emerald-500/50">{totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0}% dari total</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-white/40"><RefreshCw className="h-3.5 w-3.5" />Ter-sync</div>
          <p className="mt-1 text-2xl font-bold text-[#c9a227]">{totalSynced}</p>
          <p className="mt-0.5 text-[11px] text-white/20">Sinkron terakhir</p>
        </div>
      </div>

      {rework > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/[0.08] px-4 py-2.5 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" />{rework} order memerlukan perbaikan (rework)
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari kode order atau nama..."
            className="w-full rounded-lg border border-[#c9a227]/20 bg-[#2a2522] py-2 pl-9 pr-4 text-sm text-[#e8e2d4] placeholder:text-white/20 focus:border-[#c9a227]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a227]/10"
          />
        </div>
        <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }} className="rounded-lg border border-[#c9a227]/20 bg-[#2a2522] px-3 py-2 text-sm text-[#e8e2d4] focus:border-[#c9a227]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a227]/10">
          <option value="all">Semua Stage</option>
          {STAGE_SEQUENCE.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-[#c9a227]/20 bg-[#2a2522] px-3 py-2 text-sm text-[#e8e2d4] focus:border-[#c9a227]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a227]/10">
          <option value="all">Semua Status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rework">Rework</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setStageFilter("all"); setStatusFilter("all"); setPage(1); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-white/40 hover:bg-white/[0.04]">
            <RefreshCw className="h-3 w-3" />Reset
          </button>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[#e8e2d4]">Distribusi Stage</h2>
        <div className="space-y-2.5">
          {stageEntries.map(({ stage, label, count }) => (
            <button
              key={stage}
              onClick={() => { setStageFilter(stageFilter === stage ? "all" : stage); setPage(1); }}
              className={`flex items-center gap-3 w-full rounded-lg px-2 py-1 transition-colors ${stageFilter === stage ? "bg-[#c9a227]/10" : "hover:bg-white/[0.02]"}`}
            >
              <span className="w-28 flex-shrink-0 text-xs text-[#e8e2d4] truncate text-left">{label}</span>
              <div className="flex-1 h-6 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full bg-[#c9a227] transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? "8px" : "0" }} />
              </div>
              <span className="w-8 text-right text-xs font-semibold text-[#e8e2d4]">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2 text-xs text-white/30">{totalCount} order ditemukan</p>

      <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[#c9a227]/5">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Kode Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Pelanggan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c9a227]/5">
              {monitoringOrders.map((o) => (
                <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/integrated-system/tracking/${o.id}`} className="text-xs font-mono font-medium text-[#c9a227] hover:underline">{o.kode_order}</Link>
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-sm text-[#e8e2d4]"><User className="h-3.5 w-3.5 text-white/20" />{o.nama}</div></td>
                  <td className="px-4 py-3 text-xs text-white/30">{o.tgl_order ? new Date(o.tgl_order).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[#c9a227]/10 px-2 py-0.5 text-[10px] font-medium text-[#c9a227]">{STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? "-"}</span></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-500/[0.08] text-emerald-300" : o.tracking?.[0]?.stage_status === "rework" ? "bg-red-500/[0.08] text-red-300" : "bg-[#c9a227]/10 text-[#c9a227]"}`}>{(o.tracking?.[0]?.stage_status ?? "-").replace(/_/g, " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {monitoringOrders.length === 0 && !monitoringLoading && <div className="py-12 text-center text-sm text-white/30">Tidak ada order ditemukan</div>}
        {monitoringLoading && <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-white/20 mx-auto" /></div>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[#c9a227]/10 px-3 py-1.5 text-sm text-[#e8e2d4] hover:bg-white/[0.04] disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-white/30">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-[#c9a227]/10 px-3 py-1.5 text-sm text-[#e8e2d4] hover:bg-white/[0.04] disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
