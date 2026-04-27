// app/dashboard/superadmin/oprprd/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Briefcase,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Gem,
  Hammer,
  LineChart,
  MapPin,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  ThumbsUp,
  Trophy,
  Truck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================
// Config
// ============================================================

const API_ENDPOINT = "/api/daily-stats-2";

// Link paths
const LINK_OPERASIONAL = "/dashboard/superadmin/oprprd/operasional";
const LINK_PRODUKSI = "/dashboard/superadmin/oprprd/produksi";

// ============================================================
// Types
// ============================================================

interface DashboardData {
  kpi: {
    totalOrdersAktif: number;
    potensiKeterlambatan: number;
    nilaiBarangWIP: {
      beratEmas: number;
      jumlahPermata: number;
      estimasiRupiah: number;
      avgKarat: number;
    };
    rataCycleTime: number;
    targetCycleTime: number;
    additional: {
      ordersHariIni: number;
      selesaiHariIni: number;
      totalRework: number;
      criticalRework: number;
      completedCount: number;
    };
    trend: {
      currentWeekOrders: number;
      lastWeekOrders: number;
      trendPercent: number;
    };
  };
  operasional: {
    afterSales: {
      totalKonfirmasi: number;
      totalPelunasan: number;
      totalDelivery: number;
      urgentCount: number;
    };
    adminTasks: {
      total: number;
      delayed: number;
      active: number;
    };
    racik: {
      rataShrinkage: number;
      targetShrinkage: number;
      totalBerat: number;
    };
    laser: {
      antrian: number;
      mesinAktif: number;
    };
    qc: {
      passRateAvg: number;
      totalChecks: number;
      failedToday: number;
    };
  };
  produksi: {
    experts: {
      total: number;
      aktif: number;
      totalOrders: number;
    };
    microSetting: {
      total: number;
      inProgress: number;
      waiting: number;
    };
    yield: {
      rataYield: number;
      totalTarget: number;
      totalActual: number;
    };
  };
  recentActivities: Array<{
    id: string;
    type: "scan" | "qc" | "approval" | "rework";
    orderNumber: string;
    stage: string;
    user: string;
    timestamp: string;
    status?: "success" | "warning" | "error";
    notes?: string;
  }>;
  topPerformers: Array<{
    name: string;
    role: string;
    ordersCompleted: number;
    avgTime: number;
  }>;
  stageDistribution: Array<{
    stage: string;
    count: number;
    color?: string;
  }>;
}

export const dynamic = "force-dynamic";

// ============================================================
// Labels & Config
// ============================================================

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Order Masuk",
  qc_awal: "QC Awal",
  racik_bahan: "Racik",
  lebur_bahan: "Lebur",
  pembentukan_cincin: "Bentuk",
  pemasangan_permata: "Setting",
  pemolesan: "Poles",
  qc_1: "QC 1",
  konfirmasi_awal: "Konfirmasi",
  finishing: "Finishing",
  laser: "Laser",
  qc_2: "QC 2",
  pelunasan: "Pelunasan",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  packing: "Packing",
  pengiriman: "Kirim",
};

const STAGE_BAR_CLASS: Record<string, string> = {
  penerimaan_order: "bg-sky-400",
  qc_awal: "bg-sky-500",
  racik_bahan: "bg-indigo-400",
  lebur_bahan: "bg-amber-500",
  pembentukan_cincin: "bg-amber-400",
  pemasangan_permata: "bg-violet-500",
  pemolesan: "bg-blue-400",
  qc_1: "bg-emerald-400",
  konfirmasi_awal: "bg-teal-400",
  finishing: "bg-rose-400",
  laser: "bg-violet-400",
  qc_2: "bg-emerald-500",
  pelunasan: "bg-amber-600",
  kelengkapan: "bg-blue-500",
  qc_3: "bg-emerald-600",
  packing: "bg-slate-500",
  pengiriman: "bg-slate-600",
};

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  scan: ScanLine,
  qc: ShieldCheck,
  approval: ThumbsUp,
  rework: RefreshCw,
};

// ============================================================
// Formatters
// ============================================================

