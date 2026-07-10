"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS, STAGE_SEQUENCE, type StageName } from "@/services/integrated-system/tracking.service";
import { Search, ChevronLeft, ChevronRight, User, Calendar, Clock, RefreshCw, X } from "lucide-react";
import StageProgressBar from "@/components/integrated-system/stage-progress";
import Timeline from "@/components/integrated-system/timeline";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null; last_synced_at: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

const TABS = ["all", "in_progress", "rework", "completed"] as const;

export default function SupervisorMonitoringPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<typeof TABS[number]>("all");
  const [popupOrderId, setPopupOrderId] = useState<string | null>(null);
  const [popupTab, setPopupTab] = useState<"info" | "stages">("info");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tab !== "all") params.set("status", tab === "completed" ? "completed" : tab);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, isLoading } = useQuery<{ data: OrderItem[]; count: number; page: number; limit: number }>({
    queryKey: ["integrated-system", "supervisor", "monitoring", search, tab, page],
    queryFn: () => fetcher(`/api/integrated-system/supervisor/monitoring?${params}`),
    refetchInterval: 30_000,
  });

  const orders = data?.data ?? [];
  const allOrders = orders;
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);
  const inProgress = allOrders.filter((o) => o.tracking?.[0]?.stage_status === "in_progress").length;
  const rework = allOrders.filter((o) => o.tracking?.[0]?.stage_status === "rework").length;
  const completed = allOrders.filter((o) => o.tracking?.[0]?.stage_status === "completed").length;
  const activeCount = tab === "all" ? totalCount : tab === "completed" ? completed : tab === "rework" ? rework : inProgress;

  const { data: popupData, isFetching: popupLoading } = useQuery<{ data: { order: { kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null; catatan: string | null }; tracking: { current_stage: string; stage_status: string } | null; history: Array<{ id: string; stage: string; status: string; note: string | null; created_at: string }> } }>({
    queryKey: ["integrated-system", "tracking", popupOrderId],
    queryFn: () => fetcher(`/api/integrated-system/tracking/${popupOrderId}`),
    enabled: !!popupOrderId,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-white/[0.04] mb-6" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/[0.03]" />)}
        </div>
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03]" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#f0f4ff]">Monitoring Workshop</h1>
          <p className="text-xs sm:text-sm text-white/40">Status real-time semua order dari sistem live</p>
        </div>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ["integrated-system", "supervisor"] })} className="rounded-lg p-2 text-white/30 hover:bg-white/[0.04]">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Total Aktif</p>
          <p className="text-xl font-bold text-[#f0f4ff]">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9a227]/60">In Progress</p>
          <p className="text-xl font-bold text-[#c9a227]">{inProgress}</p>
        </div>
        <div className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/60">Perlu Tindakan</p>
          <p className="text-xl font-bold text-red-300">{rework}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/60">Selesai</p>
          <p className="text-xl font-bold text-emerald-300">{completed}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari kode order atau nama..." className="w-full rounded-md border border-[#c9a227]/20 bg-[#2a2522] py-2 pl-9 pr-4 text-sm text-[#e8e2d4] placeholder:text-white/20 focus:border-[#c9a227]/40 focus:outline-none" />
        </div>
        <div className="flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${tab === t ? "bg-[#c9a227]/15 text-[#c9a227]" : "text-white/30 hover:text-white/50"}`}>
              {t === "all" ? "Semua" : t === "in_progress" ? "In Progress" : t === "rework" ? "Rework" : "Selesai"}
            </button>
          ))}
        </div>
        {search && <button onClick={() => setSearch("")} className="text-xs text-white/30 hover:text-white/50"><RefreshCw className="h-3 w-3" /></button>}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-[#c9a227]/5 bg-[#2a2522] py-16 text-center">
          <p className="text-sm text-white/30">Tidak ada order ditemukan</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-white/30">{activeCount} order</p>
          <div className="space-y-2">
            {orders.map((o) => {
              const stage = o.tracking?.[0]?.current_stage ?? "penerimaan_order";
              const stageIdx = STAGE_SEQUENCE.indexOf(stage as StageName);
              const progressPercent = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_SEQUENCE.length) * 100) : 0;
              const waitHours = Math.round((Date.now() - new Date(o.last_synced_at ?? o.tgl_order ?? Date.now()).getTime()) / 3600000);

              return (
                <button key={o.id} onClick={() => setPopupOrderId(o.id)} className="block rounded-xl border border-[#c9a227]/5 bg-[#2a2522] p-4 hover:border-[#c9a227]/20 transition-all w-full text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#c9a227]/10 px-2 py-0.5 text-[10px] font-mono font-medium text-[#c9a227]">{o.kode_order}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-500/[0.08] text-emerald-300" : o.tracking?.[0]?.stage_status === "rework" ? "bg-red-500/[0.08] text-red-300" : "bg-[#c9a227]/10 text-[#c9a227]"}`}>
                        {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/30">{progressPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#e8e2d4] mb-2"><User className="h-3.5 w-3.5 text-white/20" />{o.nama}</div>
                  <div className="h-1 w-full rounded-full bg-white/[0.04] mb-2">
                    <div className={`h-1 rounded-full ${progressPercent >= 100 ? "bg-emerald-400" : progressPercent >= 50 ? "bg-[#c9a227]" : "bg-[#d4ae3a]"}`} style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-white/30">
                    {o.tgl_order && <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{new Date(o.tgl_order).toLocaleDateString("id-ID")}</span>}
                    {waitHours > 0 && <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{waitHours}j</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[#c9a227]/10 px-3 py-1.5 text-sm text-[#e8e2d4] hover:bg-white/[0.04] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-white/30">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-[#c9a227]/10 px-3 py-1.5 text-sm text-[#e8e2d4] hover:bg-white/[0.04] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
      {popupOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPopupOrderId(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-[#2a2522] shadow-xl border border-[#c9a227]/10" onClick={(e) => e.stopPropagation()}>
            {popupLoading ? (
              <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9a227]/20 border-t-[#c9a227]" /></div>
            ) : popupData?.data?.order ? (
              <>
                <div className="sticky top-0 z-10 bg-[#2a2522] border-b border-[#c9a227]/5 px-5 py-4 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-3">
                      <span className="font-mono text-xs font-semibold text-white/40">{popupData.data.order.kode_order}</span>
                      <h3 className="text-sm font-semibold text-[#f0f4ff] mt-0.5 truncate">{popupData.data.order.nama}</h3>
                    </div>
                    <button onClick={() => setPopupOrderId(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.04]"><X className="h-5 w-5" /></button>
                  </div>
                </div>
                <div className="flex border-b border-[#c9a227]/5 px-5">
                  {(["info", "stages"] as const).map((t) => (
                    <button key={t} onClick={() => setPopupTab(t)} className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${popupTab === t ? "border-[#c9a227] text-[#f0f4ff]" : "border-transparent text-white/40 hover:text-[#e8e2d4]"}`}>
                      {t === "info" ? "Info" : "Riwayat"}
                    </button>
                  ))}
                </div>
                <div className="p-5">
                  {popupTab === "info" ? (
                    <StageProgressBar currentStage={popupData.data.tracking?.current_stage ?? "penerimaan_order"} stageStatus={popupData.data.tracking?.stage_status ?? "in_progress"} />
                  ) : (
                    popupData.data.history.length > 0 ? <Timeline history={popupData.data.history as never} /> : <p className="text-sm text-white/40 text-center py-8">Belum ada riwayat</p>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-white/30">Order tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
