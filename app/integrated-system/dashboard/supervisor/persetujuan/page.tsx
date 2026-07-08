"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher, mutator } from "@/lib/api";
import { STAGE_LABELS, getStageIndex, STAGE_SEQUENCE } from "@/services/integrated-system/tracking.service";
import { Check, AlertCircle, Loader2, UserPlus, ArrowLeft } from "lucide-react";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null;
  tracking: { current_stage: string; stage_status: string; assigned_to: string | null }[];
}

interface WorkerItem {
  id: string; full_name: string; role_name: string | null;
}

export default function SupervisorPersetujuanPage() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openAssignment, setOpenAssignment] = useState<string | null>(null);
  const [reworkOrder, setReworkOrder] = useState<OrderItem | null>(null);
  const [reworkRemarks, setReworkRemarks] = useState("");
  const [reworkTargetStage, setReworkTargetStage] = useState("");

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

  const handleAssign = async (orderId: string, workerId: string | null) => {
    setSubmitting(orderId); setError("");
    try {
      await mutator("/api/integrated-system/supervisor/assign", { method: "PUT", body: { orderId, workerId } });
      setOpenAssignment(null);
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(null); }
  };

  const handleReworkSubmit = async () => {
    if (!reworkOrder) return;
    const currentStage = reworkOrder.tracking?.[0]?.current_stage ?? "order_diterima";
    const prevIdx = getStageIndex(currentStage);
    const target = reworkTargetStage || (prevIdx > 0 ? STAGE_SEQUENCE[prevIdx - 1] : currentStage);
    setSubmitting(reworkOrder.id); setError("");
    try {
      await mutator("/api/integrated-system/supervisor/rework", { method: "PUT", body: { orderId: reworkOrder.id, targetStage: target, reason: reworkRemarks || undefined } });
      setReworkOrder(null); setReworkRemarks(""); setReworkTargetStage("");
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(null); }
  };

  if (isLoading) {
    return <div className="p-4 sm:p-6 animate-pulse"><div className="h-7 w-48 rounded bg-gray-200 mb-6" /><div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100" />)}</div></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Persetujuan</h1>
        <p className="mt-1 text-sm text-gray-500">Order yang memerlukan tindakan: rework atau penugasan pekerja</p>
      </div>

      {error && <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      {reworkOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" />Perlu Rework ({reworkOrders.length})</h2>
          <div className="space-y-2">
            {reworkOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-amber-700">{o.kode_order}</span>
                  <span className="ml-2 text-sm text-gray-700">{o.nama}</span>
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">Rework</span>
                </div>
                <button onClick={() => { setReworkOrder(o); setReworkRemarks(""); setReworkTargetStage(""); }} disabled={!!submitting} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                  Tindak Lanjut
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {unassignedOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-blue-500" />Belum Ditugaskan ({unassignedOrders.length})</h2>
          <div className="space-y-2">
            {unassignedOrders.map((o) => {
              const isAssigning = openAssignment === o.id;
              return (
                <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono text-indigo-600">{o.kode_order}</span>
                      <span className="ml-2 text-sm text-gray-700">{o.nama}</span>
                      <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600">
                        {STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? "-"}
                      </span>
                    </div>
                    <button onClick={() => setOpenAssignment(isAssigning ? null : o.id)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                      <UserPlus className="h-3 w-3 inline mr-1" />Assign
                    </button>
                  </div>
                  {isAssigning && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <select value="" onChange={(e) => handleAssign(o.id, e.target.value || null)} disabled={submitting === o.id} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                        <option value="">Pilih pekerja...</option>
                        {workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reworkOrders.length === 0 && unassignedOrders.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">Semua order sudah tertangani</p>
          <p className="mt-1 text-xs text-gray-400">Tidak ada order yang memerlukan tindakan</p>
        </div>
      )}

      {reworkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl mx-4">
            <div className="flex items-center gap-2 mb-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100"><ArrowLeft className="h-4 w-4 text-red-600" /></div><div><h3 className="text-sm font-semibold text-gray-900">Rework Order</h3><p className="text-xs text-gray-500">{reworkOrder.kode_order} — {reworkOrder.nama}</p></div></div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Target Stage</label>
              <select value={reworkTargetStage} onChange={(e) => setReworkTargetStage(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                {STAGE_SEQUENCE.map((s, idx) => {
                  const currentIdx = getStageIndex(reworkOrder.tracking?.[0]?.current_stage ?? "order_diterima");
                  if (idx > currentIdx && s !== "selesai") return null;
                  return <option key={s} value={s} disabled={s === reworkOrder.tracking?.[0]?.current_stage}>{STAGE_LABELS[s]} {s === reworkOrder.tracking?.[0]?.current_stage ? "(saat ini)" : idx < currentIdx ? "(mundur)" : ""}</option>;
                })}
              </select>
            </div>
            <textarea value={reworkRemarks} onChange={(e) => setReworkRemarks(e.target.value)} placeholder="Alasan rework..." rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReworkOrder(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleReworkSubmit} disabled={!!submitting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5">{submitting === reworkOrder?.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeft className="h-3.5 w-3.5" />}Rework</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
