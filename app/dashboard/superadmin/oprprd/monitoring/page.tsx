// app/dashboard/superadmin/oprprd/monitoring/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck2,
  Flame,
  FlaskConical,
  Gem,
  Hammer,
  Loader2,
  Microscope,
  RefreshCw,
  ScanLine,
  Search,
  Sparkles,
  Target,
  Truck,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getStageDeadlineStatus } from "@/lib/stage-deadlines";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Expert {
  userId: string;
  fullName: string;
  roleName: string;
  stage: string | null;
  totalScans: number;
  ordersHandled: number;
  activeOrder: { orderNumber: string; startedAt: string } | null;
  rataSusut: number | null;
  targetSusut: number | null;
}

interface GemstoneInfo {
  type?: string;
  gemstone_type?: string;
  pieces?: number;
  carat_total?: number;
}

interface MicroRow {
  order_id: string;
  order_number: string;
  gemstone_info: GemstoneInfo[] | null;
  current_stage: string;
  staff_name: string | null;
  weight_before: number | null;
  weight_after: number | null;
  status: "waiting" | "in_progress" | "completed";
}

interface YieldDataRow {
  order_number: string;
  target: number | null;
  actual: number | null;
}

interface ProduksiData {
  experts: Expert[];
  microSetting: MicroRow[];
  yieldData: YieldDataRow[];
}

interface KonfirmasiOrder {
  order_number: string;
  customer_name: string | null;
  dp_requested_at: string | null;
  dp_amount: number | null;
  hours_elapsed: number;
}

interface PelunasanOrder {
  order_number: string;
  customer_name: string | null;
  total_price: number | null;
  dp_paid: number | null;
  remaining_amount: number | null;
  payment_status: string | null;
  final_payment_method: string | null;
}

interface DeliveryOrder {
  order_number: string;
  customer_name: string | null;
  delivery_method: string | null;
  shipped_at: string | null;
  courier_name: string | null;
  tracking_number: string | null;
}

interface AdminTask {
  order_id: string;
  order_number: string;
  stage: string;
  executed_by: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  is_delayed: boolean;
}

interface RacikLog {
  order_number: string;
  staff_name: string | null;
  target_weight: number | null;
  total_weight: number | null;
}

interface LaserResult {
  order_number: string;
  ring_identity_number: string | null;
  font_style: string | null;
}

interface QCSummaryRow {
  qc_type: string;
  total_checks: number;
  passed: number;
  failed: number;
  pass_rate: number;
}

interface QCActivity {
  order_number: string;
  stage: string;
  result: string | null;
  executed_by: string | null;
  finished_at: string | null;
  notes: string | null;
}

interface OperasionalData {
  afterSales: {
    konfirmasi: KonfirmasiOrder[];
    pelunasan: PelunasanOrder[];
    delivery: DeliveryOrder[];
  };
  adminTasks: AdminTask[];
  racik: {
    totalBeratTeoritis: number;
    rataDeviasi: number;
    rataBuffer: number;
    logs: RacikLog[];
  };
  laser: {
    mesinAktif: string[];
    antrianUkir: number;
    rataWaktuPengerjaan: number;
    recentResults: LaserResult[];
  };
  qc: {
    summary: QCSummaryRow[];
    activity: QCActivity[];
  };
}

interface BottleneckItem {
  order_id: string;
  order_number: string;
  customer_name: string | null;
  hours_waiting: number | null;
  status: string;
  last_worker: string | null;
  last_submission: string | null;
  approval_decision: string | null;
  approved_by: string | null;
  approved_at: string | null;
  deadline: string | null;
  current_stage: string;
}

interface StageBottleneck {
  stage: string;
  stage_label: string;
  stage_group: string;
  order_count: number;
  waiting_orders: number;
  avg_hours: number | null;
  longest_hours: number | null;
  bottlenecks: BottleneckItem[];
  orders: BottleneckItem[];
}

interface BottleneckData {
  bottlenecks: StageBottleneck[];
  summary: {
    total_stages_with_orders: number;
    total_orders: number;
  };
}

interface OrderDetail {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_wa: string | null;
    customer_email: string | null;
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
    deadline: string | null;
    tgl_order: string | null;
    tgl_acara: string | null;
    acara: string | null;
    pengiriman: string | null;
    alamat_pengiriman: string | null;
    reference_image_pria_url: string | null;
    reference_image_wanita_url: string | null;
    current_stage: string;
    status: string;
    created_at: string;
    updated_at: string;
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
  approvals: Array<{
    id: string;
    stage: string;
    decision: string;
    remarks: string | null;
    decided_at: string;
    users: { full_name: string } | null;
  }>;
}

type ActiveTab = "overview" | "produksi" | "operasional";

export const dynamic = "force-dynamic";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { name: string; Icon: LucideIcon }> = {
  jewelry_expert_lebur_bahan: { name: "Lebur Bahan", Icon: Flame },
  jewelry_expert_pembentukan_awal: { name: "Pembentukan Cincin", Icon: Hammer },
  jewelry_expert_finishing: { name: "Finishing & Poles", Icon: Sparkles },
  micro_setting: { name: "Micro Setting", Icon: Gem },
  laser: { name: "Laser Engraving", Icon: ScanLine },
};

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan",
  racik_bahan: "Racik Bahan",
  approval_racik_bahan: "Approval Racik",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  cek_kadar: "Cek Kadar",
  pemasangan_permata: "Micro Setting",
  pemolesan: "Pemolesan",
  qc_1: "QC Awal",
  approval_qc_1: "Approval QC Awal",
  laser: "Laser Engraving",
  finishing: "Finishing",
  approval_produksi: "Approval Produksi",
  qc_2: "QC Akhir",
  approval_qc_2: "Approval QC Akhir",
  konfirmasi: "Konfirmasi Customer",
  packing: "Packing",
  pengiriman: "Pengiriman",
  order_complete: "Penyelesaian Order",
};

const QC_LABELS: Record<string, string> = { qc_1: "QC Awal", qc_2: "QC Akhir" };

const DELIVERY_LABELS: Record<string, string> = {
  pickup_store: "Pickup di Toko",
  courier_local: "Kurir Lokal",
  courier_intercity: "Kurir Antar Kota",
  in_house_delivery: "Antar Langsung",
  other: "Lainnya",
};

