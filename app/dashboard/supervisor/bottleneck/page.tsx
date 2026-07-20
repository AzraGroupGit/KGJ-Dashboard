// app/dashboard/supervisor/bottleneck/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
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
import { getStageDeadlineStatus } from "@/lib/stage-deadlines";
import { getStageLabel } from "@/lib/stages";
import BottleneckHeatmap from "@/components/analytics/BottleneckHeatmap";
import OrderDetailPopup from "@/components/orders/OrderDetailPopup";
import type { StageBottleneck, BottleneckData } from "@/types/bottleneck";
import type { SupervisorGroup } from "@/types/roles";

// ── Constants ─────────────────────────────────────────────────────────────────

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

function getStatusInfo(avgHours: number | null): {
  label: string;
  className: string;
  Icon: React.ElementType;
} {
  if (avgHours === null) {
    return {
      label: "Normal",
      className: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
      Icon: CheckCircle2,
    };
  }
  if (avgHours > 24) {
    return {
      label: "Kritis",
      className: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
      Icon: AlertTriangle,
    };
  }
  if (avgHours > 8) {
    return {
      label: "Lambat",
      className: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
      Icon: Clock,
    };
  }
  return {
    label: "Normal",
    className: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
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
      bg: "bg-[#26211c]",
      icon: "text-white/50",
      ring: "ring-white/10",
    },
    rose: { bg: "bg-rose-500/10", icon: "text-rose-300", ring: "ring-rose-400/20" },
    amber: {
      bg: "bg-amber-500/10",
      icon: "text-amber-300",
      ring: "ring-amber-400/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      icon: "text-emerald-300",
      ring: "ring-emerald-400/20",
    },
  };
  const t = toneMap[tone];
  return (
    <div className="rounded-lg border border-gold/15 bg-cocoa p-3 sm:p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-white/50">
            {label}
          </p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold tabular-nums text-ivory">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[10px] sm:text-xs text-white/40">
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
  const isApproval = stage.stage_group === "approval" || stage.stage.startsWith("approval_");
  const displayItems = isApproval ? stage.orders : stage.bottlenecks;
  const hasData = displayItems.length > 0;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-white/5 transition-colors cursor-pointer ${
          status.label === "Kritis"
            ? "bg-rose-500/10/30 hover:bg-rose-500/100/10/50"
            : status.label === "Lambat"
              ? "bg-amber-500/10/20 hover:bg-amber-500/100/10/40"
              : "hover:bg-[#26211c]/60"
        }`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isProduction ? "bg-amber-400" : "bg-blue-400"}`}
            />
            <span className="text-sm font-medium text-cream">
              {getStageLabel(stage.stage)}
            </span>
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-cream">
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
                ? "text-rose-300"
                : status.label === "Lambat"
                  ? "text-amber-300"
                  : "text-white/70"
            }`}
          >
            {formatHours(stage.avg_hours)}
          </span>
        </td>
        <td className="px-3 py-3 text-center hidden sm:table-cell">
          <span
            className={`text-xs font-semibold ${
              (stage.longest_hours || 0) > 48
                ? "text-rose-300"
                : (stage.longest_hours || 0) > 24
                  ? "text-amber-300"
                  : "text-white/70"
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
          {hasData &&
            (isExpanded ? (
              <ChevronUp className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            ))}
        </td>
      </tr>
      {/* Expanded detail rows */}
      {isExpanded && hasData && (
        <tr className="bg-[#26211c]/50">
          <td colSpan={6} className="px-4 py-3">
            <div className="overflow-x-auto">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-2">
                Detail Order di Tahap Ini
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gold/15 text-[10px] uppercase tracking-wide text-white/40">
                    <th className="px-2 py-1.5 text-left font-semibold">Order</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Customer</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Waktu</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Deadline</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Pekerja</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Approval</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onOrderClick(item.order_id, item.order_number)}
                      className="border-b border-gold/10 cursor-pointer hover:bg-cocoa transition-colors"
                    >
                      <td className="px-2 py-2 font-mono text-white/70">
                        {item.order_number}
                      </td>
                      <td className="px-2 py-2 text-cream truncate max-w-[140px]">
                        {item.customer_name || item.product_name || "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`font-semibold ${
                          (item.hours_waiting || 0) > 48
                            ? "text-rose-300"
                            : (item.hours_waiting || 0) > 24
                              ? "text-amber-300"
                              : "text-white/50"
                        }`}>
                          {formatHours(item.hours_waiting)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {item.deadline ? (
                          <div>
                            <span className="text-white/70">
                              {new Date(item.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                            </span>
                            {(() => {
                              const s = getStageDeadlineStatus(item.tgl_order, item.deadline as string, stage.stage);
                              if (!s) return null;
                              return (
                                <p className={`text-[10px] ${s.isOverdue ? "text-rose-500 font-medium" : "text-emerald-500"}`}>
                                  {s.isOverdue ? `⚠ ${Math.abs(s.daysRemaining)}h` : `H-${Math.max(s.daysRemaining, 1)}`}
                                </p>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-white/70">
                        {item.last_worker || "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {item.approval_decision ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            item.approval_decision === "approved"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-rose-500/10 text-rose-300"
                          }`}>
                            {item.approval_decision === "approved" ? "Disetujui" : "Ditolak"}
                            {item.approved_by && ` (${item.approved_by})`}
                          </span>
                        ) : item.status === "waiting_approval" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                            Menunggu
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
      {isExpanded && !hasData && (
        <tr className="bg-[#26211c]/50">
          <td colSpan={6} className="px-4 py-3 text-center">
            <p className="text-xs text-white/40">
              Tidak ada order terlambat signifikan
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    rework: { label: "Rework", bg: "bg-rose-500/10", text: "text-rose-300" },
    waiting_approval: { label: "Menunggu", bg: "bg-amber-500/10", text: "text-amber-300" },
    proses: { label: "Proses", bg: "bg-sky-500/20", text: "text-sky-300" },
  };
  const s = map[status] || { label: status, bg: "bg-white/10", text: "text-white/70" };
  return (
    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupervisorBottleneckPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOrderNumber, setDetailOrderNumber] = useState<string>("");
  const [supervisorGroup, setSupervisorGroup] =
    useState<SupervisorGroup>("all");
  const [filterGroup, setFilterGroup] =
    useState<SupervisorGroup>("all");
  const [showHeatmap, setShowHeatmap] = useState(false);

  const { data: res, isLoading, error, refetch, dataUpdatedAt, isRefetching } = useQuery<{ data: BottleneckData }>({
    queryKey: ["bottleneck-monitoring"],
    queryFn: () => fetcher<{ data: BottleneckData }>("/api/bottleneck"),
    refetchInterval: 60_000,
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
      const isSupervisor = [
        "production_supervisor",
        "operational_supervisor",
        "supervisor",
      ].includes(u.role?.name);
      const canAccess =
        u.role?.role_group === "management" ||
        isSupervisor ||
        allowedStages.some((s: string) => s.startsWith("approval_"));
      if (!canAccess) {
        router.push("/workshop/login");
        return;
      }
      setUserEmail(u.username || u.full_name || "");
      if (u.role?.name === "production_supervisor") {
        setSupervisorGroup("production");
        setFilterGroup("production");
      } else if (u.role?.name === "operational_supervisor") {
        setSupervisorGroup("operational");
        setFilterGroup("operational");
      } else {
        setSupervisorGroup("all");
        setFilterGroup("all");
      }
    })();
  }, [router]);



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

  const filteredBn = data?.bottlenecks.filter((b) =>
    filterGroup === "all"
      ? true
      : filterGroup === "approval"
        ? b.stage_group === "approval" || b.stage.startsWith("approval_")
        : b.stage_group === filterGroup
  ) || [];

  const criticalCount =
    filteredBn.filter((b) => (b.avg_hours || 0) > 24).length || 0;
  const slowCount =
    filteredBn.filter(
      (b) => (b.avg_hours || 0) > 8 && (b.avg_hours || 0) <= 24,
    ).length || 0;
  const prodCount =
    filteredBn
      .filter((b) => b.stage_group === "production")
      .reduce((s, b) => s + b.order_count, 0) || 0;
  const opCount =
    filteredBn
      .filter((b) => b.stage_group === "operational")
      .reduce((s, b) => s + b.order_count, 0) || 0;
  const waitingCount =
    filteredBn.reduce((s, b) => s + (b.waiting_orders || 0), 0) || 0;

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
          {/* Page header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-ivory">
                  Bottleneck Monitoring
                </h2>
                {supervisorGroup === "production" && (
                  <span className="rounded-full bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Supervisor Produksi
                  </span>
                )}
                {supervisorGroup === "operational" && (
                  <span className="rounded-full bg-sky-500/20 border border-sky-400/20 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    Supervisor Operasional
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-white/50 mt-0.5">
                Identifikasi tahap dengan waktu tunggu terlama
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {lastUpdated && (
                <span className="text-[10px] sm:text-xs text-white/40 whitespace-nowrap">
                  {lastUpdated.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-1.5 rounded-md border border-gold/15 bg-cocoa px-2.5 sm:px-3 py-1.5 text-xs font-medium text-cream shadow-sm transition hover:bg-[#26211c] disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <BottleneckSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm font-medium text-cream">{error instanceof Error ? error.message : "Terjadi kesalahan"}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 rounded-md border border-gold/15 bg-cocoa px-4 py-2.5 text-sm text-cream hover:bg-[#26211c] min-h-[44px]"
              >
                Coba lagi
              </button>
            </div>
          ) : !data ? null : (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard
                  label="Total Order"
                  value={filteredBn.reduce((s, b) => s + b.order_count, 0)}
                  icon={Layers}
                  tone="slate"
                />
                <StatCard
                  label="Produksi"
                  value={prodCount}
                  icon={TrendingUp}
                  tone="amber"
                />
                <StatCard
                  label="Operasional"
                  value={opCount}
                  icon={TrendingUp}
                  tone="slate"
                />
                <StatCard
                  label="Menunggu"
                  value={waitingCount}
                  subtitle="Approval"
                  icon={Clock}
                  tone={waitingCount > 0 ? "amber" : "emerald"}
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
              {(() => {
                const slowest = filteredBn.reduce(
                  (a, b) => ((a.avg_hours ?? 0) > (b.avg_hours ?? 0) ? a : b),
                  filteredBn[0]
                );
                return slowest && (slowest.avg_hours || 0) > 8 ? (
                  <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Tahap dengan waktu tunggu terlama:{" "}
                        {getStageLabel(slowest.stage)}
                      </p>
                      <p className="text-xs text-amber-300 mt-0.5">
                        Rata-rata{" "}
                        {formatHours(slowest.avg_hours)} per
                        order — {slowest.order_count} order
                        menunggu
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Heatmap toggle */}
              <div className="rounded-lg border border-gold/15 bg-cocoa overflow-hidden">
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-ivory hover:bg-[#26211c] transition-colors"
                >
                  <span>Heatmap Kepadatan Order (90 hari)</span>
                  <ChevronDown
                    className={`h-4 w-4 text-white/40 transition-transform ${
                      showHeatmap ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showHeatmap && (
                  <div className="border-t border-gold/10 p-5">
                    <BottleneckHeatmap />
                  </div>
                )}
              </div>

              {/* Main table */}
              <div className="rounded-lg border border-gold/15 bg-cocoa overflow-hidden">
                <div className="border-b border-gold/10 px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ivory">
                      Detail Per Tahap
                    </h3>
                  </div>
                  {/* Tabbed layout for grouping */}
                  <div className="flex items-center gap-1 mt-3 border-b border-gold/15 overflow-x-auto -mx-5 px-5">
                    {([
                      { key: "all", label: "Semua Tahap" },
                      { key: "production", label: "Produksi" },
                      { key: "operational", label: "Operasional" },
                      { key: "approval", label: "Approval" },
                    ] as const).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setFilterGroup(tab.key as SupervisorGroup)}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                          filterGroup === tab.key
                            ? "border-slate-800 text-ivory"
                            : "border-transparent text-white/50 hover:text-cream"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          filterGroup === tab.key ? "bg-slate-800 text-white" : "bg-white/10 text-cream"
                        }`}>
                          {(() => {
                            if (tab.key === "all") return data?.bottlenecks.length ?? 0;
                            return data?.bottlenecks.filter((b) => b.stage_group === tab.key).length ?? 0;
                          })()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {filteredBn.length === 0 ? (
                  <div className="py-16 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
                    <p className="text-sm font-medium text-white/50">
                      Tidak ada bottleneck terdeteksi
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Semua order berjalan lancar
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gold/10 bg-[#26211c]/70">
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-white/50">
                            Tahap
                          </th>
                          <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/50">
                            Order
                          </th>
                          <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/50 hidden sm:table-cell">
                            Rata² Waktu
                          </th>
                          <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/50 hidden sm:table-cell">
                            Terlama
                          </th>
                          <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/50">
                            Status
                          </th>
                          <th className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/50 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredBn.map((stage) => (
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
            className="h-20 sm:h-24 animate-pulse rounded-lg border border-gold/15 bg-cocoa"
          />
        ))}
      </div>
      <div className="h-64 sm:h-96 animate-pulse rounded-lg border border-gold/15 bg-cocoa" />
    </div>
  );
}
