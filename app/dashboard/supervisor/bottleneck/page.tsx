// app/dashboard/supervisor/bottleneck/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/MobileSidebar";
import Header from "@/components/layout/MobileHeader";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BottleneckItem {
  order_id: string;
  order_number: string;
  product_name: string;
  hours_waiting: number | null;
  status: string;
}

interface StageBottleneck {
  stage: string;
  stage_label: string;
  stage_group: string;
  order_count: number;
  waiting_orders: number;
  in_progress_orders: number;
  avg_hours: number | null;
  longest_hours: number | null;
  bottlenecks: BottleneckItem[];
}

interface BottleneckData {
  bottlenecks: StageBottleneck[];
  summary: {
    total_stages_with_orders: number;
    total_orders: number;
    busiest_stage: StageBottleneck | null;
    slowest_stage: StageBottleneck | null;
  };
}

interface OrderDetail {
  order: {
    id: string;
    order_number: string;
    product_name: string;
    target_weight: number;
    target_karat: number;
    ring_size: string | null;
    model_description: string | null;
    special_notes: string | null;
    engraved_text: string | null;
    delivery_method: string;
    order_date: string;
    deadline: string | null;
    total_price: number | null;
    dp_amount: number | null;
    rhodium_specification: string | null;
    current_stage: string;
    status: string;
    created_at: string;
    updated_at: string;
    ring_identity_number: string | null;
    customer: {
      name: string | null;
      phone: string | null;
      wa_contact: string | null;
      email: string | null;
      address: string | null;
    } | null;
  };
  gemstones: Array<{
    gemstone_type: string;
    shape: string | null;
    weight_ct: number | null;
    weight_grams: number | null;
    clarity: string | null;
    color: string | null;
    quantity: number;
    source: string;
    certificate_no: string | null;
  }>;
  transitions: Array<{
    from_stage: string | null;
    to_stage: string;
    reason: string | null;
    transitioned_at: string;
  }>;
  stageResults: Array<{
    id: string;
    stage: string;
    attempt_number: number;
    data: Record<string, unknown>;
    notes: string | null;
    started_at: string;
    finished_at: string;
    users: { full_name: string } | null;
  }>;
  payments: Array<{
    type: string;
    amount: number;
    method: string;
    reference_no: string | null;
    paid_at: string;
  }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_LABELS_DETAIL: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  approval_qc_1: "Approval QC 1",
  finishing: "Finishing",
  laser: "Laser",
  qc_2: "QC 2",
  approval_qc_2: "Approval QC 2",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  approval_qc_3: "Approval QC 3",
  packing: "Packing",
  pelunasan: "Pelunasan",
  approval_pelunasan: "Approval Pelunasan",
  pengiriman: "Pengiriman",
  selesai: "Selesai",
};

