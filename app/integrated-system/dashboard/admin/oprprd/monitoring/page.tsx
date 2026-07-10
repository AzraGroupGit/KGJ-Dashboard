"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import StageProgressBar from "@/components/integrated-system/stage-progress";
import Timeline from "@/components/integrated-system/timeline";
import {
  Search, ChevronDown, ChevronRight, X, AlertTriangle,
  Mail, Phone, MapPin,
} from "lucide-react";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null; last_synced_at: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

interface BottleneckStage {
  stage: string; label: string; stage_group: string;
  order_count: number; in_progress: number; waiting_orders: number;
  avg_hours: number; longest_hours: number;
  delayed_orders: Array<{ id: string; kode_order: string; nama: string; hours_waiting: number }>;
}

interface TrackingDetail {
  data: {
    order: { id: string; kode_order: string; nama: string; email: string | null; no_hp: string | null; alamat: string | null; tgl_order: string | null; tgl_selesai: string | null; catatan: string | null; };
    tracking: { current_stage: string; stage_status: string } | null;
    history: Array<{ id: string; stage: string; status: string; note: string | null; created_at: string; changed_by_user?: { full_name: string } | null }>;
  };
}

export default function OprPrdMonitoringPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bnFilter, setBnFilter] = useState<string>("all");
  const [expandedBn, setExpandedBn] = useState<string | null>(null);
  const [popupOrderId, setPopupOrderId] = useState<string | null>(null);
  const [popupTab, setPopupTab] = useState<"info" | "stages">("info");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (stageFilter !== "all") params.set("stage", stageFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  params.set("limit", "100");

  const { data } = useQuery<{ data: OrderItem[]; count: number }>({
    queryKey: ["integrated-system", "admin", "oprprd", "monitoring", search, stageFilter, statusFilter],
    queryFn: () => fetcher(`/api/integrated-system/admin/oprprd/monitoring?${params}`),
    refetchInterval: 60_000,
  });

  const { data: bnData } = useQuery<{ data: { total_orders: number; bottlenecks: BottleneckStage[] } }>({
    queryKey: ["integrated-system", "admin", "oprprd", "bottleneck"],
    queryFn: () => fetcher("/api/integrated-system/admin/oprprd/bottleneck"),
    refetchInterval: 60_000,
  });

  const { data: popupData, isFetching: popupLoading } = useQuery<TrackingDetail>({
    queryKey: ["integrated-system", "tracking", popupOrderId],
    queryFn: () => fetcher(`/api/integrated-system/tracking/${popupOrderId}`),
    enabled: !!popupOrderId,
  });

  const orders = data?.data ?? [];
  const inProgressCount = orders.filter((o) => o.tracking?.[0]?.stage_status === "in_progress").length;
  const completedCount = orders.filter((o) => o.tracking?.[0]?.stage_status === "completed").length;
  const reworkCount = orders.filter((o) => o.tracking?.[0]?.stage_status === "rework").length;

  const bottlenecks = bnData?.data?.bottlenecks ?? [];
  const totalOrders = bnData?.data?.total_orders ?? 0;
  const filteredBn = bnFilter === "all"
    ? bottlenecks
    : bottlenecks.filter((b) => b.stage_group === bnFilter);
  const criticalBn = bottlenecks.filter((b) => b.avg_hours > 24).length;

  const popupOrder = popupData?.data?.order;
  const popupTracking = popupData?.data?.tracking;
  const popupHistory = popupData?.data?.history ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-[#f0f4ff] tracking-tight">Monitoring OPR-PRD</h2>
          <p className="text-sm text-white/40 mt-0.5">Pantau order dari sistem live secara terpadu</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari order / customer..." className="w-52 rounded-md border border-[#c9a227]/20 bg-[#2a2522] px-3 py-1.5 pl-8 text-xs text-[#e8e2d4] shadow-sm placeholder:text-white/20 focus:border-[#c9a227]/40 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="rounded-md border border-[#c9a227]/20 bg-[#2a2522] px-2.5 py-1.5 text-xs text-[#e8e2d4] focus:border-[#c9a227]/40 focus:outline-none">
              <option value="all">Semua Stage</option>
              {STAGE_SEQUENCE.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[#c9a227]/20 bg-[#2a2522] px-2.5 py-1.5 text-xs text-[#e8e2d4] focus:border-[#c9a227]/40 focus:outline-none">
              <option value="all">Semua Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rework">Rework</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Order Aktif</p>
          <p className="mt-1 text-xl font-bold text-[#f0f4ff]">{totalOrders}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/60">Selesai</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/5 p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#c9a227]/60">In Progress</p>
          <p className="mt-1 text-xl font-bold text-[#c9a227]">{inProgressCount}</p>
        </div>
        <div className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-red-400/60">Rework</p>
          <p className="mt-1 text-xl font-bold text-red-300">{reworkCount}</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Bottleneck</p>
          <p className={`mt-1 text-xl font-bold ${criticalBn > 0 ? "text-red-300" : "text-emerald-300"}`}>
            {criticalBn > 0 ? `${criticalBn} kritis` : "Normal"}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[#c9a227]/10 bg-[#2a2522] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#c9a227]/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#d4ae3a]" />
            <h3 className="text-sm font-semibold text-[#e8e2d4]">Bottleneck — Semua Stage</h3>
            <span className="rounded-full bg-[#c9a227]/10 px-2 py-0.5 text-[10px] text-[#c9a227]">{totalOrders} aktif</span>
          </div>
          <div className="flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
            {(["all", "production", "operational"] as const).map((g) => {
              const count = g === "all" ? bottlenecks.length : bottlenecks.filter((b) => b.stage_group === g).length;
              return (
                <button key={g} onClick={() => setBnFilter(g)} className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${bnFilter === g ? "bg-[#c9a227]/15 text-[#c9a227]" : "text-white/30 hover:text-white/50"}`}>
                  {g === "all" ? "Semua" : g === "production" ? "Produksi" : "Operasional"} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filteredBn.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/30">Tidak ada bottleneck</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#c9a227]/5">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider w-40">Tahap</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Order</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">Rata-rata</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Terlama</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Order Terlambat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c9a227]/5">
                {filteredBn.map((bn) => (
                  <>
                    <tr key={bn.stage} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandedBn(expandedBn === bn.stage ? null : bn.stage)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expandedBn === bn.stage ? <ChevronDown className="h-3.5 w-3.5 text-white/30" /> : <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
                          <span className={`h-2 w-2 rounded-full ${bn.stage_group === "production" ? "bg-amber-400" : "bg-blue-400"}`} />
                          <span className="text-xs font-medium text-[#e8e2d4]">{bn.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-[#e8e2d4]">{bn.order_count}{bn.waiting_orders > 0 ? ` (${bn.waiting_orders} tunggu)` : ""}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs ${bn.avg_hours > 24 ? "text-red-300" : bn.avg_hours > 8 ? "text-[#d4ae3a]" : "text-emerald-300"}`}>{bn.avg_hours}h</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs ${bn.longest_hours > 48 ? "text-red-300" : bn.longest_hours > 24 ? "text-[#d4ae3a]" : "text-white/30"}`}>{bn.longest_hours}h</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {bn.delayed_orders.map((o) => (
                            <button key={o.id} onClick={(e) => { e.stopPropagation(); setPopupOrderId(o.id); }} className="block text-[11px] text-[#c9a227] hover:underline">
                              {o.kode_order} ({o.hours_waiting}h)
                            </button>
                          ))}
                          {bn.delayed_orders.length === 0 && <span className="text-[11px] text-white/20">-</span>}
                        </div>
                      </td>
                    </tr>
                    {expandedBn === bn.stage && orders.filter((o) => o.tracking?.[0]?.current_stage === bn.stage).slice(0, 10).map((o) => (
                      <tr key={o.id} className="bg-white/[0.01]">
                        <td className="px-4 py-2 pl-12">
                          <button onClick={() => setPopupOrderId(o.id)} className="text-[11px] font-mono text-[#c9a227] hover:underline">{o.kode_order}</button>
                        </td>
                        <td className="px-4 py-2 text-[11px] text-[#e8e2d4]">{o.nama}</td>
                        <td className="px-4 py-2 text-[11px] text-white/30 hidden sm:table-cell">{Math.round((Date.now() - new Date(o.last_synced_at ?? o.tgl_order ?? Date.now()).getTime()) / 3600000)}h</td>
                        <td className="px-4 py-2 hidden md:table-cell">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-500/[0.08] text-emerald-300" : o.tracking?.[0]?.stage_status === "rework" ? "bg-red-500/[0.08] text-red-300" : "bg-[#c9a227]/10 text-[#c9a227]"}`}>
                            {(o.tracking?.[0]?.stage_status ?? "-").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td />
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {popupOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPopupOrderId(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-[#2a2522] shadow-xl border border-[#c9a227]/10" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-[#2a2522] border-b border-[#c9a227]/5 px-5 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <span className="font-mono text-xs font-semibold text-white/40">{popupOrder?.kode_order}</span>
                  <h3 className="text-sm font-semibold text-[#f0f4ff] mt-0.5 truncate">{popupOrder?.nama}</h3>
                  {popupTracking && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 ${
                      popupTracking.stage_status === "completed" ? "bg-emerald-500/[0.08] text-emerald-300" :
                      popupTracking.stage_status === "rework" ? "bg-red-500/[0.08] text-red-300" :
                      "bg-[#c9a227]/10 text-[#c9a227]"
                    }`}>
                      {STAGE_LABELS[popupTracking.current_stage as keyof typeof STAGE_LABELS] ?? popupTracking.current_stage}
                    </span>
                  )}
                </div>
                <button onClick={() => setPopupOrderId(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.04]">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {popupLoading ? (
              <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9a227]/20 border-t-[#c9a227]" /></div>
            ) : popupOrder ? (
              <>
                <div className="flex border-b border-[#c9a227]/5 px-5">
                  {(["info", "stages"] as const).map((t) => (
                    <button key={t} onClick={() => setPopupTab(t)}
                      className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${popupTab === t ? "border-[#c9a227] text-[#f0f4ff]" : "border-transparent text-white/40 hover:text-[#e8e2d4]"}`}
                    >
                      {t === "info" ? "Info Order" : "Riwayat Tahap"}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-4">
                  {popupTab === "info" && (
                    <>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-2">Pelanggan</p>
                        <div className="rounded-lg bg-[#1C1917] p-3 space-y-1">
                          <p className="text-sm font-semibold text-[#f0f4ff]">{popupOrder.nama}</p>
                          {popupOrder.email && <p className="text-xs text-white/40 flex items-center gap-1"><Mail className="h-3 w-3" />{popupOrder.email}</p>}
                          {popupOrder.no_hp && <p className="text-xs text-white/40 flex items-center gap-1"><Phone className="h-3 w-3" />{popupOrder.no_hp}</p>}
                          {popupOrder.alamat && <p className="text-xs text-white/40 flex items-center gap-1"><MapPin className="h-3 w-3" />{popupOrder.alamat}</p>}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-2">Tanggal</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {popupOrder.tgl_order && (
                            <div className="bg-[#1C1917] rounded p-2">
                              <span className="text-white/40">Tgl Order</span>
                              <p className="font-medium text-[#e8e2d4]">{new Date(popupOrder.tgl_order).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                          )}
                          <div className="bg-[#1C1917] rounded p-2">
                            <span className="text-white/40">Deadline</span>
                            <p className={`font-medium ${popupOrder.tgl_selesai && new Date(popupOrder.tgl_selesai) < new Date() ? "text-red-300" : "text-[#e8e2d4]"}`}>
                              {popupOrder.tgl_selesai ? new Date(popupOrder.tgl_selesai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "\u2014"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-2">Progress Stage</p>
                        <div className="rounded-lg bg-[#1C1917] p-4">
                          <StageProgressBar currentStage={popupTracking?.current_stage ?? "penerimaan_order"} stageStatus={popupTracking?.stage_status ?? "in_progress"} />
                        </div>
                      </div>

                      {popupOrder.catatan && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-2">Catatan</p>
                          <div className="rounded-lg bg-[#1C1917] p-3 text-xs text-[#e8e2d4]">{popupOrder.catatan}</div>
                        </div>
                      )}
                    </>
                  )}

                  {popupTab === "stages" && (
                    popupHistory.length > 0 ? (
                      <Timeline history={popupHistory as never} />
                    ) : (
                      <p className="text-sm text-white/40 text-center py-8">Belum ada riwayat tahap</p>
                    )
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
