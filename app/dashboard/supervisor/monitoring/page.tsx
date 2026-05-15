// app/dashboard/supervisor/monitoring/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/layout/MobileSidebar";
import Header from "@/components/layout/MobileHeader";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hammer,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  current_stage: string;
  stage_label: string;
  stage_group: "production" | "operational" | "other";
  deadline: string | null;
  last_worker: string | null;
  last_submission_at: string | null;
  hours_at_stage: number | null;
  last_stage: string | null;
  status: string;
  created_at: string;
}

interface MonitoringStats {
  totalActive: number;
  productionCount: number;
  operationalCount: number;
  submissionsToday: number;
  pendingApprovals: number;
}

interface MonitoringData {
  stats: MonitoringStats;
  orders: OrderRow[];
  completedOrders?: OrderRow[];
}

interface OrderDetail {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_wa: string | null;
    customer_email: string | null;
    customer_instagram: string | null;
    tgl_chat: string | null;
    tgl_order: string | null;
    tgl_acara: string | null;
    deadline: string | null;
    acara: string | null;
    kebutuhan_acara: string | null;
    alat_ukur: string | null;
    ukuran_pria: string | null;
    ukiran_pria: string | null;
    jenis_cincin_pria: string | null;
    keterangan_pria: string[] | null;
    ukuran_wanita: string | null;
    ukiran_wanita: string | null;
    jenis_cincin_wanita: string | null;
    keterangan_wanita: string[] | null;
    font: string | null;
    laser_position: string | null;
    harga: number | null;
    dp_amount: number | null;
    order_via: string | null;
    sumber_media: string | null;
    pengiriman: string | null;
    box: string | null;
    alamat_pengiriman: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    kabupaten_kota: string | null;
    provinsi: string | null;
    kodepos: string | null;
    reference_image_pria_url: string | null;
    reference_image_wanita_url: string | null;
    current_stage: string;
    status: string;
    form_status: string | null;
    created_at: string;
    updated_at: string;
    created_by_name: string | null;
  };
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
  deliveries: Array<{
    id: string;
    delivery_method: string;
    status: string;
    courier_name: string | null;
    tracking_number: string | null;
    recipient_name: string | null;
    recipient_phone: string | null;
    delivery_address: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    notes: string | null;
  }>;
  approvals: Array<{
    id: string;
    stage: string;
    decision: string;
    remarks: string | null;
    decided_at: string;
    users: { full_name: string } | null;
  }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  production: "bg-amber-100 text-amber-800 border-amber-200",
  operational: "bg-blue-100 text-blue-800 border-blue-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

const APPROVAL_STAGES = [
  "approval_penerimaan_order",
  "approval_racik_bahan",
  "approval_qc_1",
  "approval_produksi",
  "approval_qc_2",
];

const STAGE_LABELS_DETAIL: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan Order",
  racik_bahan: "Persiapan Bahan",
  approval_racik_bahan: "Approval Persiapan Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  cek_kadar: "Cek Kadar",
  pemasangan_permata: "Micro Setting",
  pemolesan: "Pemolesan Awal",
  qc_1: "QC Awal",
  approval_qc_1: "Approval QC Awal",
  laser: "Laser Engraving",
  finishing: "Finishing",
  approval_produksi: "Approval Produksi",
  qc_2: "QC Akhir",
  approval_qc_2: "Approval QC Akhir",
  konfirmasi: "Konfirmasi Customer Care",
  packing: "Packing & Persiapan Kirim",
  pengiriman: "Pengiriman",
  selesai: "Selesai",
};

