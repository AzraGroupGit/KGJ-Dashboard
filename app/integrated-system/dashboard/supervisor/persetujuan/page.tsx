"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher, mutator } from "@/lib/api";
import { STAGE_LABELS, getStageIndex, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import { Check, AlertCircle, Loader2, UserPlus, ArrowLeft, RefreshCw, Eye } from "lucide-react";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null;
  tracking: { current_stage: string; stage_status: string; assigned_to: string | null }[];
}

interface WorkerItem {
  id: string; full_name: string; role_name: string | null;
}

type FSM = "idle" | "confirming_approve" | "confirming_reject" | "loading" | "done";
type CardState = { orderId: string; fsm: FSM; remarks: string; targetStage: string; result?: "approved" | "rejected" };

const TABS = ["all", "rework", "unassigned"] as const;

const PRODUCTION_STAGES = new Set(["lebur_bahan", "pembentukan_cincin", "pemasangan_permata", "pemolesan", "cek_kadar", "finishing"]);

function getVerificationChecklist(stage: string): string[] {
  const stageName = STAGE_LABELS[stage] ?? stage;
  if (stage.startsWith("approval_")) return [`Verifikasi hasil untuk tahap ${stageName}`, "Periksa kualitas hasil kerja", "Pastikan sesuai standar yang ditentukan"];
  return ["Periksa kelengkapan data order", `Verifikasi hasil tahap ${stageName}`, "Pastikan tidak ada kesalahan input"];
}