function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(0)}Jt`;
  }
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMins < 1) return "baru saja";
  if (diffMins < 60) return `${diffMins}m lalu`;
  if (diffHours < 24) return `${diffHours}j lalu`;
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// Page
// ============================================================

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
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
      const res = await fetch(API_ENDPOINT);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Sesi Anda telah habis");
        throw new Error("Gagal mengambil data dashboard");
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

  const isOverCycle = data?.kpi.rataCycleTime
    ? data.kpi.rataCycleTime > data.kpi.targetCycleTime
    : false;
  const trendIsPositive = data?.kpi.trend.trendPercent
    ? data.kpi.trend.trendPercent > 0
    : false;
  const totalOrders = data?.kpi.totalOrdersAktif || 1;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* ========== Page Header ========== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
            <Loading variant="skeleton" text="Memuat data dashboard..." />
          ) : error ? (
            <DashboardError error={error} onRetry={() => fetchData(true)} />
          ) : !data ? null : (
            <div className="space-y-6">
              {/* ========== ROW 1: MAIN KPI CARDS ========== */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Total Order Aktif"
                  value={data.kpi.totalOrdersAktif.toString()}
                  icon={ClipboardList}
                  accent="sky"
                  subtitle="Order dalam proses"
                  badge={
                    <TrendBadge
                      percent={data.kpi.trend.trendPercent}
                      isPositive={trendIsPositive}
                    />
                  }
                />

                <KpiCard
                  label="Potensi Keterlambatan"
                  value={data.kpi.potensiKeterlambatan.toString()}
                  icon={AlertTriangle}
                  accent={data.kpi.potensiKeterlambatan > 0 ? "amber" : "slate"}
                  subtitle={
                    data.kpi.potensiKeterlambatan > 0
                      ? "Butuh perhatian segera"
                      : "Semua order on track"
                  }
                />

                <KpiCard
                  label="Nilai Barang WIP"
                  value={formatRupiah(data.kpi.nilaiBarangWIP.estimasiRupiah)}
                  icon={Wallet}
                  accent="violet"
                  subtitle={
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {data.kpi.nilaiBarangWIP.beratEmas.toFixed(0)}g emas
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Gem className="h-3 w-3 text-violet-400" />
                        {data.kpi.nilaiBarangWIP.jumlahPermata} permata
                      </span>
                    </span>
                  }
                />

                <KpiCard
                  label="Rata-rata Cycle Time"
                  value={`${data.kpi.rataCycleTime.toFixed(1)}`}
                  unit="hari"
                  icon={Clock}
                  accent={isOverCycle ? "rose" : "emerald"}
                  subtitle={
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Target {data.kpi.targetCycleTime} hari</span>
                        <span
                          className={`inline-flex items-center gap-0.5 font-medium ${
                            isOverCycle ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {isOverCycle ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {Math.abs(
                            data.kpi.rataCycleTime - data.kpi.targetCycleTime,
                          ).toFixed(1)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverCycle ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (data.kpi.rataCycleTime /
                                data.kpi.targetCycleTime) *
                                100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  }
                />
              </div>

              {/* ========== ROW 2: QUICK STATS & TODAY ========== */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <SectionCard icon={BarChart3} title="Hari Ini">
                  <dl className="space-y-2.5 text-sm">
                    <StatRow
                      label="Order masuk"
                      value={data.kpi.additional.ordersHariIni}
                      tone="sky"
                    />
                    <StatRow
                      label="Order selesai"
                      value={data.kpi.additional.selesaiHariIni}
                      tone="emerald"
                    />
                    <StatRow
                      label="Rework"
                      value={data.kpi.additional.totalRework}
                      tone={
                        data.kpi.additional.criticalRework > 0
                          ? "rose"
                          : "slate"
                      }
                      warn={data.kpi.additional.criticalRework > 0}
                    />
                    <StatRow
                      label="Completed (30 hari)"
                      value={data.kpi.additional.completedCount}
                      tone="slate"
                      smaller
                    />
                  </dl>
                </SectionCard>

                <SectionCard icon={Briefcase} title="After Sales">
                  <div className="space-y-1.5">
                    <LinkRow
                      href={LINK_OPERASIONAL}
                      icon={Camera}
                      label="Konfirmasi"
                      value={data.operasional.afterSales.totalKonfirmasi}
                      iconTone="sky"
                    />
                    <LinkRow
                      href={LINK_OPERASIONAL}
                      icon={DollarSign}
                      label="Pelunasan"
                      value={data.operasional.afterSales.totalPelunasan}
                      iconTone="amber"
                    />
                    <LinkRow
                      href={LINK_OPERASIONAL}
                      icon={Truck}
                      label="Delivery"
                      value={data.operasional.afterSales.totalDelivery}
                      iconTone="emerald"
                    />
                    {data.operasional.afterSales.urgentCount > 0 && (
                      <div className="mt-3 flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50/50 p-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-rose-600" />
                        <p className="text-xs text-rose-700">
                          {data.operasional.afterSales.urgentCount} order butuh
                          follow up segera
                        </p>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard icon={Hammer} title="Produksi">
                  <div className="space-y-1.5">
                    <LinkRow
                      href={LINK_PRODUKSI}
                      icon={Users}
                      label="Tukang aktif"
                      value={`${data.produksi.experts.aktif}/${data.produksi.experts.total}`}
                      iconTone="slate"
                    />
                    <LinkRow
                      href={LINK_PRODUKSI}
                      icon={Gem}
                      label="Micro setting"
                      value={data.produksi.microSetting.total}
                      iconTone="violet"
                    />
                    <div className="flex items-center justify-between rounded-md px-2 py-1.5">
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                        Yield material
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          data.produksi.yield.rataYield >= 95
                            ? "text-emerald-600"
                            : data.produksi.yield.rataYield >= 90
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        {data.produksi.yield.rataYield.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Order dikerjakan hari ini</span>
                        <span className="font-medium text-slate-700">
                          {data.produksi.experts.totalOrders}
                        </span>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* ========== ROW 3: STAGE DISTRIBUTION & QC SUMMARY ========== */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SectionCard icon={MapPin} title="Distribusi Order per Stage">
                  {data.stageDistribution.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Belum ada data distribusi
                    </p>
                  ) : (
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      {data.stageDistribution.map((stage) => {
                        const percent = (stage.count / totalOrders) * 100;
                        const barClass =
                          STAGE_BAR_CLASS[stage.stage] ?? "bg-slate-400";

                        return (
                          <div
                            key={stage.stage}
                            className="flex items-center gap-3"
                          >
                            <span className="w-28 shrink-0 truncate text-xs text-slate-600">
                              {STAGE_LABELS[stage.stage] ?? stage.stage}
                            </span>
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all ${barClass}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                                {stage.count}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon={ShieldCheck} title="Quality Control">
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Pass Rate Rata-rata
                      </p>
                      <p
                        className={`mt-1 text-2xl font-semibold ${
                          data.operasional.qc.passRateAvg >= 80
                            ? "text-emerald-600"
                            : data.operasional.qc.passRateAvg >= 60
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        {data.operasional.qc.passRateAvg.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Total QC Hari Ini
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {data.operasional.qc.totalChecks}
                      </p>
                    </div>
                  </div>

                  {data.operasional.qc.failedToday > 0 && (
                    <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/50 p-3">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      <div>
                        <p className="text-sm font-medium text-rose-900">
                          {data.operasional.qc.failedToday} order gagal QC hari
                          ini
                        </p>
                        <p className="mt-0.5 text-xs text-rose-700">
                          Segera lakukan review untuk mencegah rework berulang
                        </p>
                      </div>
                    </div>
                  )}

                  <Link
                    href={LINK_OPERASIONAL}
                    className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
                  >
                    Lihat detail QC
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </SectionCard>
              </div>

              {/* ========== ROW 4: RECENT ACTIVITIES & TOP PERFORMERS ========== */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SectionCard icon={LineChart} title="Aktivitas Terbaru">
                  {data.recentActivities.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                      Belum ada aktivitas
                    </p>
                  ) : (
                    <div className="max-h-[300px] space-y-0 overflow-y-auto pr-1">
                      {data.recentActivities.map((activity) => (
                        <ActivityRow key={activity.id} activity={activity} />
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon={Trophy} title="Top Performers">
                  {data.topPerformers.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                      Belum ada data performer
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {data.topPerformers.slice(0, 5).map((performer, idx) => (
                        <PerformerRow
                          key={`${performer.name}-${idx}`}
                          rank={idx + 1}
                          {...performer}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Akses Cepat
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <QuickLink
                        href={LINK_OPERASIONAL}
                        icon={ClipboardList}
                        label="Operasional"
                      />
                      <QuickLink
                        href={LINK_PRODUKSI}
                        icon={Hammer}
                        label="Produksi"
                      />
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Sub: KpiCard
// ============================================================

function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  subtitle,
  badge,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  accent: "sky" | "amber" | "violet" | "rose" | "emerald" | "slate";
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const accentMap = {
    sky: {
      iconBg: "bg-sky-50",
      iconText: "text-sky-600",
      ring: "ring-sky-100",
    },
    amber: {
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
      ring: "ring-amber-100",
    },
    violet: {
      iconBg: "bg-violet-50",
      iconText: "text-violet-600",
      ring: "ring-violet-100",
    },
    rose: {
      iconBg: "bg-rose-50",
      iconText: "text-rose-600",
      ring: "ring-rose-100",
    },
    emerald: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      ring: "ring-emerald-100",
    },
    slate: {
      iconBg: "bg-slate-50",
      iconText: "text-slate-500",
      ring: "ring-slate-100",
    },
  };

  const a = accentMap[accent];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <p className="text-3xl font-semibold tabular-nums text-slate-900">
              {value}
            </p>
            {unit && <p className="text-sm text-slate-500">{unit}</p>}
          </div>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${a.iconBg} ${a.ring}`}
        >
          <Icon className={`h-5 w-5 ${a.iconText}`} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="min-w-0 flex-1 text-slate-500">{subtitle}</div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
    </div>
  );
}

function TrendBadge({
  percent,
  isPositive,
}: {
  percent: number;
  isPositive: boolean;
}) {
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const classes = isPositive
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-rose-50 text-rose-700 ring-rose-200";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${classes}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(percent).toFixed(0)}%
    </span>
  );
}

// ============================================================
// Sub: SectionCard — frame standar untuk section
// ============================================================

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ============================================================
// Sub: StatRow — label di kiri, angka di kanan
// ============================================================

function StatRow({
  label,
  value,
  tone,
  warn,
  smaller,
}: {
  label: string;
  value: number | string;
  tone: "sky" | "emerald" | "rose" | "slate";
  warn?: boolean;
  smaller?: boolean;
}) {
  const toneMap = {
    sky: "text-sky-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    slate: "text-slate-700",
  };

  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={`${smaller ? "text-base" : "text-xl"} font-semibold tabular-nums ${
          warn ? "text-rose-600" : toneMap[tone]
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ============================================================
// Sub: LinkRow — row yang clickable
// ============================================================

function LinkRow({
  href,
  icon: Icon,
  label,
  value,
  iconTone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number | string;
  iconTone: "sky" | "amber" | "emerald" | "violet" | "slate";
}) {
  const iconToneMap = {
    sky: "text-sky-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    violet: "text-violet-500",
    slate: "text-slate-400",
  };

  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-md px-2 py-1.5 transition hover:bg-slate-50"
    >
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <Icon className={`h-3.5 w-3.5 ${iconToneMap[iconTone]}`} />
        {label}
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-slate-900">
        {value}
        <ArrowRight className="h-3 w-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </span>
    </Link>
  );
}

// ============================================================
// Sub: ActivityRow
// ============================================================

function ActivityRow({
  activity,
}: {
  activity: DashboardData["recentActivities"][number];
}) {
  const Icon = ACTIVITY_ICON[activity.type] ?? ClipboardList;
  const iconToneMap = {
    scan: "text-sky-500",
    qc: "text-emerald-500",
    approval: "text-violet-500",
    rework: "text-amber-500",
  };

  const StatusIcon =
    activity.status === "success"
      ? CheckCircle2
      : activity.status === "warning"
        ? AlertTriangle
        : activity.status === "error"
          ? XCircle
          : null;

  const statusTone =
    activity.status === "success"
      ? "text-emerald-500"
      : activity.status === "warning"
        ? "text-amber-500"
        : activity.status === "error"
          ? "text-rose-500"
          : "";

  return (
    <div className="flex items-center gap-3 border-b border-slate-50 py-2 text-sm last:border-0">
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${iconToneMap[activity.type] ?? "text-slate-400"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-slate-800">
            {activity.orderNumber}
          </span>
          <span className="text-[11px] text-slate-400">
            {STAGE_LABELS[activity.stage] ?? activity.stage}
          </span>
        </div>
        <p className="truncate text-[11px] text-slate-500">
          {activity.user} · {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
      {StatusIcon && (
        <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${statusTone}`} />
      )}
    </div>
  );
}

// ============================================================
// Sub: PerformerRow
// ============================================================

function PerformerRow({
  rank,
  name,
  role,
  ordersCompleted,
  avgTime,
}: {
  rank: number;
  name: string;
  role: string;
  ordersCompleted: number;
  avgTime: number;
}) {
  const isTopThree = rank <= 3;

  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isTopThree
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {rank}
        </span>
        <div>
          <p className="text-sm font-medium text-slate-800">{name}</p>
          <p className="text-[11px] text-slate-500">{role}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {ordersCompleted}
        </p>
        <p className="text-[11px] text-slate-500">
          {avgTime.toFixed(1)} hari/order
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Sub: QuickLink
// ============================================================

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-slate-600" />
      {label}
    </Link>
  );
}

// ============================================================
// Skeleton
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Error
// ============================================================

function DashboardError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-lg border border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <AlertTriangle className="h-6 w-6 text-rose-600" />
        </div>
        <h2 className="mb-1 text-base font-semibold text-slate-900">
          Gagal memuat dashboard
        </h2>
        <p className="mb-5 text-sm text-slate-600">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