const DEADLINE_WARN_DAYS = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m lalu`;
  if (hours < 24) return `${hours}j lalu`;
  return `${Math.floor(hours / 24)}h lalu`;
}

function formatDeadline(iso: string | null): {
  label: string;
  urgent: boolean;
} {
  if (!iso) return { label: "—", urgent: false };
  const date = new Date(iso);
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  const label = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
  return { label, urgent: diffDays <= DEADLINE_WARN_DAYS };
}

function formatCurrency(val: number | null) {
  return val ? `Rp ${val.toLocaleString("id-ID")}` : "—";
}

function formatDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  note,
  className,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone: "slate" | "amber" | "blue" | "emerald" | "rose";
  note?: string;
  className?: string;
}) {
  const toneMap = {
    slate: {
      bg: "bg-slate-50",
      icon: "text-slate-500",
      ring: "ring-slate-200",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      ring: "ring-amber-200",
    },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", ring: "ring-blue-200" },
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      ring: "ring-emerald-200",
    },
    rose: { bg: "bg-rose-50", icon: "text-rose-600", ring: "ring-rose-200" },
  };
  const t = toneMap[tone];
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-3 sm:p-5${className ? ` ${className}` : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold tabular-nums text-slate-900">
            {value}
          </p>
          {note && (
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-400">
              {note}
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

type FilterTab = "all" | "production" | "operational" | "pending" | "completed";

// ── Order Detail Popup ────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="bg-slate-50 rounded p-2 text-xs">
      <span className="text-slate-400">{label}</span>
      <p className="font-medium text-slate-700 mt-0.5">{value}</p>
    </div>
  );
}

function RingSpecSection({
  title,
  ukuran,
  jenis,
  ukiran,
  keterangan,
}: {
  title: string;
  ukuran: string | null;
  jenis: string | null;
  ukiran: string | null;
  keterangan: string[] | null;
}) {
  const hasData =
    ukuran || jenis || ukiran || (keterangan && keterangan.length > 0);
  if (!hasData) return null;
  return (
    <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {ukuran && (
          <div>
            <span className="text-slate-400">Ukuran</span>
            <p className="font-semibold text-slate-700">{ukuran}</p>
          </div>
        )}
        {jenis && (
          <div>
            <span className="text-slate-400">Jenis</span>
            <p className="font-semibold text-slate-700">{jenis}</p>
          </div>
        )}
      </div>
      {ukiran && (
        <div className="text-xs">
          <span className="text-slate-400">Ukiran</span>
          <p className="font-mono font-semibold text-slate-700">{ukiran}</p>
        </div>
      )}
      {keterangan && keterangan.length > 0 && (
        <div className="text-xs">
          <span className="text-slate-400">Keterangan</span>
          <ul className="mt-0.5 space-y-0.5">
            {keterangan.map((k, i) => (
              <li key={i} className="text-slate-600">
                • {k}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
  const [tab, setTab] = useState<"info" | "stages" | "approvals">("info");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/order-detail?order_id=${orderId}`);
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

  const o = detail?.order;

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
            <div className="min-w-0 pr-3">
              <span className="font-mono text-xs font-semibold text-slate-500">
                {orderNumber}
              </span>
              <h3 className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {o?.customer_name || "Memuat..."}
              </h3>
              {o && (
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium mt-1 ${
                    STAGE_COLORS[
                      detail?.transitions?.length ? "operational" : "other"
                    ]
                  }`}
                >
                  {STAGE_LABELS_DETAIL[o.current_stage] ?? o.current_stage}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
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
        ) : detail && o ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-5">
              {(["info", "stages", "approvals"] as const).map((t) => (
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
                      : "Persetujuan"}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {/* ── INFO TAB ── */}
              {tab === "info" && (
                <>
                  {/* Customer */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Pelanggan
                    </p>
                    <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {o.customer_name}
                      </p>
                      {o.customer_wa && (
                        <p className="text-xs text-slate-500">
                          WhatsApp: {o.customer_wa}
                        </p>
                      )}
                      {o.customer_email && (
                        <p className="text-xs text-slate-500">
                          Email: {o.customer_email}
                        </p>
                      )}
                      {o.customer_instagram && (
                        <p className="text-xs text-slate-500">
                          Instagram: {o.customer_instagram}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ring specs */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Spesifikasi Cincin
                    </p>
                    <div className="space-y-2">
                      <RingSpecSection
                        title="Pria"
                        ukuran={o.ukuran_pria}
                        jenis={o.jenis_cincin_pria}
                        ukiran={o.ukiran_pria}
                        keterangan={o.keterangan_pria}
                      />
                      <RingSpecSection
                        title="Wanita"
                        ukuran={o.ukuran_wanita}
                        jenis={o.jenis_cincin_wanita}
                        ukiran={o.ukiran_wanita}
                        keterangan={o.keterangan_wanita}
                      />
                      {(o.font || o.laser_position) && (
                        <div className="grid grid-cols-2 gap-2">
                          <InfoRow label="Font" value={o.font} />
                          <InfoRow
                            label="Posisi Laser"
                            value={o.laser_position}
                          />
                        </div>
                      )}
                      {o.alat_ukur && (
                        <InfoRow label="Alat Ukur" value={o.alat_ukur} />
                      )}
                    </div>
                  </div>

                  {/* Reference images */}
                  {(o.reference_image_pria_url ||
                    o.reference_image_wanita_url) && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Foto Referensi
                      </p>
                      <div className="flex gap-2">
                        {o.reference_image_pria_url && (
                          <a
                            href={o.reference_image_pria_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 rounded-lg border border-blue-200 bg-blue-50 py-2 text-center text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Referensi Pria ↗
                          </a>
                        )}
                        {o.reference_image_wanita_url && (
                          <a
                            href={o.reference_image_wanita_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 rounded-lg border border-blue-200 bg-blue-50 py-2 text-center text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Referensi Wanita ↗
                          </a>
                        )}
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
                          {formatCurrency(o.harga)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">DP</span>
                        <p className="font-semibold text-slate-700">
                          {formatCurrency(o.dp_amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dates & event */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Tanggal & Acara
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {o.tgl_order && (
                        <div className="bg-slate-50 rounded p-2">
                          <span className="text-slate-400">Tgl Order</span>
                          <p className="font-medium text-slate-700">
                            {formatDate(o.tgl_order)}
                          </p>
                        </div>
                      )}
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-400">Deadline</span>
                        <p
                          className={`font-medium ${o.deadline && new Date(o.deadline) < new Date() ? "text-rose-600" : "text-slate-700"}`}
                        >
                          {formatDate(o.deadline)}
                        </p>
                      </div>
                      {o.tgl_acara && (
                        <div className="bg-slate-50 rounded p-2">
                          <span className="text-slate-400">Tgl Acara</span>
                          <p className="font-medium text-slate-700">
                            {formatDate(o.tgl_acara)}
                          </p>
                        </div>
                      )}
                      {o.acara && (
                        <div className="bg-slate-50 rounded p-2">
                          <span className="text-slate-400">Acara</span>
                          <p className="font-medium text-slate-700">
                            {o.acara}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping */}
                  {(o.pengiriman || o.alamat_pengiriman) && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Pengiriman
                      </p>
                      <div className="rounded-lg bg-slate-50 p-3 space-y-1 text-xs">
                        {o.pengiriman && (
                          <p className="font-medium text-slate-700">
                            {o.pengiriman}
                          </p>
                        )}
                        {o.alamat_pengiriman && (
                          <p className="text-slate-500">
                            {o.alamat_pengiriman}
                          </p>
                        )}
                        {(o.kelurahan || o.kecamatan || o.kabupaten_kota) && (
                          <p className="text-slate-500">
                            {[
                              o.kelurahan,
                              o.kecamatan,
                              o.kabupaten_kota,
                              o.provinsi,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                            {o.kodepos ? ` ${o.kodepos}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deliveries */}
                  {detail.deliveries.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Riwayat Pengiriman
                      </p>
                      <div className="space-y-2">
                        {detail.deliveries.map((d) => (
                          <div
                            key={d.id}
                            className="rounded-lg border border-slate-200 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-700">
                                {d.delivery_method}
                              </span>
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                  d.status === "delivered"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : d.status === "dispatched"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {d.status}
                              </span>
                            </div>
                            {d.courier_name && (
                              <p className="text-slate-500">
                                Kurir: {d.courier_name}
                              </p>
                            )}
                            {d.tracking_number && (
                              <p className="text-slate-500">
                                Resi: {d.tracking_number}
                              </p>
                            )}
                            {d.delivered_at && (
                              <p className="text-slate-400">
                                Diterima: {formatDateTime(d.delivered_at)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── STAGES TAB ── */}
              {tab === "stages" && (
                <>
                  {detail.transitions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
                        Riwayat Perpindahan Tahap
                      </p>
                      <div className="space-y-0">
                        {detail.transitions.map((t, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-2.5 w-2.5 rounded-full border-2 ${
                                  i === detail.transitions.length - 1
                                    ? "bg-slate-800 border-slate-800"
                                    : "bg-white border-slate-300"
                                }`}
                              />
                              {i < detail.transitions.length - 1 && (
                                <div className="w-px flex-1 bg-slate-200 my-0.5" />
                              )}
                            </div>
                            <div className="pb-3 flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700">
                                {STAGE_LABELS_DETAIL[t.to_stage] ?? t.to_stage}
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
                  )}

                  {detail.stageResults.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2 mt-2">
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
                                {STAGE_LABELS_DETAIL[sr.stage] ?? sr.stage}
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

                  {detail.transitions.length === 0 &&
                    detail.stageResults.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-8">
                        Belum ada riwayat tahap
                      </p>
                    )}
                </>
              )}

              {/* ── APPROVALS TAB ── */}
              {tab === "approvals" && (
                <>
                  {detail.approvals.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Belum ada riwayat persetujuan
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.approvals.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg border border-slate-200 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-700">
                              {STAGE_LABELS_DETAIL[a.stage] ?? a.stage}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                a.decision === "approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {a.decision === "approved"
                                ? "Disetujui"
                                : "Ditolak"}
                            </span>
                          </div>
                          <p className="text-slate-500">
                            {a.users?.full_name || "—"} ·{" "}
                            {formatDateTime(a.decided_at)}
                          </p>
                          {a.remarks && (
                            <p className="text-slate-500 mt-1 italic">
                              "{a.remarks}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SupervisorGroup = "all" | "production" | "operational";

export default function SupervisorMonitoringPage() {
  const router = useRouter();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOrderNumber, setDetailOrderNumber] = useState<string>("");
  const [supervisorGroup, setSupervisorGroup] =
    useState<SupervisorGroup>("all");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (!res.ok) {
        router.push("/workshop/login");
        return;
      }
      const json = await res.json();
      const u = json.data;
      const allowedStages: string[] = u.role?.allowed_stages ?? [];
      const canAccess =
        u.role?.name === "superadmin" ||
        u.role?.role_group === "management" ||
        allowedStages.some((s: string) => s.startsWith("approval_"));
      if (!canAccess) {
        router.push("/workshop/login");
        return;
      }
      setUserEmail(u.username || u.full_name || "");
      if (u.role?.name === "production_supervisor") {
        setSupervisorGroup("production");
      } else if (u.role?.name === "operational_supervisor") {
        setSupervisorGroup("operational");
      } else {
        setSupervisorGroup("all");
      }
    })();
  }, [router]);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor");
      if (!res.ok) throw new Error("Gagal memuat data monitoring");
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
    const interval = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredOrders = (filter === "completed" ? data?.completedOrders || [] : data?.orders || []).filter((o) => {
    if (filter === "all" || filter === "completed") return true;
    if (filter === "production") return o.stage_group === "production";
    if (filter === "operational") return o.stage_group === "operational";
    if (filter === "pending") return APPROVAL_STAGES.includes(o.current_stage);
    return true;
  });

  const showAllTabs = supervisorGroup === "all";
  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "Semua", count: data?.orders.length },
    ...(showAllTabs ? [{ key: "production" as const, label: "Produksi", count: data?.stats.productionCount }] : []),
    ...(showAllTabs ? [{ key: "operational" as const, label: "Operasional", count: data?.stats.operationalCount }] : []),
    { key: "pending", label: "Perlu Tindakan", count: data?.stats.pendingApprovals },
    { key: "completed", label: "Selesai", count: data?.completedOrders?.length },
  ];
  const availableKeys = tabs.map((t) => t.key);
  useEffect(() => {
    if (filter !== "completed" && !availableKeys.includes(filter as any)) {
      setFilter("all");
    }
  }, [filter, availableKeys.join(",")]);

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
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Monitoring Workshop
                </h2>
                {supervisorGroup === "production" && (
                  <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Supervisor Produksi
                  </span>
                )}
                {supervisorGroup === "operational" && (
                  <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    Supervisor Operasional
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Status real-time semua order aktif
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {data?.stats.pendingApprovals ? (
                <Link
                  href="/dashboard/supervisor/approval"
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
                >
                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {data.stats.pendingApprovals} menunggu persetujuan
                  </span>
                  <span className="sm:hidden">
                    {data.stats.pendingApprovals} approval
                  </span>
                </Link>
              ) : null}
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
            <MonitoringSkeleton />
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
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                  label="Total Aktif"
                  value={data.stats.totalActive}
                  icon={Activity}
                  tone="slate"
                />
                <StatCard
                  label="Produksi"
                  value={data.stats.productionCount}
                  icon={Hammer}
                  tone="amber"
                />
                <StatCard
                  label="Operasional"
                  value={data.stats.operationalCount}
                  icon={Settings}
                  tone="blue"
                />
                <StatCard
                  label="Submission Hari Ini"
                  value={data.stats.submissionsToday}
                  icon={CheckCircle2}
                  tone="emerald"
                />
                <StatCard
                  label="Perlu Persetujuan"
                  value={data.stats.pendingApprovals}
                  icon={ShieldCheck}
                  tone={data.stats.pendingApprovals > 0 ? "rose" : "slate"}
                  className="col-span-2 sm:col-span-1"
                />
              </div>

              {/* Filter tabs */}
              <div className="border-b border-slate-200 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <div className="flex items-center gap-1 min-w-max">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                        filter === tab.key
                          ? "border-slate-800 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            filter === tab.key
                              ? "bg-slate-800 text-white"
                              : tab.count > 0
                                ? "bg-slate-100 text-slate-700"
                                : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="py-12 sm:py-16 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">
                    Tidak ada order aktif di kategori ini
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="block md:hidden space-y-2 sm:space-y-3">
                    {filteredOrders.map((order) => {
                      const dl = formatDeadline(order.deadline);
                      const isCompleted = filter === "completed" || order.status === "completed";
                      const completedDate = isCompleted ? (order as any).completed_at : null;
                      const processMs = (order as any).process_time_ms ?? null;
                      const processLabel = processMs !== null
                        ? processMs < 3600000
                          ? `${Math.round(processMs / 60000)}m`
                          : processMs < 86400000
                            ? `${Math.round(processMs / 3600000)}j`
                            : `${Math.round(processMs / 86400000)} hari`
                        : null;
                      const onTime = order.deadline && completedDate
                        ? new Date(completedDate) <= new Date(order.deadline)
                        : null;

                      if (isCompleted) {
                        return (
                          <button
                            key={order.id}
                            onClick={() => {
                              setDetailOrderId(order.id);
                              setDetailOrderNumber(order.order_number);
                            }}
                            className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 sm:p-4 active:bg-slate-50 transition-colors hover:border-slate-300"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="min-w-0">
                                <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800">
                                  {order.order_number}
                                </span>
                                {order.customer_name && (
                                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium truncate">
                                    {order.customer_name}
                                  </p>
                                )}
                              </div>
                              <span className="inline-block shrink-0 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium">
                                Selesai
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs gap-2 flex-wrap mt-1.5">
                              <span className="text-slate-500">
                                {completedDate
                                  ? new Date(completedDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                                  : "—"}
                              </span>
                              <div className="flex items-center gap-2">
                                {processLabel && (
                                  <span className="text-slate-400">{processLabel}</span>
                                )}
                                {onTime !== null ? (
                                  onTime
                                    ? <span className="text-emerald-600 font-medium">Tepat Waktu</span>
                                    : <span className="text-rose-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Terlambat</span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      }

                      const hoursLabel = order.hours_at_stage !== null
                        ? order.hours_at_stage >= 24
                          ? `${Math.floor(order.hours_at_stage / 24)}h ${order.hours_at_stage % 24}j`
                          : `${order.hours_at_stage}j`
                        : "—";
                      const isStuck = order.hours_at_stage !== null && order.hours_at_stage > 24;
                      return (
                        <button
                          key={order.id}
                          onClick={() => {
                            setDetailOrderId(order.id);
                            setDetailOrderNumber(order.order_number);
                          }}
                          className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 sm:p-4 active:bg-slate-50 transition-colors hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800">
                                {order.order_number}
                              </span>
                              {order.customer_name && (
                                <p className="text-[11px] text-slate-600 mt-0.5 font-medium truncate">
                                  {order.customer_name}
                                </p>
                              )}
                            </div>
                            <span className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium ${STAGE_COLORS[order.stage_group]}`}>
                              {order.stage_label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs gap-2 flex-wrap mt-1.5">
                            <span className="text-slate-500 truncate max-w-[60%]">
                              {order.last_worker
                                ? `${order.last_worker} · ${formatRelative(order.last_submission_at)}`
                                : "Belum ada submission"}
                            </span>
                            <div className="flex items-center gap-2">
                              {hoursLabel !== "—" && (
                                <span className={`text-[10px] sm:text-[11px] font-medium ${isStuck ? "text-rose-600" : "text-slate-400"}`}>
                                  {isStuck && <Clock className="inline h-3 w-3 mr-0.5" />}
                                  {hoursLabel}
                                </span>
                              )}
                              <span className={dl.urgent ? "font-semibold text-rose-600" : "text-slate-400"}>
                                {dl.urgent && <AlertTriangle className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
                                {dl.label}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Order / Customer
                            </th>
                            {filter === "completed" ? (
                              <>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Selesai
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Waktu Proses
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Deadline
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Status
                                </th>
                              </>
                            ) : (
                              <>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Tahap
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Petugas Terakhir
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">
                                  Lama di Tahap
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">
                                  Deadline
                                </th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredOrders.map((order) => {
                            const isCompleted = filter === "completed" || order.status === "completed";
                            const completedDate = isCompleted ? (order as any).completed_at : null;
                            const processMs = (order as any).process_time_ms ?? null;
                            const processLabel = processMs !== null
                              ? processMs < 3600000
                                ? `${Math.round(processMs / 60000)}m`
                                : processMs < 86400000
                                  ? `${Math.round(processMs / 3600000)}j`
                                  : `${Math.round(processMs / 86400000)} hari`
                              : null;
                            const onTime = order.deadline && completedDate
                              ? new Date(completedDate) <= new Date(order.deadline)
                              : null;

                            if (isCompleted) {
                              return (
                                <tr
                                  key={order.id}
                                  onClick={() => { setDetailOrderId(order.id); setDetailOrderNumber(order.order_number); }}
                                  className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                >
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-semibold text-slate-800">{order.order_number}</span>
                                    {order.customer_name && <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{order.customer_name}</p>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-slate-700 text-xs">
                                      {completedDate ? new Date(completedDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-slate-700 text-xs">{processLabel ?? "—"}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs text-slate-600">
                                      {order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {onTime === true ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Tepat Waktu
                                      </span>
                                    ) : onTime === false ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                                        <AlertTriangle className="h-3 w-3" />
                                        Terlambat
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-300">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }

                            const dl = formatDeadline(order.deadline);
                            const hoursLabel = order.hours_at_stage !== null
                              ? order.hours_at_stage >= 24
                                ? `${Math.floor(order.hours_at_stage / 24)}h ${order.hours_at_stage % 24}j`
                                : `${order.hours_at_stage}j`
                              : "—";
                            const isStuck = order.hours_at_stage !== null && order.hours_at_stage > 24;
                            return (
                              <tr
                                key={order.id}
                                onClick={() => { setDetailOrderId(order.id); setDetailOrderNumber(order.order_number); }}
                                className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                              >
                                <td className="px-4 py-3">
                                  <span className="font-mono text-xs font-semibold text-slate-800">{order.order_number}</span>
                                  {order.customer_name && <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{order.customer_name}</p>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${STAGE_COLORS[order.stage_group]}`}>
                                    {order.stage_label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {order.last_worker ? (
                                    <div>
                                      <span className="text-slate-700">{order.last_worker}</span>
                                      <p className="text-[11px] text-slate-400 mt-0.5">{formatRelative(order.last_submission_at)}</p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-xs">Belum ada submission</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                  {hoursLabel !== "—" ? (
                                    <div>
                                      <span className={`text-sm font-medium ${isStuck ? "text-rose-600" : "text-slate-600"}`}>
                                        {isStuck && <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
                                        {hoursLabel}
                                      </span>
                                      <p className="text-[11px] text-slate-400 mt-0.5">{order.stage_label}</p>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                  <span className={`text-sm ${dl.urgent ? "font-semibold text-rose-600" : "text-slate-600"}`}>
                                    {dl.urgent && <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
                                    {dl.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>

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

function MonitoringSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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