export default function SupervisorPersetujuanPage() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cardState, setCardState] = useState<CardState | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>("all");
  const [showVerify, setShowVerify] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: OrderItem[] }>({
    queryKey: ["integrated-system", "supervisor", "approval"],
    queryFn: () => fetcher("/api/integrated-system/supervisor/approval"),
    refetchInterval: 30_000,
  });

  const { data: workersData } = useQuery<{ data: WorkerItem[] }>({
    queryKey: ["integrated-system", "supervisor", "workers"],
    queryFn: () => fetcher("/api/integrated-system/supervisor/workers"),
  });

  const orders = data?.data ?? [];
  const workers = workersData?.data ?? [];
  const reworkOrders = orders.filter((o) => o.tracking?.[0]?.stage_status === "rework");
  const unassignedOrders = orders.filter((o) => !o.tracking?.[0]?.assigned_to && o.tracking?.[0]?.stage_status !== "rework");
  const total = orders.length;

  const filteredOrders = tab === "all" ? orders : tab === "rework" ? reworkOrders : unassignedOrders;
  const oldestHours = orders.reduce((max, o) => {
    if (!o.tracking?.[0]) return max;
    const hrs = Math.round((Date.now() - new Date(o.tgl_order ?? Date.now()).getTime()) / 3600000);
    return Math.max(max, hrs);
  }, 0);

  const handleAssign = async (orderId: string, workerId: string | null) => {
    setSubmitting(orderId); setError("");
    try {
      await mutator("/api/integrated-system/supervisor/assign", { method: "PUT", body: { orderId, workerId } });
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(null); }
  };

  const startApprove = (order: OrderItem) => {
    setCardState({ orderId: order.id, fsm: "confirming_approve", remarks: "", targetStage: "" });
  };

  const startRework = (order: OrderItem) => {
    const currentStage = order.tracking?.[0]?.current_stage ?? "penerimaan_order";
    const prevIdx = getStageIndex(currentStage);
    setCardState({ orderId: order.id, fsm: "confirming_reject", remarks: "", targetStage: prevIdx > 0 ? STAGE_SEQUENCE[prevIdx - 1] : currentStage });
  };

  const executeAction = async () => {
    if (!cardState) return;
    const order = orders.find((o) => o.id === cardState.orderId);
    if (!order) return;

    setCardState((prev) => prev ? { ...prev, fsm: "loading" } : null);
    setSubmitting(order.id);

    try {
      if (cardState.fsm === "confirming_approve") {
        const currentStage = order.tracking?.[0]?.current_stage ?? "penerimaan_order";
        await mutator("/api/integrated-system/supervisor/approve", {
          method: "PUT",
          body: { orderId: order.id, currentStage, remarks: cardState.remarks || undefined },
        });
      } else {
        const target = cardState.targetStage || (getStageIndex(order.tracking?.[0]?.current_stage ?? "penerimaan_order") > 0 ? STAGE_SEQUENCE[getStageIndex(order.tracking?.[0]?.current_stage ?? "penerimaan_order") - 1] : order.tracking?.[0]?.current_stage ?? "penerimaan_order");
        await mutator("/api/integrated-system/supervisor/rework", {
          method: "PUT",
          body: { orderId: order.id, targetStage: target, reason: cardState.remarks || undefined },
        });
      }
      setCardState((prev) => prev ? { ...prev, fsm: "done", result: cardState.fsm === "confirming_approve" ? "approved" : "rejected" } : null);
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
      setCardState(null);
    } finally {
      setSubmitting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-white/[0.04] mb-6" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/[0.03]" />)}</div>
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/[0.03]" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#f0f4ff]">Persetujuan Tahap</h1>
          <p className="text-xs sm:text-sm text-white/40">Review dan setujui hasil kerja tim</p>
        </div>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ["integrated-system"] })} className="rounded-lg p-2 text-white/30 hover:bg-white/[0.04]"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {error && <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/[0.08] px-4 py-3 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Menunggu</p><p className="text-xl font-bold text-[#f0f4ff]">{total}</p></div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9a227]/60">Rework</p><p className="text-xl font-bold text-[#c9a227]">{reworkOrders.length}</p></div>
        <div className="rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Belum Assign</p><p className="text-xl font-bold text-[#c9a227]">{unassignedOrders.length}</p></div>
        <div className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/60">Paling Lama</p><p className="text-xl font-bold text-red-300">{oldestHours}h</p></div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-[#c9a227]/5 pb-0">
        {TABS.map((t) => {
          const count = t === "all" ? total : t === "rework" ? reworkOrders.length : unassignedOrders.length;
          return <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-[#c9a227] text-[#c9a227]" : "border-transparent text-white/40 hover:text-[#e8e2d4]"}`}>{t === "all" ? "Semua" : t === "rework" ? "Rework" : "Belum Assign"} ({count})</button>;
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-[#c9a227]/5 bg-[#2a2522] py-16 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-300" />
          <p className="mt-3 text-sm font-medium text-[#e8e2d4]">Semua order sudah tertangani</p>
          <p className="mt-1 text-xs text-white/30">Tidak ada order yang memerlukan tindakan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((o) => {
            const isRework = o.tracking?.[0]?.stage_status === "rework";
            const currentStage = o.tracking?.[0]?.current_stage ?? "";
            const isProduction = PRODUCTION_STAGES.has(currentStage);
            const assignedWorker = workers.find((w) => w.id === o.tracking?.[0]?.assigned_to);
            const cs = cardState?.orderId === o.id ? cardState : null;
            const isDone = cs?.fsm === "done";

            return (
              <div key={o.id} className={`rounded-xl border bg-[#2a2522] overflow-hidden ${isDone && cs?.result === "approved" ? "border-emerald-500/20" : isDone && cs?.result === "rejected" ? "border-red-500/20" : isRework ? "border-amber-500/20" : "border-[#c9a227]/10"}`}>
                <div className={`h-1 ${isProduction ? "bg-amber-400" : "bg-blue-400"}`} />

                {isDone ? (
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cs?.result === "approved" ? "bg-emerald-500/[0.12]" : "bg-red-500/[0.12]"}`}>
                        {cs?.result === "approved" ? <Check className="h-4 w-4 text-emerald-400" /> : <ArrowLeft className="h-4 w-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#e8e2d4]">{o.kode_order}</p>
                        <p className="text-xs text-white/40">{cs?.result === "approved" ? "Telah disetujui" : "Rework dikirim"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`font-mono text-xs font-semibold ${isRework ? "text-amber-300" : "text-[#e8e2d4]"}`}>{o.kode_order}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isProduction ? "bg-amber-500/[0.08] text-amber-300" : "bg-blue-500/[0.08] text-blue-300"}`}>
                            {STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] ?? currentStage}
                          </span>
                        </div>
                        <p className="text-sm text-[#e8e2d4]">{o.nama}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {assignedWorker && <span className="text-[11px] text-white/40">{assignedWorker.full_name}</span>}
                          {isRework && <span className="rounded-full bg-amber-500/[0.08] px-1.5 py-0.5 text-[10px] text-amber-300">Rework</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setShowVerify(showVerify === o.id ? null : o.id)} className="rounded-lg p-1.5 text-white/20 hover:bg-white/[0.04]" title="Panduan Verifikasi"><Eye className="h-4 w-4" /></button>

                        {cs && cs.fsm !== "idle" ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCardState(null)} disabled={submitting === o.id} className="rounded-lg border border-[#c9a227]/10 px-3 py-1.5 text-xs text-white/40 hover:bg-white/[0.04]">Batal</button>
                            {cs.fsm !== "loading" && (
                              <button onClick={executeAction} className={`rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${cs.fsm === "confirming_approve" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-red-500 text-white hover:bg-red-600"}`}>
                                {cs.fsm === "confirming_approve" ? <><Check className="h-3 w-3" />Setujui</> : <><ArrowLeft className="h-3 w-3" />Rework</>}
                              </button>
                            )}
                            {cs.fsm === "loading" && <Loader2 className="h-4 w-4 animate-spin text-[#c9a227]" />}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {!o.tracking?.[0]?.assigned_to ? (
                              <button onClick={() => handleAssign(o.id, workers[0]?.id ?? null)} disabled={submitting === o.id || workers.length === 0} className="rounded-lg bg-[#c9a227] px-2.5 py-1.5 text-xs font-medium text-[#15130f] hover:bg-[#d4ae3a] disabled:opacity-50"><UserPlus className="h-3 w-3" /></button>
                            ) : (
                              <>
                                <button onClick={() => startApprove(o)} disabled={!!submitting} className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50" title="Setujui"><Check className="h-3 w-3" /></button>
                                <button onClick={() => startRework(o)} disabled={!!submitting} className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50" title="Rework"><ArrowLeft className="h-3 w-3" /></button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {showVerify === o.id && (
                      <div className="mt-3 rounded-lg bg-[#1C1917] p-3 border border-[#c9a227]/10">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Panduan Verifikasi</p>
                        <ul className="space-y-1">
                          {getVerificationChecklist(currentStage).map((item, i) => (
                            <li key={i} className="text-xs text-white/40 flex items-start gap-1.5"><span className="text-[#c9a227] mt-0.5">•</span>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {cs && cs.fsm === "confirming_reject" && (
                      <div className="mt-3 rounded-lg bg-[#1C1917] p-3 border border-red-500/10">
                        <select value={cs.targetStage} onChange={(e) => setCardState({ ...cs, targetStage: e.target.value })} className="w-full rounded-md border border-[#c9a227]/20 bg-[#2a2522] px-3 py-2 text-sm text-[#e8e2d4] focus:outline-none mb-2">
                          {STAGE_SEQUENCE.map((s, idx) => {
                            const currentIdx = getStageIndex(currentStage);
                            if (idx > currentIdx && s !== "selesai") return null;
                            return <option key={s} value={s} disabled={s === currentStage}>{STAGE_LABELS[s]} {s === currentStage ? "(saat ini)" : idx < currentIdx ? "(mundur)" : ""}</option>;
                          })}
                        </select>
                        <textarea value={cs.remarks} onChange={(e) => setCardState({ ...cs, remarks: e.target.value })} placeholder="Alasan rework..." rows={2} className="w-full rounded-md border border-[#c9a227]/20 bg-[#2a2522] px-3 py-2 text-sm text-[#e8e2d4] placeholder:text-white/20 focus:outline-none" />
                      </div>
                    )}

                    {cs && cs.fsm === "confirming_approve" && (
                      <div className="mt-3 rounded-lg bg-[#1C1917] p-3 border border-emerald-500/10">
                        <textarea value={cs.remarks} onChange={(e) => setCardState({ ...cs, remarks: e.target.value })} placeholder="Catatan persetujuan (opsional)..." rows={2} className="w-full rounded-md border border-[#c9a227]/20 bg-[#2a2522] px-3 py-2 text-sm text-[#e8e2d4] placeholder:text-white/20 focus:outline-none" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
