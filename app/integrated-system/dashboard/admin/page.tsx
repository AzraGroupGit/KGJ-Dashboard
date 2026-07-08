"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import SyncStatus from "@/components/integrated-system/sync-status";
import { STAGE_LABELS, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import Link from "next/link";
import {
  RefreshCw, Loader2, Package, Play, CheckCircle2, ArrowRight,
  ClipboardList, BarChart3, ExternalLink, User,
  AlertTriangle,
} from "lucide-react";

interface AdminOverview {
  total: number; inProgress: number; completed: number; rework: number;
  totalCount: number;
  stageCounts: Record<string, number>;
  recentOrders: Array<{ id: string; kode_order: string; nama: string; tgl_order: string | null; tracking: { current_stage: string; stage_status: string }[] }>;
  lastSync: { orders_synced: number; status: string; created_at: string } | null;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (stageFilter !== "all") params.set("stage", stageFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);

  const { data, isLoading } = useQuery<{ data: AdminOverview }>({
    queryKey: ["integrated-system", "admin", "overview", search, stageFilter, statusFilter],
    queryFn: () => fetcher(`/api/integrated-system/admin/overview?${params}`),
    refetchInterval: 30_000,
  });

  const overview = data?.data;

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
          <div className="h-7 w-28 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-48 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100 mb-4" />
          {[...Array(9)].map((_, i) => (
            <div key={i} className="mb-2.5 flex items-center gap-3">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-5 flex-1 animate-pulse rounded-full bg-gray-100" />
              <div className="h-3 w-6 animate-pulse rounded bg-gray-100" />
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
  const recentOrders = overview?.recentOrders ?? [];

  const hasFilters = search || stageFilter !== "all" || statusFilter !== "all";

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview order dari sistem live</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus lastSyncAt={overview?.lastSync?.created_at ?? null} />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing ? "Sync..." : "Sync Sekarang"}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="mt-3 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">{syncResult}</div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Package className="h-3.5 w-3.5" />Total Order
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-800">{totalOrders}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">{hasFilters ? "Difilter" : "Semua periode"}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
            <Play className="h-3.5 w-3.5" />In Progress
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-800">{inProgress}</p>
          <p className="mt-0.5 text-[11px] text-blue-500">{totalOrders > 0 ? Math.round((inProgress / totalOrders) * 100) : 0}% dari total</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />Completed
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{completed}</p>
          <p className="mt-0.5 text-[11px] text-emerald-500">{totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0}% dari total</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <RefreshCw className="h-3.5 w-3.5" />Ter-sync
          </div>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{totalSynced}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Sinkron terakhir</p>
        </div>
      </div>

      {rework > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />{rework} order memerlukan perbaikan (rework)
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 mb-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode order atau nama..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">Semua Stage</option>
          {STAGE_SEQUENCE.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">Semua Status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rework">Rework</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setStageFilter("all"); setStatusFilter("all"); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-100">
            <RefreshCw className="h-3 w-3" />Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Distribusi Stage</h2>
            </div>
            <Link href="/integrated-system/orders" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {stageEntries.map(({ stage, label, count }) => (
              <Link
                key={stage}
                href={`/integrated-system/orders?stage=${stage}`}
                className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-indigo-50/50 transition-colors"
              >
                <span className="w-28 flex-shrink-0 text-xs text-gray-600 truncate">{label}</span>
                <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-500"
                    style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? "8px" : "0" }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold text-gray-700">{count}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Order Terbaru</h2>
            </div>
            <Link href="/integrated-system/orders" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Semua <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-400">Belum ada order</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/integrated-system/tracking/${o.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-indigo-600 truncate">{o.kode_order}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{o.nama}</span>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-50 text-emerald-700" :
                    o.tracking?.[0]?.stage_status === "rework" ? "bg-amber-50 text-amber-700" :
                    "bg-blue-50 text-blue-700"
                  }`}>
                    {STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? o.tracking?.[0]?.current_stage ?? "-"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/integrated-system/orders"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Daftar Order</p>
            <p className="text-xs text-gray-500">Cari dan filter semua order</p>
          </div>
        </Link>
        <Link
          href="/integrated-system/dashboard/supervisor"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Play className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Kanban Supervisor</p>
            <p className="text-xs text-gray-500">Pantau dan kelola stage order</p>
          </div>
        </Link>
        <Link
          href="/integrated-system/dashboard/admin/oprprd/monitoring"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
            <BarChart3 className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Monitoring OPR-PRD</p>
            <p className="text-xs text-gray-500">Pantau progres produksi detail</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
