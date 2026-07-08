"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, RefreshCw, User } from "lucide-react";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

export default function AdminOprPrdMonitoringPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (stageFilter !== "all") params.set("stage", stageFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, isLoading } = useQuery<{ data: OrderItem[]; count: number; page: number; limit: number }>({
    queryKey: ["integrated-system", "admin", "oprprd", "monitoring", search, stageFilter, statusFilter, page],
    queryFn: () => fetcher(`/api/integrated-system/admin/oprprd/monitoring?${params}`),
    refetchInterval: 30_000,
  });

  const orders = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);
  const hasFilters = search || stageFilter !== "all" || statusFilter !== "all";

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-gray-200 mb-6" />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Monitoring OPR-PRD</h1>
        <p className="mt-1 text-sm text-gray-500">Pantau semua order dari sistem live</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari kode order atau nama..." className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
          <option value="all">Semua Stage</option>
          {STAGE_SEQUENCE.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
          <option value="all">Semua Status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rework">Rework</option>
        </select>
        {hasFilters && <button onClick={() => { setSearch(""); setStageFilter("all"); setStatusFilter("all"); setPage(1); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-100"><RefreshCw className="h-3 w-3" />Reset</button>}
      </div>

      <p className="mb-3 text-xs text-gray-500">{totalCount} order ditemukan</p>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/integrated-system/tracking/${o.id}`} className="text-xs font-mono font-medium text-indigo-600 hover:underline">{o.kode_order}</Link>
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-sm text-gray-800"><User className="h-3.5 w-3.5 text-gray-400" />{o.nama}</div></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.tgl_order ? new Date(o.tgl_order).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? "-"}</span></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-50 text-emerald-700" : o.tracking?.[0]?.stage_status === "rework" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{(o.tracking?.[0]?.stage_status ?? "-").replace(/_/g, " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Tidak ada order ditemukan</div>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