const STAGE_LABELS_DETAIL: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan Order",
  racik_bahan: "Persiapan Bahan",
  approval_racik_bahan: "Approval Persiapan Bahan",
  lebur_bahan: "Lebur Bahan",
  cek_kadar: "Cek Kadar",
  pembentukan_cincin: "Pembentukan Cincin",
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

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtTime(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m lalu`;
  if (hrs < 24) return `${hrs}j lalu`;
  if (days < 7) return `${days}h lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtHours(h: number): string {
  return h >= 24 ? `${Math.floor(h / 24)}h ${Math.round(h % 24)}j` : `${h}j`;
}

function fmtGemstone(info: GemstoneInfo[] | null): string {
  if (!info?.length) return "—";
  const f = info[0];
  const type = f.gemstone_type ?? f.type ?? "permata";
  const parts = [type];
  if (f.pieces && f.pieces > 1) parts.push(`×${f.pieces}`);
  if (f.carat_total != null) parts.push(`${f.carat_total}ct`);
  return parts.join(" ");
}

function getSLA(hours: number) {
  if (hours > 48)
    return {
      label: "Terlambat",
      cls: "bg-rose-50 text-rose-700 ring-rose-200",
    };
  if (hours > 24)
    return {
      label: "Perhatian",
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  return {
    label: "On Track",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
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
            <div className="min-w-0 pr-3">
              <span className="font-mono text-xs font-semibold text-slate-500">
                {orderNumber}
              </span>
              <h3 className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {o?.customer_name || "Memuat..."}
              </h3>
              {o && (
                <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium mt-1 text-slate-600">
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
                    </div>
                  </div>

                  {/* Ring specs */}
                  {(o.ukuran_pria || o.jenis_cincin_pria || o.ukiran_pria) && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Spesifikasi Pria
                      </p>
                      <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 text-xs">
                        {o.ukuran_pria && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ukuran</span>
                            <span className="font-semibold text-slate-700">
                              {o.ukuran_pria}
                            </span>
                          </div>
                        )}
                        {o.jenis_cincin_pria && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Jenis</span>
                            <span className="font-semibold text-slate-700">
                              {o.jenis_cincin_pria}
                            </span>
                          </div>
                        )}
                        {o.ukiran_pria && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ukiran</span>
                            <span className="font-semibold text-slate-700 font-mono">
                              {o.ukiran_pria}
                            </span>
                          </div>
                        )}
                        {o.keterangan_pria && o.keterangan_pria.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ket.</span>
                            <span className="text-slate-600 text-right max-w-[60%]">
                              {o.keterangan_pria.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(o.ukuran_wanita ||
                    o.jenis_cincin_wanita ||
                    o.ukiran_wanita) && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Spesifikasi Wanita
                      </p>
                      <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 text-xs">
                        {o.ukuran_wanita && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ukuran</span>
                            <span className="font-semibold text-slate-700">
                              {o.ukuran_wanita}
                            </span>
                          </div>
                        )}
                        {o.jenis_cincin_wanita && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Jenis</span>
                            <span className="font-semibold text-slate-700">
                              {o.jenis_cincin_wanita}
                            </span>
                          </div>
                        )}
                        {o.ukiran_wanita && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ukiran</span>
                            <span className="font-semibold text-slate-700 font-mono">
                              {o.ukiran_wanita}
                            </span>
                          </div>
                        )}
                        {o.keterangan_wanita &&
                          o.keterangan_wanita.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ket.</span>
                              <span className="text-slate-600 text-right max-w-[60%]">
                                {o.keterangan_wanita.join(", ")}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {(o.font || o.laser_position) && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {o.font && (
                        <div className="bg-slate-50 rounded p-2">
                          <span className="text-slate-400">Font</span>
                          <p className="font-medium text-slate-700">{o.font}</p>
                        </div>
                      )}
                      {o.laser_position && (
                        <div className="bg-slate-50 rounded p-2">
                          <span className="text-slate-400">Posisi Laser</span>
                          <p className="font-medium text-slate-700">
                            {o.laser_position}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reference images */}
                  {(o.reference_image_pria_url ||
                    o.reference_image_wanita_url) && (
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
                  )}

                  {/* Price & dates */}
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
                      {o.deadline && (() => {
                        const dl = getStageDeadlineStatus(o.deadline, o.current_stage);
                        if (!dl) return null;
                        return (
                          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${dl.isOverdue ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
                            {dl.isOverdue ? `⚠ ${Math.abs(dl.daysRemaining)}h` : `✔ H-${Math.max(dl.daysRemaining, 1)}`}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
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

export default function MonitoringPage() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [prodData, setProdData] = useState<ProduksiData | null>(null);
  const [opData, setOpData] = useState<OperasionalData | null>(null);
  const [bnData, setBnData] = useState<BottleneckData | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Array<{ id: string; order_number: string; customer_name: string; completed_at: string }>>([]);
  const [reworkData, setReworkData] = useState<{
    reworkCount: number;
    totalOrders: number;
    reworkRate: number;
    majorCount: number;
    minorCount: number;
    topStageRework: Array<{ flow: string; count: number }>;
    recentRework: Array<{ order_id: string; from_stage: string; to_stage: string; reason: string; severity: string; logged_at: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [bnFilter, setBnFilter] = useState<
    "all" | "production" | "operational" | "completed"
  >("all");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOrderNumber, setDetailOrderNumber] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const cu = getClientUser();
    if (!cu) {
      router.push("/login");
      return;
    }
    setClientUser(cu);
  }, [router]);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError(null);
      const qp = new URLSearchParams();
      if (dateFrom) qp.set("from", dateFrom);
      if (dateTo) qp.set("to", dateTo);
      const qs = qp.toString();
      const [pRes, oRes, bRes, sRes, rwRes] = await Promise.allSettled([
        fetch(`/api/production${qs ? `?${qs}` : ""}`),
        fetch(`/api/operational${qs ? `?${qs}` : ""}`),
        fetch(`/api/bottleneck${qs ? `?${qs}` : ""}`),
        fetch(`/api/supervisor${qs ? `?${qs}` : ""}`),
        fetch(`/api/rework-overview${qs ? `?${qs}` : ""}`),
      ]);
      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const j = await pRes.value.json();
        setProdData(j.data ?? j);
      }
      if (oRes.status === "fulfilled" && oRes.value.ok) {
        const j = await oRes.value.json();
        setOpData(j.data ?? j);
      }
      if (bRes.status === "fulfilled" && bRes.value.ok) {
        const j = await bRes.value.json();
        setBnData(j.data);
      }
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const j = await sRes.value.json();
        setCompletedOrders(j.data?.completedOrders ?? []);
      }
      if (rwRes.status === "fulfilled" && rwRes.value.ok) {
        const j = await rwRes.value.json();
        setReworkData(j.data);
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo]);

  // Pusher real-time + polling fallback
  useEffect(() => {
    fetchData();
    const userId = clientUser?.id;
    let channel: any = null;
    let pollTimer: ReturnType<typeof setInterval>;

    async function initPusher() {
      if (!userId) return;
      try {
        const { default: Pusher } = await import("pusher-js");
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          authEndpoint: "/api/pusher/auth",
        });
        channel = pusher.subscribe(`private-user-${userId}`);
        channel.bind("new-notification", () => fetchData(false));
      } catch {
        // Pusher not available — polling fallback below will handle
        console.warn("[monitoring] Pusher unavailable, using polling");
      }
    }

    initPusher();

    // Fallback: poll every 60s (Pusher handles instant updates)
    pollTimer = setInterval(() => fetchData(false), 60_000);

    return () => {
      if (channel) channel.unsubscribe();
      clearInterval(pollTimer);
    };
  }, [fetchData, clientUser?.id]);

  // Derived summary metrics
  const activeExperts =
    prodData?.experts.filter((e) => e.activeOrder).length ?? 0;
  const avgYield = (() => {
    const rows =
      prodData?.yieldData.filter((r) => r.actual && r.target && r.target > 0) ??
      [];
    if (!rows.length) return 0;
    return (
      rows.reduce((acc, r) => acc + (r.actual! / r.target!) * 100, 0) /
      rows.length
    );
  })();
  const urgentCount =
    opData?.afterSales.konfirmasi.filter((o) => o.hours_elapsed > 48).length ??
    0;
  const qcPassRate = (() => {
    const rows = opData?.qc.summary ?? [];
    if (!rows.length) return null;
    return (
      rows.reduce((acc, r) => acc + Number(r.pass_rate ?? 0), 0) / rows.length
    );
  })();
  const criticalBn =
    bnData?.bottlenecks.filter((b) => b.avg_hours && b.avg_hours > 24).length ??
    0;
  const filteredBn =
    bnFilter === "completed" ? [] :
    bnData?.bottlenecks
      .filter((b) => bnFilter === "all" ? true : b.stage_group === bnFilter)
      .map((b) => ({
        ...b,
        orders: !searchQuery ? b.orders : b.orders.filter(
          (o) =>
            o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.customer_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((b) => searchQuery ? b.orders.length > 0 : true) ?? [];
  const prodBnCount =
    bnData?.bottlenecks.filter((b) => b.stage_group === "production").length ??
    0;
  const opBnCount =
    bnData?.bottlenecks.filter((b) => b.stage_group === "operational").length ??
    0;

  const TABS: { key: ActiveTab; label: string; desc: string }[] = [
    { key: "overview", label: "Overview", desc: "KPI & Bottleneck" },
    {
      key: "produksi",
      label: "Produksi",
      desc: "Tukang, Micro Setting, Yield",
    },
    {
      key: "operasional",
      label: "Operasional",
      desc: "After Sales, QC, Racik/Laser",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Monitoring OPR-PRD
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Pantau operasional & produksi secara terpadu
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari order / customer..."
                  className="w-52 rounded-md border border-slate-200 bg-white px-3 py-1.5 pl-8 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                title="Dari tanggal"
              />
              <span className="text-xs text-slate-400">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                title="Sampai tanggal"
              />
              {lastUpdated && (
                <span className="text-xs text-slate-400 tabular-nums">
                  {lastUpdated.toLocaleTimeString("id-ID")}
                </span>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex items-end border-b border-slate-200 mb-6 gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`group flex flex-col items-start px-5 py-3 text-left transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="text-sm font-semibold">{tab.label}</span>
                <span
                  className={`text-[10px] mt-0.5 transition-colors ${activeTab === tab.key ? "text-slate-500" : "text-slate-400"}`}
                >
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <Loading variant="skeleton" text="Memuat data monitoring..." />
          ) : error ? (
            <ErrorState error={error} onRetry={() => fetchData(true)} />
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  prodData={prodData}
                  opData={opData}
                  bnData={bnData}
                  activeExperts={activeExperts}
                  avgYield={avgYield}
                  urgentCount={urgentCount}
                  qcPassRate={qcPassRate}
                  criticalBn={criticalBn}
                  bnFilter={bnFilter}
                  setBnFilter={setBnFilter}
                  filteredBn={filteredBn}
                  prodBnCount={prodBnCount}
                  opBnCount={opBnCount}
                  completedOrders={completedOrders}
                  reworkData={reworkData}
                  onOrderClick={(orderId, orderNumber) => {
                    setDetailOrderId(orderId);
                    setDetailOrderNumber(orderNumber);
                  }}
                />
              )}
              {activeTab === "produksi" && <ProduksiTab data={prodData} searchQuery={searchQuery} />}
              {activeTab === "operasional" && <OperasionalTab data={opData} searchQuery={searchQuery} />}
            </>
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

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  prodData,
  opData,
  bnData,
  activeExperts,
  avgYield,
  urgentCount,
  qcPassRate,
  criticalBn,
  bnFilter,
  setBnFilter,
  filteredBn,
  prodBnCount,
  opBnCount,
  completedOrders,
  reworkData,
  onOrderClick,
}: {
  prodData: ProduksiData | null;
  opData: OperasionalData | null;
  bnData: BottleneckData | null;
  activeExperts: number;
  avgYield: number;
  urgentCount: number;
  qcPassRate: number | null;
  criticalBn: number;
  bnFilter: "all" | "production" | "operational" | "completed";
  setBnFilter: (v: "all" | "production" | "operational" | "completed") => void;
  filteredBn: StageBottleneck[];
  prodBnCount: number;
  opBnCount: number;
  completedOrders: Array<{ id: string; order_number: string; customer_name: string; completed_at: string }>;
  reworkData: {
    reworkCount: number;
    totalOrders: number;
    reworkRate: number;
    majorCount: number;
    minorCount: number;
    topStageRework: Array<{ flow: string; count: number }>;
    recentRework: Array<{ order_id: string; from_stage: string; to_stage: string; reason: string; severity: string; logged_at: string }>;
  } | null;
  onOrderClick: (orderId: string, orderNumber: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiChip
          label="Order Aktif"
          value={String(bnData?.summary.total_orders ?? 0)}
          icon={Activity}
          accent="sky"
          sub="semua"
        />
        <KpiChip
          label="Selesai"
          value={String(completedOrders.length)}
          icon={CheckCircle2}
          accent="emerald"
          sub="bulan ini"
        />
        <KpiChip
          label="Tukang Aktif"
          value={`${activeExperts}/${prodData?.experts.length ?? 0}`}
          icon={Users}
          accent="amber"
          sub="produksi"
        />
        <KpiChip
          label="Micro Setting"
          value={`${prodData?.microSetting.filter((m) => m.status === "in_progress").length ?? 0} aktif`}
          icon={Microscope}
          accent="violet"
          sub="produksi"
        />
        <KpiChip
          label="QC Pass Rate"
          value={qcPassRate != null ? `${qcPassRate.toFixed(0)}%` : "—"}
          icon={CheckCircle2}
          accent={
            qcPassRate == null
              ? "slate"
              : qcPassRate >= 80
                ? "emerald"
                : qcPassRate >= 60
                  ? "amber"
                  : "rose"
          }
          sub="operasional"
        />
        <KpiChip
          label="Bottleneck"
          value={criticalBn > 0 ? `${criticalBn} kritis` : "Normal"}
          icon={criticalBn > 0 ? AlertTriangle : CheckCircle2}
          accent={criticalBn > 0 ? "rose" : "emerald"}
          sub="semua"
        />
      </div>

      {/* ── Rework Overview ── */}
      {reworkData && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Rework
              </h2>
              <span className="text-xs text-slate-500">
                {reworkData.reworkCount} dari {reworkData.totalOrders} order
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                reworkData.reworkRate > 20
                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                  : reworkData.reworkRate > 10
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
              }`}
            >
              {reworkData.reworkRate}% rework rate
            </span>
          </header>
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Total Rework
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {reworkData.reworkCount}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Major
              </p>
              <p className="mt-0.5 text-lg font-bold text-rose-600">
                {reworkData.majorCount}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Minor
              </p>
              <p className="mt-0.5 text-lg font-bold text-amber-600">
                {reworkData.minorCount}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Rework Rate
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {reworkData.reworkRate}%
              </p>
            </div>
          </div>
          {reworkData.topStageRework.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
                Top Rework Flow
              </p>
              <div className="flex flex-wrap gap-2">
                {reworkData.topStageRework.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200"
                  >
                    {item.flow}
                    <span className="ml-0.5 font-bold">{item.count}x</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Bottleneck Table ── */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Bottleneck — Semua Tahap
            </h2>
            {bnData && (
              <span className="text-xs text-slate-500 ml-1">
                ·{" "}
                <span className="font-medium text-slate-700">
                  {bnData.summary.total_orders}
                </span>{" "}
                order aktif
              </span>
            )}
          </div>
          {criticalBn > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
              <AlertTriangle className="h-3 w-3" />
              {criticalBn} kritis
            </span>
          )}
        </header>

        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 border-b border-slate-100 px-5 overflow-x-auto">
          {[
            {
              key: "all" as const,
              label: "Semua",
              count: bnData?.bottlenecks.length ?? 0,
            },
            {
              key: "production" as const,
              label: "Produksi",
              count: prodBnCount,
            },
            {
              key: "operational" as const,
              label: "Operasional",
              count: opBnCount,
            },
            {
              key: "completed" as const,
              label: "Selesai",
              count: completedOrders.length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setBnFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                bnFilter === tab.key
                  ? "border-slate-800 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  bnFilter === tab.key
                    ? "bg-slate-800 text-white"
                    : tab.count > 0
                      ? "bg-slate-100 text-slate-700"
                      : "bg-slate-50 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {bnFilter === "completed" ? (
          completedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-300 mb-3" />
              <p className="text-sm text-slate-400">
                Belum ada order selesai
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {completedOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => onOrderClick(o.id, o.order_number)}
                  className="flex items-center justify-between w-full text-left px-5 py-3 text-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">{o.customer_name || "—"}</p>
                    <p className="text-xs text-slate-400 font-mono">{o.order_number}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-emerald-600 font-medium">Selesai</p>
                      <p className="text-xs text-slate-400">
                        {o.completed_at ? new Date(o.completed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}
                      </p>
                    </div>
                    <svg className="h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : filteredBn.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-300 mb-3" />
            <p className="text-sm text-slate-400">
              Tidak ada bottleneck di kategori ini
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs">
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                    Tahap
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-slate-500">
                    Order
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-slate-500">
                    Rata² Waktu
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-slate-500">
                    Terlama
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                    Order Terlambat
                  </th>
                  <th className="px-5 py-2.5 text-center font-medium text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBn.map((s) => (
                  <BnRow key={s.stage} stage={s} onOrderClick={onOrderClick} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Snapshots ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Production snapshot */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Produksi — Status Tukang
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {activeExperts}
              </span>{" "}
              sedang bekerja
            </span>
          </header>
          {!prodData || prodData.experts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Belum ada data tukang
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {prodData.experts.slice(0, 6).map((e) => {
                const cfg = ROLE_CONFIG[e.roleName] ?? {
                  name: e.roleName,
                  Icon: Wrench,
                };
                const { Icon } = cfg;
                const isActive = !!e.activeOrder;
                const mins = e.activeOrder
                  ? Math.floor(
                      (Date.now() -
                        new Date(e.activeOrder.startedAt).getTime()) /
                        60_000,
                    )
                  : null;
                return (
                  <div
                    key={e.userId}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-emerald-50" : "bg-slate-50"}`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {e.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {cfg.name}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right ml-3">
                      {isActive ? (
                        <div>
                          <p className="font-mono text-xs font-semibold text-emerald-700">
                            {e.activeOrder!.orderNumber}
                          </p>
                          <p className="text-[10px] text-slate-400">{mins}m</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                          Idle
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {prodData.experts.length > 6 && (
                <div className="px-5 py-2 text-center text-xs text-slate-400">
                  +{prodData.experts.length - 6} tukang lainnya
                </div>
              )}
            </div>
          )}
        </section>

        {/* Operational snapshot */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Operasional — After Sales & QC
              </h2>
            </div>
          </header>
          {!opData ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Belum ada data operasional
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* After sales counts */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    icon: Camera,
                    label: "Konfirmasi",
                    count: opData.afterSales.konfirmasi.length,
                    accent: "sky",
                  },
                  {
                    icon: DollarSign,
                    label: "Pelunasan",
                    count: opData.afterSales.pelunasan.length,
                    accent: "amber",
                  },
                  {
                    icon: Truck,
                    label: "Delivery",
                    count: opData.afterSales.delivery.length,
                    accent: "emerald",
                  },
                ].map(({ icon: Icon, label, count, accent }) => (
                  <div
                    key={label}
                    className={`rounded-lg border p-3 ${
                      accent === "sky"
                        ? "border-sky-100 bg-sky-50/50"
                        : accent === "amber"
                          ? "border-amber-100 bg-amber-50/50"
                          : "border-emerald-100 bg-emerald-50/50"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 mb-1 ${
                        accent === "sky"
                          ? "text-sky-500"
                          : accent === "amber"
                            ? "text-amber-500"
                            : "text-emerald-500"
                      }`}
                    />
                    <p className="text-xl font-bold text-slate-900 tabular-nums">
                      {count}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {urgentCount > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/60 p-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                  <p className="text-xs text-rose-700">
                    <span className="font-semibold">{urgentCount} order</span>{" "}
                    konfirmasi butuh follow up segera (&gt;48 jam)
                  </p>
                </div>
              )}

              {/* QC summary */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  QC Pass Rate (7 hari)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["qc_1", "qc_2"] as const).map((qcKey) => {
                    const row = opData.qc.summary.find(
                      (s) => s.qc_type === qcKey,
                    );
                    const rate = row ? Number(row.pass_rate ?? 0) : null;
                    return (
                      <div
                        key={qcKey}
                        className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-700">
                            {QC_LABELS[qcKey]}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              rate == null
                                ? "text-slate-300"
                                : rate >= 80
                                  ? "text-emerald-600"
                                  : rate >= 60
                                    ? "text-amber-600"
                                    : "text-rose-600"
                            }`}
                          >
                            {rate != null ? `${rate.toFixed(0)}%` : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${rate && rate >= 80 ? "bg-emerald-500" : rate && rate >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${rate ?? 0}%` }}
                          />
                        </div>
                        {row && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {row.passed}/{row.total_checks} lulus
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Produksi Tab ──────────────────────────────────────────────────────────────

function ProduksiTab({ data, searchQuery }: { data: ProduksiData | null; searchQuery: string }) {
  if (!data) return <EmptyState text="Data produksi tidak tersedia" />;

  const q = searchQuery.toLowerCase().trim();

  const filteredExperts = !q
    ? data.experts
    : data.experts.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.roleName.toLowerCase().includes(q) ||
          (e.activeOrder?.orderNumber ?? "").toLowerCase().includes(q),
      );

  const filteredMicro = !q
    ? data.microSetting
    : data.microSetting.filter(
        (m) =>
          m.order_number.toLowerCase().includes(q) ||
          (m.staff_name ?? "").toLowerCase().includes(q),
      );

  const filteredYield = !q
    ? data.yieldData
    : data.yieldData.filter((r) =>
        r.order_number.toLowerCase().includes(q),
      );

  const activeExperts = data.experts.filter((e) => e.activeOrder).length;
  const yieldRows = filteredYield.filter(
    (r) => r.actual && r.target && r.target > 0,
  );
  const avgYield = yieldRows.length
    ? yieldRows.reduce((acc, r) => acc + (r.actual! / r.target!) * 100, 0) /
      yieldRows.length
    : 0;
  const totalTarget = data.yieldData.reduce(
    (acc, r) => acc + (r.target ?? 0),
    0,
  );
  const totalActual = data.yieldData.reduce(
    (acc, r) => acc + (r.actual ?? 0),
    0,
  );

  return (
    <div className="space-y-5">
      {/* Expert Cards */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Jewelry Expert & Tukang
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <span className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{activeExperts}</span>{" "}
            dari{" "}
            <span className="font-medium text-slate-700">
              {data.experts.length}
            </span>{" "}
            aktif
          </span>
        </header>
        {filteredExperts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            {q ? "Tidak ditemukan" : "Belum ada data tukang aktif"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredExperts.map((e) => (
              <ExpertCard key={e.userId} expert={e} />
            ))}
          </div>
        )}
      </section>

      {/* Micro Setting + Yield */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Micro Setting */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Micro Setting
              </h2>
            </div>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
              {filteredMicro.length} order
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs">
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                    Order
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                    Permata
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                    Tukang
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                    Berat
                  </th>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMicro.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm text-slate-400"
                    >
                      {q ? "Tidak ditemukan" : "Tidak ada order micro setting"}
                    </td>
                  </tr>
                ) : (
                  filteredMicro.slice(0, 10).map((order) => (
                    <tr
                      key={order.order_id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-700">
                        {order.order_number}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Gem className="h-3 w-3 shrink-0 text-violet-400" />
                          <span className="text-xs text-slate-600">
                            {fmtGemstone(order.gemstone_info)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        {order.staff_name ?? (
                          <span className="text-slate-400">Menunggu</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        {order.weight_before != null &&
                        order.weight_after != null ? (
                          <span>
                            {order.weight_before.toFixed(2)} →{" "}
                            <span className="font-medium text-slate-900">
                              {order.weight_after.toFixed(2)}
                            </span>
                            g
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <MicroStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.microSetting.length > 10 && (
            <div className="border-t border-slate-100 px-5 py-2.5 text-center">
              <p className="text-xs text-slate-400">
                +{data.microSetting.length - 10} order lainnya
              </p>
            </div>
          )}
        </section>

        {/* Yield Material */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">
                Yield Material
              </h2>
            </div>
            <span className="text-xs text-slate-500">7 hari terakhir</span>
          </header>
          {filteredYield.length === 0 ? (
            <div className="p-10 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">{q ? "Tidak ditemukan" : "Belum ada data yield"}</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="mb-5 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Rata-rata Yield",
                    value: `${avgYield.toFixed(1)}%`,
                    accent:
                      avgYield >= 95
                        ? "emerald"
                        : avgYield >= 90
                          ? "amber"
                          : "rose",
                  },
                  {
                    label: "Total Target",
                    value: `${totalTarget.toFixed(1)}g`,
                    accent: "slate",
                  },
                  {
                    label: "Total Aktual",
                    value: `${totalActual.toFixed(1)}g`,
                    accent: "slate",
                  },
                ].map(({ label, value, accent }) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <p
                      className={`mt-0.5 text-base font-semibold ${
                        accent === "emerald"
                          ? "text-emerald-600"
                          : accent === "amber"
                            ? "text-amber-600"
                            : accent === "rose"
                              ? "text-rose-600"
                              : "text-slate-900"
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                {filteredYield.slice(0, 7).map((item, idx) => {
                  const pct =
                    item.actual && item.target && item.target > 0
                      ? (item.actual / item.target) * 100
                      : 0;
                  const color =
                    pct >= 95
                      ? "bg-emerald-500"
                      : pct >= 90
                        ? "bg-amber-500"
                        : "bg-rose-500";
                  const textColor =
                    pct >= 95
                      ? "text-emerald-600"
                      : pct >= 90
                        ? "text-amber-600"
                        : "text-rose-600";
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate font-mono text-xs text-slate-500">
                        {item.order_number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            {item.target?.toFixed(2) ?? "—"}g →{" "}
                            <span className="font-medium text-slate-900">
                              {item.actual?.toFixed(2) ?? "—"}g
                            </span>
                          </span>
                          <span className={`font-semibold ${textColor}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${color}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Operasional Tab ───────────────────────────────────────────────────────────

function OperasionalTab({ data, searchQuery }: { data: OperasionalData | null; searchQuery: string }) {
  if (!data) return <EmptyState text="Data operasional tidak tersedia" />;

  const q = searchQuery.toLowerCase().trim();

  const filteredKonfirmasi = !q
    ? data.afterSales.konfirmasi
    : data.afterSales.konfirmasi.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q),
      );

  const filteredPelunasan = !q
    ? data.afterSales.pelunasan
    : data.afterSales.pelunasan.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q),
      );

  const filteredDelivery = !q
    ? data.afterSales.delivery
    : data.afterSales.delivery.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q),
      );

  const filteredAdminTasks = !q
    ? data.adminTasks
    : data.adminTasks.filter(
        (t) =>
          t.order_number.toLowerCase().includes(q) ||
          t.stage.toLowerCase().includes(q) ||
          (t.executed_by ?? "").toLowerCase().includes(q),
      );

  return (
    <div className="space-y-5">
      {/* After Sales Kanban */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              After Sales & Konfirmasi Customer
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
          <KanbanCol
            icon={<Camera className="h-4 w-4 text-sky-600" />}
            title="Menunggu Konfirmasi"
            count={filteredKonfirmasi.length}
            accent="sky"
          >
            {filteredKonfirmasi.map((order) => {
              const sla = getSLA(order.hours_elapsed);
              return (
                <article
                  key={order.order_number}
                  className="rounded-md border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-slate-900">
                      {order.order_number}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${sla.cls}`}
                    >
                      {sla.label}
                    </span>
                  </div>
                  <p className="mb-2 truncate text-xs text-slate-600">
                    {order.customer_name ?? "—"}
                  </p>
                  <div className="space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                    {order.dp_amount != null && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" />
                        <span>DP {fmtCurrency(order.dp_amount)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Menunggu {order.hours_elapsed.toFixed(1)} jam</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </KanbanCol>

          <KanbanCol
            icon={<DollarSign className="h-4 w-4 text-amber-600" />}
            title="Menunggu Pelunasan"
            count={filteredPelunasan.length}
            accent="amber"
          >
            {filteredPelunasan.map((order) => (
              <article
                key={order.order_number}
                className="rounded-md border border-slate-200 bg-white p-3 transition hover:border-slate-300"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-slate-900">
                    {order.order_number}
                  </p>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                    {order.payment_status === "lunas" ? "Lunas" : "Menunggu"}
                  </span>
                </div>
                <p className="mb-2 truncate text-xs text-slate-600">
                  {order.customer_name ?? "—"}
                </p>
                <dl className="space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Total</dt>
                    <dd className="font-medium text-slate-900">
                      {fmtCurrency(order.total_price)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">DP</dt>
                    <dd className="text-slate-700">
                      {fmtCurrency(order.dp_paid)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1">
                    <dt className="text-slate-500">Sisa</dt>
                    <dd className="font-semibold text-rose-600">
                      {fmtCurrency(order.remaining_amount)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </KanbanCol>

          <KanbanCol
            icon={<Truck className="h-4 w-4 text-emerald-600" />}
            title="Menunggu Pickup / Kirim"
            count={filteredDelivery.length}
            accent="emerald"
          >
            {filteredDelivery.map((order) => (
              <article
                key={order.order_number}
                className="rounded-md border border-slate-200 bg-white p-3 transition hover:border-slate-300"
              >
                <p className="mb-0.5 font-mono text-xs font-semibold text-slate-900">
                  {order.order_number}
                </p>
                <p className="mb-2 truncate text-xs text-slate-600">
                  {order.customer_name ?? "—"}
                </p>
                <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3 w-3 text-slate-400" />
                    <span>
                      {DELIVERY_LABELS[order.delivery_method ?? ""] ??
                        order.delivery_method ??
                        "—"}
                    </span>
                  </div>
                  {order.tracking_number && (
                    <div className="rounded bg-slate-50 p-1.5 font-mono text-[10px]">
                      <span className="font-semibold">
                        {order.courier_name}:
                      </span>{" "}
                      {order.tracking_number}
                    </div>
                  )}
                  {order.shipped_at && (
                    <p className="text-[11px] text-slate-400">
                      Dikirim {fmtTime(order.shipped_at)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </KanbanCol>
        </div>
      </section>

      {/* Admin Tasks + Racik/Laser */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Admin Tasks */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">
                Packing, Pengiriman & Tugas Admin
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {filteredAdminTasks.length} tugas
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs">
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                    Tahap
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                    Order
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                    PIC
                  </th>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAdminTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-sm text-slate-400"
                    >
                      {q ? "Tidak ditemukan" : "Tidak ada tugas aktif"}
                    </td>
                  </tr>
                ) : (
                  filteredAdminTasks.slice(0, 10).map((task, idx) => (
                    <tr
                      key={`${task.order_id}-${idx}`}
                      className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${task.is_delayed ? "bg-rose-50/30" : ""}`}
                    >
                      <td className="px-5 py-2.5">
                        <span
                          className={`text-sm ${task.is_delayed ? "font-medium text-rose-700" : "text-slate-700"}`}
                        >
                          {STAGE_LABELS[task.stage] ?? task.stage}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                        {task.order_number}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        {task.executed_by ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {task.is_delayed ? (
                          <Badge
                            tone="rose"
                            icon={<AlertTriangle className="h-3 w-3" />}
                          >
                            Terlambat
                          </Badge>
                        ) : task.is_active ? (
                          <Badge
                            tone="emerald"
                            icon={<Loader2 className="h-3 w-3 animate-spin" />}
                          >
                            Aktif
                          </Badge>
                        ) : (
                          <Badge
                            tone="slate"
                            icon={<CheckCircle2 className="h-3 w-3" />}
                          >
                            Selesai
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredAdminTasks.length > 10 && (
            <div className="border-t border-slate-100 px-5 py-2.5 text-center text-xs text-slate-400">
              +{filteredAdminTasks.length - 10} tugas lainnya
            </div>
          )}
        </section>

        {/* Racik & Laser */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Racik Bahan & Laser Engraving
            </h2>
          </header>

          {/* Racik */}
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-medium text-slate-800">
                  Racik Bahan
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Rata Deviasi
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {data.racik.rataDeviasi.toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <MetricPill
                label="Berat Teoritis"
                value={`${data.racik.totalBeratTeoritis.toFixed(2)} g`}
              />
              <MetricPill
                label="Rata Buffer"
                value={`${data.racik.rataBuffer.toFixed(2)} g`}
              />
            </div>
            <div className="space-y-1.5">
              {data.racik.logs.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">
                  Belum ada aktivitas racik 7 hari terakhir
                </p>
              ) : (
                data.racik.logs.slice(0, 4).map((log, idx) => {
                  const dev =
                    log.target_weight && log.total_weight
                      ? (Math.abs(log.total_weight - log.target_weight) /
                          log.target_weight) *
                        100
                      : null;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono font-medium text-slate-900">
                          {log.order_number}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {log.staff_name} ·{" "}
                          {log.total_weight?.toFixed(2) ?? "—"}/
                          {log.target_weight?.toFixed(2) ?? "—"} g
                        </p>
                      </div>
                      {dev != null && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            dev > 5
                              ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
                              : dev > 2
                                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          }`}
                        >
                          {dev.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Laser */}
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-medium text-slate-800">
                  Laser Engraving
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Antrian
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {data.laser.antrianUkir}
                </p>
              </div>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <MetricPill
                label="Mesin Aktif"
                value={
                  data.laser.mesinAktif.length > 0
                    ? `${data.laser.mesinAktif.length} unit`
                    : "Idle"
                }
              />
              <MetricPill
                label="Rata Waktu"
                value={`${Math.round(data.laser.rataWaktuPengerjaan)}s`}
              />
            </div>
            {data.laser.mesinAktif.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {data.laser.mesinAktif.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
                    {m}
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              {data.laser.recentResults.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">
                  Belum ada hasil laser 7 hari terakhir
                </p>
              ) : (
                data.laser.recentResults.slice(0, 4).map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-medium text-slate-900">
                        {r.order_number}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {r.ring_identity_number ?? "—"}
                      </p>
                    </div>
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-inset ring-slate-200">
                      {r.font_style ?? "regular"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* QC Overview */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Quality Control Overview
          </h2>
          <span className="text-xs text-slate-500">7 hari terakhir</span>
        </header>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 sm:grid-cols-4">
          {(["qc_1", "qc_2"] as const).map((qcKey) => {
            const row = data.qc.summary.find((s) => s.qc_type === qcKey) ?? {
              total_checks: 0,
              passed: 0,
              failed: 0,
              pass_rate: 0,
            };
            const rate = Number(row.pass_rate ?? 0);
            const isLow = rate < 70 && row.total_checks > 0;
            return (
              <div
                key={qcKey}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    {QC_LABELS[qcKey]}
                  </span>
                  <span
                    className={`text-lg font-semibold ${isLow ? "text-rose-600" : row.total_checks === 0 ? "text-slate-300" : "text-emerald-600"}`}
                  >
                    {row.total_checks === 0 ? "—" : `${rate.toFixed(0)}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${isLow ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  {row.passed}/{row.total_checks} lulus
                  {row.failed > 0 && (
                    <span className="ml-1 text-rose-600">
                      · {row.failed} gagal
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
        <div className="p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Aktivitas QC Terbaru
          </p>
          <div className="max-h-60 space-y-0 overflow-y-auto">
            {data.qc.activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Belum ada aktivitas QC
              </p>
            ) : (
              data.qc.activity.slice(0, 12).map((a, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 border-b border-slate-50 py-2 last:border-0 text-sm"
                >
                  {a.result === "passed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  )}
                  <span className="w-24 shrink-0 text-xs text-slate-500">
                    {fmtTime(a.finished_at)}
                  </span>
                  <span className="w-28 shrink-0 font-mono text-xs text-slate-700">
                    {a.order_number}
                  </span>
                  <span className="w-32 shrink-0 truncate text-xs text-slate-500">
                    {a.executed_by ?? "—"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      a.stage === "qc_1"
                        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                        : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                    }`}
                  >
                    {QC_LABELS[a.stage] ?? a.stage}
                  </span>
                  {a.notes && (
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                      {a.notes}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Shared Sub-components ─────────────────────────────────────────────────────

function KpiChip({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "emerald" | "amber" | "rose" | "violet" | "sky" | "slate";
  sub: string;
}) {
  const aMap = {
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "ring-emerald-100",
      val: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      ring: "ring-amber-100",
      val: "text-amber-700",
    },
    rose: {
      bg: "bg-rose-50",
      text: "text-rose-600",
      ring: "ring-rose-100",
      val: "text-rose-700",
    },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-600",
      ring: "ring-violet-100",
      val: "text-violet-700",
    },
    sky: {
      bg: "bg-sky-50",
      text: "text-sky-600",
      ring: "ring-sky-100",
      val: "text-sky-700",
    },
    slate: {
      bg: "bg-slate-50",
      text: "text-slate-500",
      ring: "ring-slate-100",
      val: "text-slate-800",
    },
  };
  const a = aMap[accent];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset ${a.bg} ${a.ring}`}
        >
          <Icon className={`h-3.5 w-3.5 ${a.text}`} />
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          {sub}
        </span>
      </div>
      <p className={`text-base font-bold tabular-nums ${a.val}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function ExpertCard({ expert }: { expert: Expert }) {
  const cfg = ROLE_CONFIG[expert.roleName] ?? {
    name: expert.roleName,
    Icon: Wrench,
  };
  const { Icon } = cfg;
  const isActive = !!expert.activeOrder;
  const hasSusut = expert.rataSusut != null && expert.targetSusut != null;
  const isOverSusut = hasSusut && expert.rataSusut! > expert.targetSusut!;
  const mins = expert.activeOrder
    ? Math.floor(
        (Date.now() - new Date(expert.activeOrder.startedAt).getTime()) /
          60_000,
      )
    : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {cfg.name}
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-slate-900">
            {expert.fullName}
          </p>
        </div>
        {isActive ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Bekerja
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
            Idle
          </span>
        )}
      </div>
      {expert.activeOrder && (
        <div className="mb-3 rounded-md bg-emerald-50/50 p-2 ring-1 ring-inset ring-emerald-100">
          <p className="mb-0.5 text-[10px] uppercase tracking-wide text-emerald-600">
            Sedang dikerjakan
          </p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-emerald-900">
              {expert.activeOrder.orderNumber}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-700">
              <Clock className="h-3 w-3" />
              {mins}m
            </span>
          </div>
        </div>
      )}
      <dl className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Order hari ini</dt>
          <dd className="font-semibold text-slate-900">
            {expert.ordersHandled}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Total scan</dt>
          <dd className="text-slate-700">{expert.totalScans}</dd>
        </div>
        {hasSusut && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
            <dt className="flex items-center gap-1 text-slate-500">
              <Target className="h-3 w-3" />
              Susut
            </dt>
            <dd className="flex items-center gap-1">
              <span
                className={`text-xs font-semibold ${isOverSusut ? "text-rose-600" : "text-emerald-600"}`}
              >
                {expert.rataSusut!.toFixed(2)}%
              </span>
              <span className="text-[11px] text-slate-400">
                / {expert.targetSusut!.toFixed(1)}%
              </span>
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function BnRow({
  stage,
  onOrderClick,
}: {
  stage: StageBottleneck;
  onOrderClick: (orderId: string, orderNumber: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isProd = stage.stage_group === "production";
  const isSlow = stage.avg_hours && stage.avg_hours > 8;
  const isCritical = stage.avg_hours && stage.avg_hours > 24;
  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isCritical ? "bg-rose-50/40" : isSlow ? "bg-amber-50/30" : ""}`}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
            <span
              className={`h-2 w-2 rounded-full ${isProd ? "bg-amber-400" : "bg-blue-400"}`}
            />
            <span className="text-sm font-medium text-slate-800">
              {stage.stage_label}
            </span>
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {stage.order_count}
            {stage.waiting_orders > 0 && (
              <span className="text-rose-500">
                ({stage.waiting_orders} tunggu)
              </span>
            )}
          </span>
        </td>
        <td className="px-3 py-3 text-center">
          {stage.avg_hours ? (
            <span
              className={`text-xs font-semibold ${isCritical ? "text-rose-600" : isSlow ? "text-amber-600" : "text-slate-600"}`}
            >
              {fmtHours(stage.avg_hours)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-center">
          {stage.longest_hours ? (
            <span
              className={`text-xs font-semibold ${stage.longest_hours > 48 ? "text-rose-600" : stage.longest_hours > 24 ? "text-amber-600" : "text-slate-600"}`}
            >
              {fmtHours(stage.longest_hours)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="space-y-0.5">
            {stage.bottlenecks.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              stage.bottlenecks.slice(0, 2).map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOrderClick(item.order_id, item.order_number);
                  }}
                  className="flex items-center gap-1.5 text-xs hover:text-amber-600 transition-colors w-full text-left"
                >
                  <span className="font-mono text-slate-500 truncate">
                    {item.order_number}
                  </span>
                  <span
                    className={`ml-auto shrink-0 font-medium ${(item.hours_waiting || 0) > 48 ? "text-rose-600" : (item.hours_waiting || 0) > 24 ? "text-amber-600" : "text-slate-400"}`}
                  >
                    {item.hours_waiting ? `${item.hours_waiting}j` : "—"}
                  </span>
                </button>
              ))
            )}
          </div>
        </td>
        <td className="px-5 py-3 text-center">
          {isCritical ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
              <AlertTriangle className="h-3 w-3" />
              Kritis
            </span>
          ) : isSlow ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              <Clock className="h-3 w-3" />
              Lambat
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Normal
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={6} className="px-5 py-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">Order</th>
                    <th className="px-3 py-2 text-left font-medium">Customer</th>
                    <th className="px-3 py-2 text-center font-medium">Waktu</th>
                    <th className="px-3 py-2 text-left font-medium">Pekerja</th>
                    <th className="px-3 py-2 text-center font-medium">Deadline</th>
                    <th className="px-3 py-2 text-center font-medium">Approval</th>
                    <th className="px-3 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stage.orders.map((item) => (
                    <tr
                      key={item.order_id}
                      onClick={() => onOrderClick(item.order_id, item.order_number)}
                      className="border-b border-slate-100 hover:bg-white cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                        {item.order_number}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 font-medium">
                        {item.customer_name || "—"}
                      </td>
                      <td className={`px-3 py-2.5 text-center font-medium ${(item.hours_waiting || 0) > 48 ? "text-rose-600" : (item.hours_waiting || 0) > 24 ? "text-amber-600" : "text-slate-500"}`}>
                        {item.hours_waiting ? `${item.hours_waiting}j` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {item.last_worker || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.deadline ? (() => {
                          const dl = getStageDeadlineStatus(item.deadline, item.current_stage);
                          if (!dl) return <span className="text-slate-400">—</span>;
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${dl.isOverdue ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
                              {dl.isOverdue ? `⚠ ${Math.abs(dl.daysRemaining)}h` : `✔ H-${Math.max(dl.daysRemaining, 1)}`}
                            </span>
                          );
                        })() : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.approval_decision === "approved" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {item.approved_by || "Disetujui"}
                          </span>
                        ) : item.approval_decision === "rejected" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Ditolak
                          </span>
                        ) : item.status === "waiting_approval" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                            <Clock className="h-2.5 w-2.5" />
                            Menunggu
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.status === "rework" ? "bg-orange-100 text-orange-700" : item.status === "waiting_approval" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.status === "rework" ? "Rework" : item.status === "waiting_approval" ? "Approval" : "Proses"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>);
}

function MicroStatusBadge({
  status,
}: {
  status: "waiting" | "in_progress" | "completed";
}) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Selesai
      </span>
    );
  if (status === "in_progress")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
        <Loader2 className="h-3 w-3 animate-spin" />
        Proses
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      <Clock className="h-3 w-3" />
      Antri
    </span>
  );
}

function KanbanCol({
  icon,
  title,
  count,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent: "sky" | "amber" | "emerald";
  children: React.ReactNode;
}) {
  const accentMap = {
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  const items = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];
  return (
    <div className="rounded-lg bg-slate-50/60 p-3.5">
      <header className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          {title}
        </h3>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${accentMap[accent]}`}
        >
          {count}
        </span>
      </header>
      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {count === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white py-6 text-center">
            <p className="text-xs text-slate-400">Tidak ada order menunggu</p>
          </div>
        ) : (
          items
        )}
      </div>
    </div>
  );
}

function Badge({
  tone,
  icon,
  children,
}: {
  tone: "rose" | "emerald" | "slate";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const map = {
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${map[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-rose-100 p-3">
          <AlertTriangle className="h-6 w-6 text-rose-600" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-rose-900">
          Gagal memuat data
        </h3>
        <p className="mb-5 text-sm text-rose-700">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
