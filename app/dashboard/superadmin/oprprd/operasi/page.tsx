// app/dashboard/superadmin/oprprd/operasional/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck2,
  FlaskConical,
  Loader2,
  RefreshCw,
  ScanLine,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";

// ============================================================
// Types — selaras dengan response API v7 (Supabase)
// ============================================================

interface KonfirmasiOrder {
  order_number: string;
  customer_name: string | null;
  wa_contact: string | null;
  dp_requested_at: string | null;
  dp_received_at: string | null;
  dp_amount: number | null;
  customer_decision: string | null;
  confirmation_started_at: string | null;
  confirmation_finished_at: string | null;
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
  pelunasan_finished_at: string | null;
}

interface DeliveryOrder {
  order_number: string;
  customer_name: string | null;
  delivery_method: string | null;
  shipped_at: string | null;
  customer_notified_at: string | null;
  picked_up_by_customer_at: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  completed_at: string | null;
  delivery_finished_at: string | null;
}

interface AdminTask {
  order_id: string;
  order_number: string;
  stage: string;
  executed_by: string | null;
  executed_by_role: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  is_delayed: boolean;
  started_at: string;
}

interface RacikLog {
  order_number: string;
  staff_name: string | null;
  target_weight: number | null;
  total_weight: number | null;
  shrinkage_buffer: number | null;
  timestamp: string;
}

interface LaserResult {
  order_number: string;
  engraved_text: string | null;
  ring_identity_number: string | null;
  font_style: string | null;
  laser_machine_id: string | null;
  completed_at: string | null;
}

interface QCSummaryRow {
  qc_date: string;
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
  issues_found: unknown;
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
    targetShrinkagePercent: number;
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

// ============================================================

export const dynamic = "force-dynamic";

// Labels
const STAGE_LABELS: Record<string, string> = {
  pelunasan: "Customer Care",
  kelengkapan: "Kelengkapan",
  packing: "Packing",
  pengiriman: "Pengiriman",
};

const QC_LABELS: Record<string, string> = {
  qc_awal: "QC Awal",
  qc_1: "QC 1",
  qc_2: "QC 2",
  qc_3: "QC 3",
};

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  pickup_store: "Pickup di Toko",
  courier_local: "Kurir Lokal",
  courier_intercity: "Kurir Antar Kota",
  in_house_delivery: "Antar Langsung",
  other: "Lainnya",
};

// Formatters
function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function getSLAStatus(hours: number): {
  label: string;
  className: string;
} {
  if (hours > 48) {
    return {
      label: "Terlambat",
      className: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    };
  }
  if (hours > 24) {
    return {
      label: "Perhatian",
      className: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    };
  }
  return {
    label: "On Track",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  };
}

// ============================================================
// Page
// ============================================================

