"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS, STAGE_SEQUENCE, type StageName } from "@/services/integrated-system/tracking.service";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, User, Calendar, Clock, RefreshCw } from "lucide-react";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

export default function SupervisorMonitoringPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, isLoading } = useQuery<{ data: OrderItem[]; count: number; page: number; limit: number }>({
    queryKey: ["integrated-system", "supervisor", "monitoring", search, page],
    queryFn: () => fetcher(`/api/integrated-system/supervisor/monitoring?${params}`),
    refetchInterval: 30_000,
  });

  const orders = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);

  if (isLoading) {
    return <div className="p-4 sm:p-6 animate-pulse"><div className="h-7 w-48 rounded bg-gray-200 mb-6" /><div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100" />)}</div></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Monitoring</h1>
        <p className="mt-1 text-sm text-gray-500">Pantau semua order aktif dari sistem live</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari kode order atau nama..." className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
        {search && <button onClick={() => { setSearch(""); setPage(1); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-100"><RefreshCw className="h-3 w-3" />Reset</button>}
      </div>

      <p className="mb-3 text-xs text-gray-500">{totalCount} order ditemukan</p>

      <div className="space-y-2">
        {orders.map((o) => {
          const stage = o.tracking?.[0]?.current_stage ?? "penerimaan_order";
          const stageIdx = STAGE_SEQUENCE.indexOf(stage as StageName);
          const progressPercent = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_SEQUENCE.length) * 100) : 0;

          return (
            <Link key={o.id} href={`/integrated-system/tracking/${o.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-600">{o.kode_order}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-50 text-emerald-700" : o.tracking?.[0]?.stage_status === "rework" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                    {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">{progressPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 mb-2"><User className="h-3.5 w-3.5 text-gray-400" />{o.nama}</div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${progressPercent >= 100 ? "bg-emerald-400" : progressPercent >= 50 ? "bg-indigo-400" : "bg-blue-400"}`} style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
                {o.tgl_order && <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{new Date(o.tgl_order).toLocaleDateString("id-ID")}</span>}
                {o.tgl_selesai && <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Deadline: {new Date(o.tgl_selesai).toLocaleDateString("id-ID")}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {orders.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Tidak ada order ditemukan</div>}

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
