// app/dashboard/superadmin/oprprd/analisis/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ExpertPerformance {
  userId: string;
  fullName: string;
  roleName: string;
  totalScans: number;
  totalOrders: number;
  stagesCompleted: number;
  avgSusut: number | null;
}

interface StageEfficiency {
  stage: string;
  totalCompleted: number;
  avgDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
}

interface QCMetric {
  stage: string;
  totalChecks: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface OrderFlowPoint {
  date: string;
  completed: number;
}

interface AnalystData {
  period: { from: string; to: string };
  summary: {
    totalOrdersCompleted: number;
    totalStagesCompleted: number;
    overallQCPassRate: number;
    activeProductionStaff: number;
    totalProductionStaff: number;
  };
  expertPerformance: ExpertPerformance[];
  stageEfficiency: StageEfficiency[];
  qcMetrics: QCMetric[];
  orderFlow: OrderFlowPoint[];
}

// ── Constants ────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  laser: "Laser",
  finishing: "Finishing",
  qc_awal: "QC Awal",
  qc_1: "QC 1",
  qc_2: "QC 2",
  qc_3: "QC 3",
  pelunasan: "Pelunasan",
  kelengkapan: "Kelengkapan",
  packing: "Packing",
  pengiriman: "Pengiriman",
};

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  jewelry_expert_lebur_bahan: { label: "Lebur", color: "bg-orange-100 text-orange-700" },
  jewelry_expert_pembentukan_awal: { label: "Bentuk", color: "bg-amber-100 text-amber-700" },
  jewelry_expert_finishing: { label: "Finishing", color: "bg-emerald-100 text-emerald-700" },
  micro_setting: { label: "Micro Setting", color: "bg-violet-100 text-violet-700" },
};