export default function OperasionalPage() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [data, setData] = useState<OperasionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
      const res = await fetch("/api/operational");
      if (!res.ok) {
        if (res.status === 401) throw new Error("Sesi Anda telah habis");
        throw new Error("Gagal mengambil data operasional");
      }
      const json = await res.json();
      setData(json.data ?? json);
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

  if (!data && !loading && !error) {
    return null;
  }

  const totalKonfirmasi = data?.afterSales.konfirmasi.length ?? 0;
  const totalPelunasan = data?.afterSales.pelunasan.length ?? 0;
  const totalDelivery = data?.afterSales.delivery.length ?? 0;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* ========== Page Header ========== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                Monitoring Operasional
              </h2>
              <p className="text-sm text-slate-400 font-mono mt-1">
                Pantau alur order dari konfirmasi hingga pengiriman
              </p>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {lastUpdated && (
                <span className="text-xs text-slate-400">
                  Diperbarui {lastUpdated.toLocaleTimeString("id-ID")}
                </span>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* ========== Content ========== */}
          {loading ? (
            <Loading variant="skeleton" text="Memuat data operasional..." />
          ) : error ? (
            <OperasionalError error={error} onRetry={() => fetchData(true)} />
          ) : !data ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">Tidak ada data tersedia</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ========== SECTION 1: AFTER SALES KANBAN ========== */}
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">
                      After Sales & Konfirmasi Customer
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Live
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Auto-refresh 30 detik
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
                  {/* Kolom 1: Konfirmasi */}
                  <KanbanColumn
                    icon={<Camera className="h-4 w-4 text-sky-600" />}
                    title="Menunggu Konfirmasi"
                    count={totalKonfirmasi}
                    accent="sky"
                    empty="Tidak ada order menunggu"
                  >
                    {data.afterSales.konfirmasi.map((order) => {
                      const sla = getSLAStatus(order.hours_elapsed);
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
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sla.className}`}
                            >
                              {sla.label}
                            </span>
                          </div>
                          <p className="mb-2 truncate text-xs text-slate-600">
                            {order.customer_name ?? "—"}
                          </p>
                          <div className="space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                            {order.dp_requested_at && (
                              <div className="flex items-center gap-1.5">
                                <Camera className="h-3 w-3" />
                                <span>
                                  Foto dikirim{" "}
                                  {formatRelativeTime(order.dp_requested_at)}
                                </span>
                              </div>
                            )}
                            {order.dp_amount != null && (
                              <div className="flex items-center gap-1.5">
                                <Wallet className="h-3 w-3" />
                                <span>
                                  DP {formatCurrency(order.dp_amount)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              <span>
                                Menunggu {order.hours_elapsed.toFixed(1)} jam
                              </span>
                            </div>
                          </div>
                          {sla.label === "Terlambat" && (
                            <button className="mt-2.5 w-full rounded-md bg-rose-50 py-1.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100">
                              Follow Up Customer
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </KanbanColumn>

                  {/* Kolom 2: Pelunasan */}
                  <KanbanColumn
                    icon={<DollarSign className="h-4 w-4 text-amber-600" />}
                    title="Menunggu Pelunasan"
                    count={totalPelunasan}
                    accent="amber"
                    empty="Tidak ada order menunggu"
                  >
                    {data.afterSales.pelunasan.map((order) => (
                      <article
                        key={order.order_number}
                        className="rounded-md border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <p className="font-mono text-xs font-semibold text-slate-900">
                            {order.order_number}
                          </p>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                            {order.payment_status === "lunas"
                              ? "Lunas"
                              : "Menunggu"}
                          </span>
                        </div>
                        <p className="mb-2 truncate text-xs text-slate-600">
                          {order.customer_name ?? "—"}
                        </p>
                        <dl className="space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Total</dt>
                            <dd className="font-medium text-slate-900">
                              {formatCurrency(order.total_price)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-500">DP</dt>
                            <dd className="text-slate-700">
                              {formatCurrency(order.dp_paid)}
                            </dd>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 pt-1">
                            <dt className="text-slate-500">Sisa</dt>
                            <dd className="font-semibold text-rose-600">
                              {formatCurrency(order.remaining_amount)}
                            </dd>
                          </div>
                        </dl>
                        {order.final_payment_method && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            Metode: {order.final_payment_method}
                          </p>
                        )}
                      </article>
                    ))}
                  </KanbanColumn>

                  {/* Kolom 3: Delivery */}
                  <KanbanColumn
                    icon={<Truck className="h-4 w-4 text-emerald-600" />}
                    title="Menunggu Pickup"
                    count={totalDelivery}
                    accent="emerald"
                    empty="Tidak ada order menunggu"
                  >
                    {data.afterSales.delivery.map((order) => (
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
                              {DELIVERY_METHOD_LABELS[
                                order.delivery_method ?? ""
                              ] ?? order.delivery_method}
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
                              Dikirim {formatRelativeTime(order.shipped_at)}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </KanbanColumn>
                </div>
              </section>

              {/* ========== SECTION 2: ADMIN TASKS & RACIK-LASER ========== */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Admin Tasks */}
                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-slate-400" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        Kelengkapan, Packing & Pengiriman
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500">
                      {data.adminTasks.length} tugas
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
                          <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                            Durasi
                          </th>
                          <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.adminTasks.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-10 text-center text-sm text-slate-400"
                            >
                              Tidak ada tugas aktif
                            </td>
                          </tr>
                        ) : (
                          data.adminTasks.slice(0, 10).map((task, idx) => (
                            <tr
                              key={`${task.order_id}-${idx}`}
                              className={`border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 ${
                                task.is_delayed ? "bg-rose-50/40" : ""
                              }`}
                            >
                              <td className="px-5 py-2.5">
                                <span
                                  className={`text-sm ${
                                    task.is_delayed
                                      ? "font-medium text-rose-700"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {STAGE_LABELS[task.stage] ?? task.stage}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                                {task.order_number}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-slate-600">
                                {task.executed_by ?? (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-slate-600">
                                {task.duration_minutes != null
                                  ? `${Math.round(task.duration_minutes)} mnt`
                                  : "-"}
                              </td>
                              <td className="px-5 py-2.5">
                                {task.is_delayed ? (
                                  <StatusBadge
                                    tone="rose"
                                    icon={<AlertTriangle className="h-3 w-3" />}
                                  >
                                    Terlambat
                                  </StatusBadge>
                                ) : task.is_active ? (
                                  <StatusBadge
                                    tone="emerald"
                                    icon={
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    }
                                  >
                                    Aktif
                                  </StatusBadge>
                                ) : (
                                  <StatusBadge
                                    tone="slate"
                                    icon={<CheckCircle2 className="h-3 w-3" />}
                                  >
                                    Selesai
                                  </StatusBadge>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {data.adminTasks.length > 10 && (
                    <div className="border-t border-slate-100 px-5 py-2.5 text-center">
                      <p className="text-xs text-slate-400">
                        +{data.adminTasks.length - 10} tugas lainnya
                      </p>
                    </div>
                  )}
                </section>

                {/* Racik & Laser */}
                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="border-b border-slate-100 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Produksi: Racik & Laser Engraving
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
                          const deviasi =
                            log.target_weight && log.total_weight
                              ? (Math.abs(
                                  log.total_weight - log.target_weight,
                                ) /
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
                                  {log.total_weight?.toFixed(2) ?? "-"}/
                                  {log.target_weight?.toFixed(2) ?? "-"} g
                                </p>
                              </div>
                              {deviasi != null && (
                                <span
                                  className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    deviasi > 5
                                      ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
                                      : deviasi > 2
                                        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                        : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                                  }`}
                                >
                                  {deviasi.toFixed(2)}%
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
                        data.laser.recentResults
                          .slice(0, 4)
                          .map((result, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-mono font-medium text-slate-900">
                                  {result.order_number}
                                </p>
                                <p className="truncate text-[11px] text-slate-500">
                                  {result.ring_identity_number ?? "—"}
                                </p>
                              </div>
                              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-inset ring-slate-200">
                                {result.font_style ?? "regular"}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* ========== SECTION 3: QC OVERVIEW ========== */}
              <section className="rounded-lg border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Quality Control Overview
                  </h2>
                  <span className="text-xs text-slate-500">
                    7 hari terakhir
                  </span>
                </header>

                <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 lg:grid-cols-4">
                  {(["qc_awal", "qc_1", "qc_2", "qc_3"] as const).map(
                    (qcType) => {
                      const latest = data.qc.summary.find(
                        (s) => s.qc_type === qcType,
                      ) ?? {
                        total_checks: 0,
                        passed: 0,
                        failed: 0,
                        pass_rate: 0,
                      };
                      const passRate = Number(latest.pass_rate ?? 0);
                      const isLow = passRate < 70 && latest.total_checks > 0;

                      return (
                        <div
                          key={qcType}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700">
                              {QC_LABELS[qcType]}
                            </span>
                            <span
                              className={`text-lg font-semibold ${
                                isLow
                                  ? "text-rose-600"
                                  : latest.total_checks === 0
                                    ? "text-slate-300"
                                    : "text-emerald-600"
                              }`}
                            >
                              {latest.total_checks === 0
                                ? "—"
                                : `${passRate.toFixed(0)}%`}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isLow ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${passRate}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-slate-500">
                            {latest.passed}/{latest.total_checks} lulus
                            {latest.failed > 0 && (
                              <span className="ml-1 text-rose-600">
                                · {latest.failed} gagal
                              </span>
                            )}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <FileCheck2 className="h-3.5 w-3.5 text-slate-400" />
                    <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Aktivitas QC Terbaru
                    </h3>
                  </div>

                  <div className="max-h-64 space-y-0 overflow-y-auto">
                    {data.qc.activity.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">
                        Belum ada aktivitas QC
                      </p>
                    ) : (
                      data.qc.activity.slice(0, 12).map((activity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 border-b border-slate-50 py-2 text-sm last:border-0"
                        >
                          {activity.result === "passed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                          )}
                          <span className="w-24 shrink-0 text-xs text-slate-500">
                            {formatRelativeTime(activity.finished_at)}
                          </span>
                          <span className="w-28 shrink-0 font-mono text-xs text-slate-700">
                            {activity.order_number}
                          </span>
                          <span className="w-32 shrink-0 truncate text-xs text-slate-500">
                            {activity.executed_by ?? "—"}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              activity.stage === "qc_awal"
                                ? "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
                                : activity.stage === "qc_1"
                                  ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                  : activity.stage === "qc_2"
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                                    : "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200"
                            }`}
                          >
                            {QC_LABELS[activity.stage] ?? activity.stage}
                          </span>
                          {activity.notes && (
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                              {activity.notes}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponents (tidak berubah)
// ============================================================

function KanbanColumn({
  icon,
  title,
  count,
  accent,
  children,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent: "sky" | "amber" | "emerald";
  children: React.ReactNode;
  empty: string;
}) {
  const accentMap = {
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  const items = Array.isArray(children) ? children : [children];
  const hasContent = count > 0;

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
        {!hasContent ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white py-6 text-center">
            <p className="text-xs text-slate-400">{empty}</p>
          </div>
        ) : (
          items
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  tone,
  icon,
  children,
}: {
  tone: "rose" | "emerald" | "slate";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneMap = {
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${toneMap[tone]}`}
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

function OperasionalError({
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
          Gagal memuat data operasional
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
