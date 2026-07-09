"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher, mutator } from "@/lib/api";
import OrderCard from "@/components/integrated-system/order-card";
import { STAGE_LABELS, STAGE_SEQUENCE, getNextStage, getStageIndex } from "@/services/integrated-system/tracking.service";
import {
  Check, X, AlertCircle, Loader2, UserPlus, Search,
  ArrowLeft, RefreshCw,
} from "lucide-react";

const KANBAN_STAGES = STAGE_SEQUENCE.filter(
  (s) => !s.startsWith("approval_") && s !== "penerimaan_order",
);

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null;
  tracking: { current_stage: string; stage_status: string; assigned_to: string | null }[];
}

interface WorkerItem {
  id: string; full_name: string; role_name: string | null;
}

export default function SupervisorDashboard() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openAssignment, setOpenAssignment] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approvalOrder, setApprovalOrder] = useState<OrderItem | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [reworkOrder, setReworkOrder] = useState<OrderItem | null>(null);
  const [reworkRemarks, setReworkRemarks] = useState("");
  const [reworkTargetStage, setReworkTargetStage] = useState("");

  const orderParams = new URLSearchParams();
  orderParams.set("limit", "200");
  if (search) orderParams.set("search", search);
  if (stageFilter !== "all") orderParams.set("stage", stageFilter);
  if (statusFilter !== "all") orderParams.set("status", statusFilter);

  const { data, isLoading } = useQuery<{ data: OrderItem[] }>({
    queryKey: ["integrated-system", "supervisor", "orders", search, stageFilter, statusFilter],
    queryFn: () => fetcher(`/api/integrated-system/supervisor/orders?${orderParams}`),
    refetchInterval: 30_000,
  });

  const { data: workersData } = useQuery<{ data: WorkerItem[] }>({
    queryKey: ["integrated-system", "supervisor", "workers"],
    queryFn: () => fetcher("/api/integrated-system/supervisor/workers"),
  });

  const workers = workersData?.data ?? [];

  const handleAssign = async (orderId: string, workerId: string | null) => {
    setSubmitting(orderId); setError("");
    try {
      await mutator("/api/integrated-system/supervisor/assign", {
        method: "PUT",
        body: { orderId, workerId },
      });
      setOpenAssignment(null);
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(null); }
  };

  const handleApprove = async () => {
    if (!approvalOrder) return;
    const currentStage = approvalOrder.tracking?.[0]?.current_stage ?? "penerimaan_order";
    const next = getNextStage(currentStage);
    if (!next) return;
    setSubmitting(approvalOrder.id); setError("");
    try {
      await mutator("/api/integrated-system/supervisor/approve", {
        method: "PUT",
        body: {
          orderId: approvalOrder.id,
          currentStage,
          remarks: approvalRemarks || undefined,
        },
      });
      setApprovalOrder(null); setApprovalRemarks("");
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(null); }
  };

  const handleReworkSubmit = async () => {
    if (!reworkOrder) return;
    const currentStage = reworkOrder.tracking?.[0]?.current_stage ?? "penerimaan_order";
    const prevIdx = getStageIndex(currentStage);
    const target = reworkTargetStage || (prevIdx > 0 ? STAGE_SEQUENCE[prevIdx - 1] : currentStage);

    setSubmitting(reworkOrder.id); setError("");
    try {
      await mutator("/api/integrated-system/supervisor/rework", {
        method: "PUT",
        body: {
          orderId: reworkOrder.id,
          targetStage: target,
          reason: reworkRemarks || undefined,
        },
      });
      setReworkOrder(null); setReworkRemarks(""); setReworkTargetStage("");
      queryClient.invalidateQueries({ queryKey: ["integrated-system"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(null); }
  };

  const findWorkerName = (assignedTo: string | null | undefined): string | null => {
    if (!assignedTo) return null;
    return workers.find((w) => w.id === assignedTo)?.full_name ?? null;
  };

  const clearFilters = () => {
    setSearch(""); setStageFilter("all"); setStatusFilter("all");
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9 mb-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-100 mb-2" />
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-16 animate-pulse rounded bg-gray-50 mb-2" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const orders = data?.data ?? [];
  const filteredOrders = stageFilter !== "all"
    ? orders.filter((o) => o.tracking?.[0]?.current_stage === stageFilter)
    : orders;
  const grouped: Record<string, OrderItem[]> = {};
  KANBAN_STAGES.forEach((s) => {
    grouped[s] = filteredOrders.filter((o) => o.tracking?.[0]?.current_stage === s);
  });

  const activeOrders = filteredOrders.filter((o) => o.tracking?.[0]?.stage_status !== "completed").length;
  const needsAttention = filteredOrders.filter((o) => o.tracking?.[0]?.stage_status === "rework").length;
  const unassignedOrders = filteredOrders.filter((o) => !o.tracking?.[0]?.assigned_to).length;

  const hasFilters = search || stageFilter !== "all" || statusFilter !== "all";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Supervisor Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Pantau dan kelola semua order berdasarkan stage produksi</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-400">Total</p>
          <p className="text-lg font-bold text-gray-800">{filteredOrders.length}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-blue-500">Aktif</p>
          <p className="text-lg font-bold text-blue-700">{activeOrders}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-amber-500">Rework</p>
          <p className="text-lg font-bold text-amber-700">{needsAttention}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-400">Belum Assign</p>
          <p className="text-lg font-bold text-red-600">{unassignedOrders}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode order atau nama..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">Semua Stage</option>
          {KANBAN_STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s as keyof typeof STAGE_LABELS]}</option>
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
          <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-100">
            <RefreshCw className="h-3 w-3" />Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {KANBAN_STAGES.map((stage) => {
          const items = grouped[stage] ?? [];
          const next = getNextStage(stage);
          const stageIdx = getStageIndex(stage);
          const previousStage = stageIdx > 0 ? STAGE_SEQUENCE[stageIdx - 1] : null;

          return (
            <div key={stage} className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}
                </h2>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">Tidak ada order</p>
              ) : (
                <div className="space-y-2">
                  {items.map((o) => {
                    const assignedTo = o.tracking?.[0]?.assigned_to;
                    const assignedName = findWorkerName(assignedTo);
                    const isAssigning = openAssignment === o.id;
                    const currentStage = o.tracking?.[0]?.current_stage ?? stage;

                    return (
                      <div key={o.id} className="space-y-1.5">
                        <OrderCard
                          id={o.id}
                          kode_order={o.kode_order}
                          nama={o.nama}
                          tgl_order={o.tgl_order}
                          current_stage={currentStage}
                          stage_status={o.tracking?.[0]?.stage_status ?? "in_progress"}
                        />
                        <div className="flex items-center gap-1">
                          {assignedName ? (
                            <span className="flex-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700 truncate">
                              {assignedName}
                            </span>
                          ) : (
                            <button
                              onClick={() => setOpenAssignment(isAssigning ? null : o.id)}
                              className="flex flex-1 items-center justify-center gap-1 rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                              <UserPlus className="h-3 w-3" />Assign
                            </button>
                          )}
                          {next && (
                            <>
                              <button
                                onClick={() => { setApprovalOrder(o); setApprovalRemarks(""); }}
                                disabled={submitting === o.id}
                                className="flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                              >
                                {submitting === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => {
                                  setReworkOrder(o);
                                  setReworkRemarks("");
                                  setReworkTargetStage(previousStage ?? currentStage);
                                }}
                                disabled={submitting === o.id}
                                className="flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                        {isAssigning && (
                          <select
                            value={assignedTo ?? ""}
                            onChange={(e) => handleAssign(o.id, e.target.value || null)}
                            disabled={submitting === o.id}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-[10px] focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="">Pilih pekerja...</option>
                            {workers.map((w) => (
                              <option key={w.id} value={w.id}>{w.full_name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {approvalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl mx-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Setujui Order</h3>
                <p className="text-xs text-gray-500">
                  {approvalOrder.kode_order} — {approvalOrder.nama}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Lanjutkan dari <span className="font-medium">{STAGE_LABELS[approvalOrder.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS]}</span> ke{" "}
              <span className="font-medium text-emerald-700">
                {STAGE_LABELS[getNextStage(approvalOrder.tracking?.[0]?.current_stage ?? "penerimaan_order") as keyof typeof STAGE_LABELS]}
              </span>
              ?
            </p>
            <textarea
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="Catatan persetujuan (opsional)..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setApprovalOrder(null)} disabled={!!submitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleApprove} disabled={!!submitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                {submitting === approvalOrder?.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Setujui
              </button>
            </div>
          </div>
        </div>
      )}

      {reworkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl mx-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <ArrowLeft className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Rework Order</h3>
                <p className="text-xs text-gray-500">
                  {reworkOrder.kode_order} — {reworkOrder.nama}
                </p>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Target Stage</label>
              <select
                value={reworkTargetStage}
                onChange={(e) => setReworkTargetStage(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {STAGE_SEQUENCE.map((s, idx) => {
                  const currentIdx = getStageIndex(reworkOrder.tracking?.[0]?.current_stage ?? "penerimaan_order");
                  if (idx > currentIdx && s !== "selesai") return null;
                  return (
                    <option key={s} value={s} disabled={s === reworkOrder.tracking?.[0]?.current_stage}>
                      {STAGE_LABELS[s]} {s === reworkOrder.tracking?.[0]?.current_stage ? "(saat ini)" : idx < currentIdx ? "(mundur)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <textarea
              value={reworkRemarks}
              onChange={(e) => setReworkRemarks(e.target.value)}
              placeholder="Alasan rework (wajib)..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReworkOrder(null)} disabled={!!submitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleReworkSubmit} disabled={!!submitting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                {submitting === reworkOrder?.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                Rework
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