const QC_LABELS: Record<string, string> = {
  qc_awal: "QC Awal",
  qc_1: "QC 1",
  qc_2: "QC 2",
  qc_3: "QC 3",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDuration(mins: number | null): string {
  if (mins == null) return "-";
  if (mins < 60) return `${mins.toFixed(0)} mnt`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}j ${m}m` : `${h} jam`;
}

function getRoleConfig(name: string) {
  return (
    ROLE_CONFIG[name] ?? { label: name, color: "bg-slate-100 text-slate-600" }
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [data, setData] = useState<AnalystData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>(currentPeriod());

  useEffect(() => {
    const cu = getClientUser();
    if (!cu) {
      router.push("/login");
      return;
    }
    setClientUser(cu);
  }, [router]);

  const fetchData = useCallback(async (p: string, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await fetch(`/api/analyst-oprprd?period=${p}`);
      if (!res.ok) throw new Error("Gagal mengambil data analisis");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [fetchData, period]);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM
    setPeriod(val);
  };

  const peakDay = data?.orderFlow.reduce(
    (best, d) => (d.completed > best.completed ? d : best),
    { date: "-", completed: 0 },
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/dashboard/superadmin/oprprd"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> OPR-PRD
                </Link>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                Analisis Performa
              </h2>
              <p className="text-sm text-slate-400 font-mono mt-1">
                Efisiensi produksi, kualitas, dan performa tim
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="month"
                value={period}
                onChange={handlePeriodChange}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button
                onClick={() => fetchData(period, true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <Loading variant="skeleton" text="Memuat data analisis..." />
          ) : error ? (
            <ErrorState error={error} onRetry={() => fetchData(period, true)} />
          ) : !data ? null : (
            <div className="space-y-6">
              {/* ── Summary KPI ── */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KPICard
                  label="Order Selesai"
                  value={data.summary.totalOrdersCompleted}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tone="emerald"
                />
                <KPICard
                  label="Tahap Dikerjakan"
                  value={data.summary.totalStagesCompleted}
                  icon={<BarChart3 className="h-4 w-4" />}
                  tone="sky"
                />
                <KPICard
                  label="QC Pass Rate"
                  value={`${data.summary.overallQCPassRate}%`}
                  icon={<Target className="h-4 w-4" />}
                  tone={
                    data.summary.overallQCPassRate >= 90
                      ? "emerald"
                      : data.summary.overallQCPassRate >= 70
                        ? "amber"
                        : "rose"
                  }
                />
                <KPICard
                  label="Staff Aktif"
                  value={`${data.summary.activeProductionStaff}/${data.summary.totalProductionStaff}`}
                  icon={<Users className="h-4 w-4" />}
                  tone="slate"
                />
              </div>

              {/* ── Order Flow bar chart ── */}
              {data.orderFlow.length > 0 && (
                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Tren Order Selesai
                    </h2>
                    {peakDay && peakDay.completed > 0 && (
                      <span className="text-xs text-slate-500">
                        Puncak:{" "}
                        <span className="font-medium text-slate-700">
                          {new Date(peakDay.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          ({peakDay.completed} order)
                        </span>
                      </span>
                    )}
                  </header>
                  <div className="px-5 py-4">
                    <OrderFlowChart data={data.orderFlow} />
                  </div>
                </section>
              )}

              {/* ── Expert Performance ── */}
              <section className="rounded-lg border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Performa Jewelry Expert
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    {data.expertPerformance.length} staff
                  </span>
                </header>

                {data.expertPerformance.length === 0 ? (
                  <EmptyState label="Belum ada data aktivitas staff" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs">
                          <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                            Nama
                          </th>
                          <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                            Role
                          </th>
                          <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                            Scan
                          </th>
                          <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                            Order
                          </th>
                          <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                            Tahap Selesai
                          </th>
                          <th className="px-5 py-2.5 text-right font-medium text-slate-500">
                            Rata Susut
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expertPerformance.map((expert) => {
                          const rc = getRoleConfig(expert.roleName);
                          const susutOk =
                            expert.avgSusut != null && expert.avgSusut <= 5;
                          return (
                            <tr
                              key={expert.userId}
                              className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-5 py-2.5 text-sm font-medium text-slate-900">
                                {expert.fullName}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${rc.color}`}
                                >
                                  {rc.label}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right text-xs text-slate-700">
                                {expert.totalScans.toLocaleString("id-ID")}
                              </td>
                              <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-900">
                                {expert.totalOrders.toLocaleString("id-ID")}
                              </td>
                              <td className="px-3 py-2.5 text-right text-xs text-slate-700">
                                {expert.stagesCompleted.toLocaleString("id-ID")}
                              </td>
                              <td className="px-5 py-2.5 text-right">
                                {expert.avgSusut != null ? (
                                  <span
                                    className={`text-xs font-semibold ${
                                      susutOk
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                    }`}
                                  >
                                    {expert.avgSusut.toFixed(2)}%
                                    {susutOk ? (
                                      <TrendingDown className="inline ml-1 h-3 w-3" />
                                    ) : (
                                      <TrendingUp className="inline ml-1 h-3 w-3" />
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* ── Stage Efficiency + QC ── */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Stage Efficiency */}
                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Efisiensi Tahap Produksi
                    </h2>
                  </header>

                  {data.stageEfficiency.length === 0 ? (
                    <EmptyState label="Belum ada data durasi tahap" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs">
                            <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                              Tahap
                            </th>
                            <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                              Selesai
                            </th>
                            <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                              Rata-rata
                            </th>
                            <th className="px-5 py-2.5 text-right font-medium text-slate-500">
                              Min / Maks
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.stageEfficiency.slice(0, 12).map((s) => (
                            <tr
                              key={s.stage}
                              className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-5 py-2.5 text-xs font-medium text-slate-800">
                                {STAGE_LABELS[s.stage] ?? s.stage}
                              </td>
                              <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                                {s.totalCompleted.toLocaleString("id-ID")}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <span className="text-xs font-semibold text-slate-900">
                                  {fmtDuration(s.avgDurationMinutes)}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 text-right text-[11px] text-slate-400">
                                {fmtDuration(s.minDurationMinutes)} /{" "}
                                {fmtDuration(s.maxDurationMinutes)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* QC Metrics */}
                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <Target className="h-4 w-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Quality Control
                    </h2>
                  </header>

                  <div className="p-5 space-y-4">
                    {data.qcMetrics.map((qc) => {
                      const isEmpty = qc.totalChecks === 0;
                      const isGood = qc.passRate >= 90;
                      const isWarn = qc.passRate >= 70 && qc.passRate < 90;
                      const tone = isEmpty
                        ? "slate"
                        : isGood
                          ? "emerald"
                          : isWarn
                            ? "amber"
                            : "rose";

                      const toneMap = {
                        slate: {
                          bar: "bg-slate-200",
                          text: "text-slate-400",
                          bg: "bg-slate-50",
                        },
                        emerald: {
                          bar: "bg-emerald-500",
                          text: "text-emerald-700",
                          bg: "bg-emerald-50",
                        },
                        amber: {
                          bar: "bg-amber-500",
                          text: "text-amber-700",
                          bg: "bg-amber-50",
                        },
                        rose: {
                          bar: "bg-rose-500",
                          text: "text-rose-700",
                          bg: "bg-rose-50",
                        },
                      };

                      return (
                        <div key={qc.stage}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700">
                              {QC_LABELS[qc.stage] ?? qc.stage}
                            </span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-400">
                                {qc.passed}/{qc.totalChecks} lulus
                              </span>
                              <span
                                className={`font-semibold ${toneMap[tone].text}`}
                              >
                                {isEmpty ? "—" : `${qc.passRate.toFixed(1)}%`}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${toneMap[tone].bar}`}
                              style={{
                                width: `${Math.min(qc.passRate, 100)}%`,
                              }}
                            />
                          </div>
                          {qc.failed > 0 && (
                            <p className="mt-1 text-[11px] text-rose-600">
                              {qc.failed} gagal QC
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "emerald" | "sky" | "amber" | "rose" | "slate";
}) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50",
    sky: "text-sky-600 bg-sky-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
    slate: "text-slate-600 bg-slate-100",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div
        className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[tone]}`}
      >
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function OrderFlowChart({ data }: { data: OrderFlowPoint[] }) {
  const max = Math.max(...data.map((d) => d.completed), 1);
  const visible = data.slice(-30); // max 30 days

  return (
    <div className="flex items-end gap-0.5 h-24">
      {visible.map((d) => {
        const pct = (d.completed / max) * 100;
        const dateLabel = new Date(d.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
        return (
          <div
            key={d.date}
            className="flex-1 group relative flex flex-col justify-end"
            title={`${dateLabel}: ${d.completed} order`}
          >
            <div
              className={`rounded-sm transition-all ${
                d.completed === max && max > 0
                  ? "bg-emerald-500"
                  : d.completed > 0
                    ? "bg-slate-300 group-hover:bg-slate-400"
                    : "bg-slate-100"
              }`}
              style={{ height: `${Math.max(pct, d.completed > 0 ? 4 : 2)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-slate-400">{label}</p>
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
          Gagal memuat analisis
        </h3>
        <p className="mb-5 text-sm text-rose-700">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
