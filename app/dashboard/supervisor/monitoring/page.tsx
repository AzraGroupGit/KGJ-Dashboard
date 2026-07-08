// app/dashboard/supervisor/monitoring/page.tsx

"use client";

import { useState, useEffect, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/layout/MobileSidebar";
import Header from "@/components/layout/MobileHeader";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Activity,
  Hammer,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getStageDeadlineStatus } from "@/lib/stage-deadlines";
import OrderDetailPopup from "@/components/orders/OrderDetailPopup";
import type { SupervisorGroup } from "@/types/roles";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  current_stage: string;
  stage_label: string;
  stage_group: "production" | "operational" | "other";
  deadline: string | null;
  tgl_order: string | null;
  last_worker: string | null;
  last_submission_at: string | null;
  hours_at_stage: number | null;
  last_stage: string | null;
  status: string;
  created_at: string;
  completed_at?: string;
  process_time_ms?: number;
}

interface MonitoringStats {
  totalActive: number;
  productionCount: number;
  operationalCount: number;
  submissionsToday: number;
  ordersCreatedToday: number;
  ordersCompletedToday: number;
  pendingApprovals: number;
}

interface MonitoringData {
  stats: MonitoringStats;
  orders: OrderRow[];
  completedOrders?: OrderRow[];
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
      bg: "bg-[#26211c]",
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupervisorMonitoringPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOrderNumber, setDetailOrderNumber] = useState<string>("");
  const [supervisorGroup, setSupervisorGroup] =
    useState<SupervisorGroup>("all");

  const { data: res, isLoading, error, refetch, dataUpdatedAt, isRefetching } = useQuery<{ data: MonitoringData }>({
    queryKey: ["supervisor-monitoring"],
    queryFn: () => fetcher<{ data: MonitoringData }>("/api/supervisor"),
    refetchInterval: 30_000,
  });
  const data = res?.data ?? null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

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
    if (filter !== "completed" && !(availableKeys as string[]).includes(filter)) {
      startTransition(() => {
        setFilter("all");
      });
    }
  }, [filter, availableKeys]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#26211c]">
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
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-[#26211c] disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <MonitoringSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm font-medium text-slate-700">{error instanceof Error ? error.message : "Terjadi kesalahan"}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-[#26211c] min-h-[44px]"
              >
                Coba lagi
              </button>
            </div>
          ) : !data ? null : (
            <div className="space-y-4 sm:space-y-6">
              {/* Hari Ini */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Hari Ini
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <StatCard
                    label="Masuk"
                    value={data.stats.ordersCreatedToday}
                    icon={Activity}
                    tone="blue"
                  />
                  <StatCard
                    label="Keluar"
                    value={data.stats.ordersCompletedToday}
                    icon={CheckCircle2}
                    tone="emerald"
                  />
                  <StatCard
                    label="Dalam Proses"
                    value={data.stats.totalActive}
                    icon={Clock}
                    tone="amber"
                  />
                </div>
              </div>

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
                                : "bg-[#26211c] text-slate-400"
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
                      const completedDate = isCompleted ? order.completed_at : null;
                      const processMs = order.process_time_ms ?? null;
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
                            className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 sm:p-4 active:bg-[#26211c] transition-colors hover:border-slate-300"
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
                          className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 sm:p-4 active:bg-[#26211c] transition-colors hover:border-slate-300"
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
                              {order.deadline && (() => {
                                const s = getStageDeadlineStatus(order.tgl_order, order.deadline as string, order.current_stage);
                                if (!s) return null;
                                return (
                                  <span className={`text-[10px] ${s.isOverdue ? "text-rose-500 font-medium" : "text-emerald-500"}`}>
                                    {s.isOverdue ? `⚠ ${Math.abs(s.daysRemaining)}h` : `H-${Math.max(s.daysRemaining, 1)}`}
                                  </span>
                                );
                              })()}
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
                          <tr className="border-b border-slate-100 bg-[#26211c]/70">
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
                            const completedDate = isCompleted ? order.completed_at : null;
                            const processMs = order.process_time_ms ?? null;
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
                                  className="hover:bg-[#26211c]/60 transition-colors cursor-pointer"
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
                                className="hover:bg-[#26211c]/60 transition-colors cursor-pointer"
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
                                  {order.deadline && (() => {
                                    const s = getStageDeadlineStatus(order.tgl_order, order.deadline as string, order.current_stage);
                                    if (!s) return null;
                                    return (
                                      <p className={`text-[11px] mt-0.5 ${s.isOverdue ? "text-rose-500 font-medium" : "text-emerald-500"}`}>
                                        {s.isOverdue ? `⚠ Terlambat ${Math.abs(s.daysRemaining)} hari` : `Target: H-${Math.max(s.daysRemaining, 1)}`}
                                      </p>
                                    );
                                  })()}
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
