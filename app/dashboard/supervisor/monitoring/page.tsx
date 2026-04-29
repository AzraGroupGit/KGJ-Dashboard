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
  product_name: string;
  current_stage: string;
  stage_label: string;
  stage_group: "production" | "operational" | "other";
  deadline: string | null;
  customer_name: string | null;
  last_worker: string | null;
  last_submission_at: string | null;
  hours_at_stage: number | null;
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
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  production: "bg-amber-100 text-amber-800 border-amber-200",
  operational: "bg-blue-100 text-blue-800 border-blue-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
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
    <div className={`rounded-lg border border-slate-200 bg-white p-3 sm:p-5${className ? ` ${className}` : ""}`}>
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

type FilterTab = "all" | "production" | "operational" | "pending";

// ── Page ──────────────────────────────────────────────────────────────────────

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

  // Load user identity
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (!res.ok) {
        router.push("/workshop/login");
        return;
      }
      const json = await res.json();
      const u = json.data;
      if (u.role.name !== "superadmin" && u.role.role_group !== "management") {
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

  const filteredOrders = (data?.orders || []).filter((o) => {
    if (filter === "all") return true;
    if (filter === "production") return o.stage_group === "production";
    if (filter === "operational") return o.stage_group === "operational";
    if (filter === "pending") return !o.last_worker; // no submission yet at current stage
    return true;
  });

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "Semua", count: data?.orders.length },
    {
      key: "production",
      label: "Produksi",
      count: data?.stats.productionCount,
    },
    {
      key: "operational",
      label: "Operasional",
      count: data?.stats.operationalCount,
    },
    {
      key: "pending",
      label: "Perlu Tindakan",
      count: data?.orders.filter((o) => !o.last_worker).length,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        role="supervisor"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
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
                Monitoring Workshop
              </h2>
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
              {/* Stats row */}
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

              {/* Filter tabs - Horizontal scroll di mobile */}
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

              {/* Orders list */}
              {filteredOrders.length === 0 ? (
                <div className="py-12 sm:py-16 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">
                    Tidak ada order aktif di kategori ini
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile cards (< md) */}
                  <div className="block md:hidden space-y-2 sm:space-y-3">
                    {filteredOrders.map((order) => {
                      const dl = formatDeadline(order.deadline);
                      const hoursLabel =
                        order.hours_at_stage !== null
                          ? order.hours_at_stage >= 24
                            ? `${Math.floor(order.hours_at_stage / 24)}h ${order.hours_at_stage % 24}j`
                            : `${order.hours_at_stage}j`
                          : "—";
                      const isStuck =
                        order.hours_at_stage !== null &&
                        order.hours_at_stage > 24;
                      return (
                        <div
                          key={order.id}
                          className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4 active:bg-slate-50 transition-colors"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800">
                                {order.order_number}
                              </span>
                              {order.customer_name && (
                                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                                  {order.customer_name}
                                </p>
                              )}
                            </div>
                            <span
                              className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium ${
                                STAGE_COLORS[order.stage_group]
                              }`}
                            >
                              {order.stage_label}
                            </span>
                          </div>

                          {/* Product */}
                          <p className="text-sm text-slate-700 mb-2.5">
                            {order.product_name}
                          </p>

                          {/* Info Row */}
                          <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                            <span className="text-slate-500 truncate max-w-[60%]">
                              {order.last_worker
                                ? `${order.last_worker} · ${formatRelative(order.last_submission_at)}`
                                : "Belum ada submission"}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* Stuck indicator */}
                              {isStuck && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-medium text-rose-600">
                                  <Clock className="h-3 w-3" />
                                  {hoursLabel}
                                </span>
                              )}
                              {/* Deadline */}
                              <span
                                className={`${
                                  dl.urgent
                                    ? "font-semibold text-rose-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {dl.urgent && (
                                  <AlertTriangle className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                )}
                                {dl.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table (>= md) */}
                  <div className="hidden md:block rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Order
                            </th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Produk
                            </th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Tahap
                            </th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Tukang / Petugas
                            </th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">
                              Lama di Tahap
                            </th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">
                              Deadline
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredOrders.map((order) => {
                            const dl = formatDeadline(order.deadline);
                            const hoursLabel =
                              order.hours_at_stage !== null
                                ? order.hours_at_stage >= 24
                                  ? `${Math.floor(order.hours_at_stage / 24)}h ${order.hours_at_stage % 24}j`
                                  : `${order.hours_at_stage}j`
                                : "—";
                            const isStuck =
                              order.hours_at_stage !== null &&
                              order.hours_at_stage > 24;

                            return (
                              <tr
                                key={order.id}
                                className="hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <span className="font-mono text-xs font-semibold text-slate-800">
                                    {order.order_number}
                                  </span>
                                  {order.customer_name && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {order.customer_name}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-slate-700">
                                    {order.product_name}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                      STAGE_COLORS[order.stage_group]
                                    }`}
                                  >
                                    {order.stage_label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {order.last_worker ? (
                                    <div>
                                      <span className="text-slate-700">
                                        {order.last_worker}
                                      </span>
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        {formatRelative(
                                          order.last_submission_at,
                                        )}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-xs">
                                      Belum ada submission
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                  <span
                                    className={`text-sm font-medium ${
                                      isStuck
                                        ? "text-rose-600"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {isStuck && (
                                      <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                                    )}
                                    {hoursLabel}
                                  </span>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                  <span
                                    className={`text-sm ${
                                      dl.urgent
                                        ? "font-semibold text-rose-600"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {dl.urgent && (
                                      <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                                    )}
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