const STAGE_LABELS: Record<string, string> = {
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  finishing: "Finishing",
  laser: "Laser Engraving",
  qc_2: "QC 2",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  packing: "Packing",
  pelunasan: "Pelunasan",
  pengiriman: "Pengiriman",
  approval_penerimaan_order: "Approval Order Baru",
  approval_qc_1: "Approval QC 1",
  approval_qc_2: "Approval QC 2",
  approval_qc_3: "Approval QC 3",
  approval_pelunasan: "Approval Pelunasan",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours >= 24) {
    const d = Math.floor(hours / 24);
    const h = Math.round(hours % 24);
    return h > 0 ? `${d}h ${h}j` : `${d}h`;
  }
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.round(hours * 10) / 10}j`;
}

function getStageColor(stageGroup: string): string {
  return stageGroup === "production"
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-blue-100 text-blue-800 border-blue-200";
}

function getStatusInfo(avgHours: number | null): {
  label: string;
  className: string;
  Icon: React.ElementType;
} {
  if (avgHours === null) {
    return {
      label: "Normal",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      Icon: CheckCircle2,
    };
  }
  if (avgHours > 24) {
    return {
      label: "Kritis",
      className: "bg-rose-50 text-rose-700 ring-rose-200",
      Icon: AlertTriangle,
    };
  }
  if (avgHours > 8) {
    return {
      label: "Lambat",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      Icon: Clock,
    };
  }
  return {
    label: "Normal",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Icon: CheckCircle2,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  tone: "slate" | "rose" | "amber" | "emerald";
}) {
  const toneMap = {
    slate: {
      bg: "bg-slate-50",
      icon: "text-slate-500",
      ring: "ring-slate-200",
    },
    rose: { bg: "bg-rose-50", icon: "text-rose-600", ring: "ring-rose-200" },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      ring: "ring-amber-200",
    },
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      ring: "ring-emerald-200",
    },
  };
  const t = toneMap[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold tabular-nums text-slate-900">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${t.bg} ${t.ring} ml-2`}
        >
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${t.icon}`} />
        </div>
      </div>
    </div>
  );
}

function BottleneckTableRow({
  stage,
  isExpanded,
  onToggle,
  onOrderClick,
}: {
  stage: StageBottleneck;
  isExpanded: boolean;
  onToggle: () => void;
  onOrderClick: (orderId: string, orderNumber: string) => void;
}) {
  const status = getStatusInfo(stage.avg_hours);
  const StatusIcon = status.Icon;
  const isProduction = stage.stage_group === "production";
  const hasBottlenecks = stage.bottlenecks.length > 0;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-slate-50 transition-colors cursor-pointer ${
          status.label === "Kritis"
            ? "bg-rose-50/30 hover:bg-rose-50/50"
            : status.label === "Lambat"
              ? "bg-amber-50/20 hover:bg-amber-50/40"
              : "hover:bg-slate-50/60"
        }`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isProduction ? "bg-amber-400" : "bg-blue-400"}`}
            />
            <span className="text-sm font-medium text-slate-800">
              {STAGE_LABELS[stage.stage] || stage.stage_label}
            </span>
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {stage.order_count}
            {stage.waiting_orders > 0 && (
              <span className="text-rose-500 text-[10px]">
                ({stage.waiting_orders})
              </span>
            )}
          </span>
        </td>
        <td className="px-3 py-3 text-center hidden sm:table-cell">
          <span
            className={`text-xs font-semibold ${
              status.label === "Kritis"
                ? "text-rose-600"
                : status.label === "Lambat"
                  ? "text-amber-600"
                  : "text-slate-600"
            }`}
          >
            {formatHours(stage.avg_hours)}
          </span>
        </td>
        <td className="px-3 py-3 text-center hidden sm:table-cell">
          <span
            className={`text-xs font-semibold ${
              (stage.longest_hours || 0) > 48
                ? "text-rose-600"
                : (stage.longest_hours || 0) > 24
                  ? "text-amber-600"
                  : "text-slate-600"
            }`}
          >
            {formatHours(stage.longest_hours)}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${status.className}`}
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </td>
        <td className="px-2 py-3 text-center">
          {hasBottlenecks &&
            (isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ))}
        </td>
      </tr>
      {/* Expanded detail rows */}
      {isExpanded && hasBottlenecks && (
        <tr className="bg-slate-50/50">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Order Terlambat di Tahap Ini
              </p>
              {stage.bottlenecks.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onOrderClick(item.order_id, item.order_number);
                  }}
                  className="flex items-center gap-3 text-xs bg-white rounded-md border border-slate-100 px-3 py-2 hover:border-slate-300 hover:bg-slate-50 transition-colors w-full text-left cursor-pointer"
                >
                  <span className="font-mono text-slate-500 w-32 shrink-0">
                    {item.order_number}
                  </span>
                  <span className="text-slate-600 truncate flex-1">
                    {item.product_name}
                  </span>
                  <span
                    className={`shrink-0 font-semibold ${
                      (item.hours_waiting || 0) > 48
                        ? "text-rose-600"
                        : (item.hours_waiting || 0) > 24
                          ? "text-amber-600"
                          : "text-slate-500"
                    }`}
                  >
                    {formatHours(item.hours_waiting)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      item.status === "waiting_approval"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.status === "waiting_approval" ? "Menunggu" : "Proses"}
                  </span>
                </button>
              ))}
            </div>
          </td>
        </tr>
      )}
      {isExpanded && !hasBottlenecks && (
        <tr className="bg-slate-50/50">
          <td colSpan={6} className="px-4 py-3 text-center">
            <p className="text-xs text-slate-400">
              Tidak ada order terlambat signifikan
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function OrderDetailPopup({
  orderId,
  orderNumber,
  onClose,
}: {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"info" | "stages" | "payments">("info");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/supervisor/order-detail?order_id=${orderId}`,
        );
        if (!res.ok) throw new Error("Gagal memuat detail");
        const json = await res.json();
        setDetail(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const formatCurrency = (val: number | null) =>
    val ? `Rp ${val.toLocaleString("id-ID")}` : "—";

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs font-semibold text-slate-500">
                {orderNumber}
              </span>
              <h3 className="text-sm font-semibold text-slate-800 mt-0.5">
                {detail?.order.product_name || "Memuat..."}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
            <p className="text-sm text-slate-600">{error}</p>
          </div>
        ) : detail ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-5">
              {(["info", "stages", "payments"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    tab === t
                      ? "border-slate-800 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t === "info"
                    ? "Info Order"
                    : t === "stages"
                      ? "Riwayat Tahap"
                      : "Pembayaran"}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ── INFO TAB ── */}
              {tab === "info" && (
                <div className="space-y-4">
                  {/* Customer */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Pelanggan
                    </p>
                    <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                      <p className="text-sm font-medium text-slate-800">
                        {detail.order.customer?.name || "—"}
                      </p>
                      {detail.order.customer?.wa_contact && (
                        <p className="text-xs text-slate-500">
                          💬 No Handphone: {detail.order.customer.wa_contact}
                        </p>
                      )}
                      {detail.order.customer?.email && (
                        <p className="text-xs text-slate-500">
                          📧 {detail.order.customer.email}
                        </p>
                      )}
                      {detail.order.customer?.address && (
                        <p className="text-xs text-slate-500">
                          📍 {detail.order.customer.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Specs */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Spesifikasi
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Target Berat</span>
                        <p className="font-medium text-slate-700">
                          {detail.order.target_weight}g
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Target Karat</span>
                        <p className="font-medium text-slate-700">
                          {detail.order.target_karat}K
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Ukuran Cincin</span>
                        <p className="font-medium text-slate-700">
                          {detail.order.ring_size || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Delivery</span>
                        <p className="font-medium text-slate-700">
                          {detail.order.delivery_method}
                        </p>
                      </div>
                    </div>
                    {detail.order.model_description && (
                      <div className="mt-2 bg-slate-50 rounded p-2 text-xs">
                        <span className="text-slate-400">Deskripsi Model</span>
                        <p className="font-medium text-slate-700 mt-0.5">
                          {detail.order.model_description}
                        </p>
                      </div>
                    )}
                    {detail.order.engraved_text && (
                      <div className="mt-2 bg-slate-50 rounded p-2 text-xs">
                        <span className="text-slate-400">Teks Ukiran</span>
                        <p className="font-medium text-slate-700 mt-0.5 font-mono">
                          {detail.order.engraved_text}
                        </p>
                      </div>
                    )}
                    {detail.order.special_notes && (
                      <div className="mt-2 bg-amber-50 rounded p-2 text-xs border border-amber-100">
                        <span className="text-amber-600">Catatan Khusus</span>
                        <p className="font-medium text-slate-700 mt-0.5">
                          {detail.order.special_notes}
                        </p>
                      </div>
                    )}
                    {detail.order.ring_identity_number && (
                      <div className="mt-2 bg-slate-50 rounded p-2 text-xs">
                        <span className="text-slate-400">
                          No. Identitas Cincin
                        </span>
                        <p className="font-medium text-slate-700 mt-0.5 font-mono">
                          {detail.order.ring_identity_number}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Gemstones */}
                  {detail.gemstones.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Batu Permata ({detail.gemstones.length})
                      </p>
                      <div className="space-y-2">
                        {detail.gemstones.map((g, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-purple-50 border border-purple-100 p-2.5 text-xs"
                          >
                            <p className="font-medium text-slate-700">
                              {g.gemstone_type} — {g.shape || "—"} ×{" "}
                              {g.quantity}
                            </p>
                            <p className="text-slate-500 mt-0.5">
                              {g.weight_ct ? `${g.weight_ct}ct` : ""}
                              {g.weight_grams ? ` (${g.weight_grams}g)` : ""}
                              {g.clarity ? ` · ${g.clarity}` : ""}
                              {g.color ? ` · ${g.color}` : ""}
                            </p>
                            <p className="text-slate-400 mt-0.5">
                              Sumber: {g.source} · Sertifikat:{" "}
                              {g.certificate_no || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Harga
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Total Harga</span>
                        <p className="font-semibold text-slate-700">
                          {formatCurrency(detail.order.total_price)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">DP</span>
                        <p className="font-semibold text-slate-700">
                          {formatCurrency(detail.order.dp_amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Tanggal
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Order</span>
                        <p className="font-medium text-slate-700">
                          {formatDate(detail.order.order_date)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Deadline</span>
                        <p
                          className={`font-medium ${detail.order.deadline && new Date(detail.order.deadline) < new Date() ? "text-rose-600" : "text-slate-700"}`}
                        >
                          {formatDate(detail.order.deadline)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STAGES TAB ── */}
              {tab === "stages" && (
                <div className="space-y-3">
                  {/* Stage history timeline */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
                      Riwayat Perpindahan Tahap
                    </p>
                    <div className="space-y-0">
                      {detail.transitions.map((t, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`h-2.5 w-2.5 rounded-full border-2 ${i === 0 ? "bg-slate-800 border-slate-800" : "bg-white border-slate-300"}`}
                            />
                            {i < detail.transitions.length - 1 && (
                              <div className="w-px flex-1 bg-slate-200 my-0.5" />
                            )}
                          </div>
                          <div className="pb-3 flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700">
                              {STAGE_LABELS_DETAIL[t.to_stage] || t.to_stage}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatDateTime(t.transitioned_at)}
                            </p>
                            {t.reason && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {t.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stage results */}
                  {detail.stageResults.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2 mt-4">
                        Submission Terakhir
                      </p>
                      <div className="space-y-2">
                        {detail.stageResults.map((sr) => (
                          <div
                            key={sr.id}
                            className="rounded-lg border border-slate-200 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-700">
                                {STAGE_LABELS_DETAIL[sr.stage] || sr.stage}
                              </span>
                              {sr.attempt_number > 1 && (
                                <span className="text-[10px] bg-rose-100 text-rose-700 rounded px-1.5 py-0.5">
                                  Percobaan {sr.attempt_number}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 mt-0.5">
                              {sr.users?.full_name || "—"} ·{" "}
                              {formatDateTime(sr.finished_at)}
                            </p>
                            {sr.notes && (
                              <p className="text-slate-500 mt-1 italic">
                                "{sr.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PAYMENTS TAB ── */}
              {tab === "payments" && (
                <div className="space-y-3">
                  {detail.payments.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Belum ada pembayaran tercatat
                    </p>
                  ) : (
                    detail.payments.map((p, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-200 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.type === "dp" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {p.type === "dp"
                              ? "DP"
                              : p.type === "pelunasan"
                                ? "Pelunasan"
                                : p.type}
                          </span>
                          <span className="text-slate-400">
                            {formatDate(p.paid_at)}
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-slate-800 mt-1">
                          {formatCurrency(p.amount)}
                        </p>
                        <p className="text-slate-500 mt-0.5">
                          {p.method}{" "}
                          {p.reference_no ? `· ${p.reference_no}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupervisorBottleneckPage() {
  const router = useRouter();
  const [data, setData] = useState<BottleneckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOrderNumber, setDetailOrderNumber] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (!res.ok) {
        router.push("/workshop/login");
        return;
      }
      const json = await res.json();
      const u = json.data;
      if (
        u.role.name !== "superadmin" &&
        u.role.role_group !== "management" &&
        u.role.name !== "supervisor"
      ) {
        router.push("/workshop/login");
        return;
      }
      setUserEmail(u.username || u.full_name || "");
    })();
  }, [router]);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/bottleneck");
      if (!res.ok) throw new Error("Gagal memuat data bottleneck");
      const json = await res.json();
      setData(json.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  const criticalCount =
    data?.bottlenecks.filter((b) => (b.avg_hours || 0) > 24).length || 0;
  const slowCount =
    data?.bottlenecks.filter(
      (b) => (b.avg_hours || 0) > 8 && (b.avg_hours || 0) <= 24,
    ).length || 0;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      <Sidebar
        role="supervisor"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          role="supervisor"
          logoutPath="/workshop/login"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {/* Page header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Bottleneck Monitoring
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Identifikasi tahap dengan waktu tunggu terlama
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {lastUpdated && (
                <span className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                  {lastUpdated.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <BottleneckSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Coba lagi
              </button>
            </div>
          ) : !data ? null : (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
                <StatCard
                  label="Total Tahap Aktif"
                  value={data.summary.total_stages_with_orders}
                  icon={Layers}
                  tone="slate"
                />
                <StatCard
                  label="Total Order"
                  value={data.summary.total_orders}
                  icon={TrendingUp}
                  tone="slate"
                />
                <StatCard
                  label="Kritis"
                  value={criticalCount}
                  subtitle=">24 jam"
                  icon={AlertTriangle}
                  tone={criticalCount > 0 ? "rose" : "emerald"}
                />
                <StatCard
                  label="Lambat"
                  value={slowCount}
                  subtitle="8-24 jam"
                  icon={Clock}
                  tone={slowCount > 0 ? "amber" : "emerald"}
                />
              </div>

              {/* Summary alert */}
              {data.summary.slowest_stage &&
                (data.summary.slowest_stage.avg_hours || 0) > 8 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Tahap dengan waktu tunggu terlama:{" "}
                        {STAGE_LABELS[data.summary.slowest_stage.stage] ||
                          data.summary.slowest_stage.stage_label}
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Rata-rata{" "}
                        {formatHours(data.summary.slowest_stage.avg_hours)} per
                        order — {data.summary.slowest_stage.order_count} order
                        menunggu
                      </p>
                    </div>
                  </div>
                )}

              {/* Main table */}
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Detail Per Tahap
                  </h3>
                  <span className="text-xs text-slate-400">
                    Klik baris untuk detail order
                  </span>
                </div>

                {data.bottlenecks.length === 0 ? (
                  <div className="py-16 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
                    <p className="text-sm font-medium text-slate-500">
                      Tidak ada bottleneck terdeteksi
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Semua order berjalan lancar
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Tahap
                          </th>
                          <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Order
                          </th>
                          <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">
                            Rata² Waktu
                          </th>
                          <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">
                            Terlama
                          </th>
                          <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </th>
                          <th className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.bottlenecks.map((stage) => (
                          <BottleneckTableRow
                            key={stage.stage}
                            stage={stage}
                            isExpanded={expandedStages.has(stage.stage)}
                            onToggle={() => toggleStage(stage.stage)}
                            onOrderClick={(orderId, orderNumber) => {
                              setDetailOrderId(orderId);
                              setDetailOrderNumber(orderNumber);
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Order Detail Popup */}
        {detailOrderId && (
          <OrderDetailPopup
            orderId={detailOrderId}
            orderNumber={detailOrderNumber}
            onClose={() => setDetailOrderId(null)}
          />
        )}
      </div>
    </div>
  );
}

function BottleneckSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 sm:h-24 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="h-64 sm:h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
