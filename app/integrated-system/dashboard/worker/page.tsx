"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher, mutator } from "@/lib/api";
import { STAGE_LABELS, STAGE_SEQUENCE, getNextStage, type StageName } from "@/services/integrated-system/tracking.service";
import { Loader2, ClipboardList, Clock, ChevronDown, ChevronUp, Search, X, RefreshCw } from "lucide-react";
import { getClientUser } from "@/lib/auth/session";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null; catatan: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

export default function WorkerDashboard() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"deadline" | "newest">("deadline");

  const user = getClientUser();
  const userId = user?.id ?? null;

  const { data, isFetching } = useQuery<{ data: OrderItem[] }>({
    queryKey: ["integrated-system", "worker", "orders", userId],
    queryFn: () => fetcher(`/api/integrated-system/worker/orders?limit=100`),
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  const handleSubmit = async (orderId: string, stage: string) => {
    const next = getNextStage(stage); if (!next) return;
    setSubmitting(orderId); setError("");
    try {
      await mutator("/api/integrated-system/worker/submit", {
        method: "PUT",
        body: { orderId, currentStage: stage, note: note || undefined },
      });
      setNote(""); setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(null); }
  };

  const activeOrders = useMemo(() => {
    const allOrders = data?.data ?? [];
    let list = allOrders.filter((o) => o.tracking?.[0]?.stage_status !== "completed");

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) => {
        const stageLabel = (STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? "").toLowerCase();
        return o.kode_order.toLowerCase().includes(q) || o.nama.toLowerCase().includes(q) || stageLabel.includes(q);
      });
    }

    if (sortBy === "deadline") {
      list = [...list].sort((a, b) => {
        if (!a.tgl_selesai && !b.tgl_selesai) return 0;
        if (!a.tgl_selesai) return 1;
        if (!b.tgl_selesai) return -1;
        return new Date(a.tgl_selesai).getTime() - new Date(b.tgl_selesai).getTime();
      });
    } else {
      list = [...list].sort((a, b) => new Date(b.tgl_order ?? 0).getTime() - new Date(a.tgl_order ?? 0).getTime());
    }

    return list;
  }, [data, search, sortBy]);

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {error && (
        <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-[12px] text-red-600">{error}</div>
      )}

      <div className="relative mb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 pointer-events-none" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No. Order atau tahap..."
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-[14px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "deadline")}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all"
          >
            <option value="deadline">Deadline ⬆</option>
            <option value="newest">Terbaru</option>
          </select>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["integrated-system", "worker", "orders"] })}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <div className="h-8 w-8 rounded-full border-2 border-stone-100 border-t-amber-400 animate-spin" />
            <p className="text-[13px] text-stone-400">Memuat order...</p>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 px-6 text-center">
            <ClipboardList className="h-10 w-10 text-stone-200" strokeWidth={1.5} />
            <p className="text-[14px] font-medium text-stone-400">
              {search ? "Order tidak ditemukan" : "Tidak ada order yang perlu ditangani saat ini"}
            </p>
            {search && <p className="text-[12px] text-stone-300">Coba kata kunci lain</p>}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {activeOrders.map((order) => {
              const t = order.tracking?.[0]; const stage = t?.current_stage ?? ""; const next = getNextStage(stage);
              const isExpanded = expandedId === order.id;
              const stageIdx = STAGE_SEQUENCE.indexOf(stage as StageName);
              const progressPercent = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_SEQUENCE.length) * 100) : 0;
              const isRework = t?.stage_status === "rework";

              const getDeadlineInfo = () => {
                if (!order.tgl_selesai) return null;
                const deadline = new Date(order.tgl_selesai);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (new Date(order.tgl_selesai) < new Date()) return { label: `${Math.abs(diffDays)} hari terlambat`, urgent: true };
                if (diffDays <= 2) return { label: `${diffDays}h`, urgent: true };
                return { label: diffDays + "h", urgent: false };
              };
              const deadlineInfo = getDeadlineInfo();

              const isApprovalNext = next?.startsWith("approval_");
              return (
                <li key={order.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    disabled={!!submitting}
                    className="w-full text-left hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:opacity-60"
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-[12px] font-semibold text-stone-500">
                              {order.kode_order}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              isRework ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-500"
                            }`}>
                              {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}
                            </span>
                          </div>
                          <p className="text-[14px] font-medium text-stone-700 mb-1 truncate">{order.nama}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-stone-100">
                              <div className={`h-1 rounded-full ${progressPercent >= 100 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${progressPercent}%` }} />
                            </div>
                            <span className="text-[10px] text-stone-400">{progressPercent}%</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {deadlineInfo && (
                            <span className={`text-[10px] ${deadlineInfo.urgent ? "text-red-500" : "text-stone-400"}`}>
                              <Clock className="h-2.5 w-2.5 inline mr-0.5" />{deadlineInfo.label}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-stone-300" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-stone-300" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-stone-100">
                          <div className="flex items-center gap-1 mb-3">
                            {STAGE_SEQUENCE.map((s, i) => (
                              <div key={s} className="flex-1" title={STAGE_LABELS[s]}>
                                <div className={`h-1.5 rounded-full ${i < stageIdx ? "bg-emerald-400" : i === stageIdx ? "bg-amber-400" : "bg-stone-100"}`} />
                              </div>
                            ))}
                          </div>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Catatan (opsional)..."
                            rows={2}
                            disabled={!!submitting}
                            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50 mb-2"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSubmit(order.id, stage); }}
                            disabled={!next || !!submitting}
                            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                          >
                            {submitting === order.id ? (
                              <span className="flex items-center justify-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Menyimpan...</span>
                            ) : next ? (
                              isApprovalNext
                                ? "Selesai — Menunggu persetujuan supervisor"
                                : `Selesai — Lanjut ke ${STAGE_LABELS[next as keyof typeof STAGE_LABELS] ?? next}`
                            ) : (
                              "Stage terakhir"
                            )}
                          </button>
                          {order.tgl_selesai && (
                            <p className="mt-2 text-center text-[10px] text-stone-400">
                              Deadline: {new Date(order.tgl_selesai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
