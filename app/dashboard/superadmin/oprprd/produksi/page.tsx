// app/dashboard/superadmin/oprprd/produksi/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Gem,
  Hammer,
  Loader2,
  Microscope,
  RefreshCw,
  ScanLine,
  Sparkles,
  Target,
  User,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================
// Types — selaras dengan response API /api/production (v7)
// ============================================================

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
  source?: string;
  type?: string;
  gemstone_type?: string;
  shape?: string;
  pieces?: number;
  carat_total?: number;
  has_certificate?: boolean;
}

interface MicroSettingRow {
  order_id: string;
  order_number: string;
  gemstone_info: GemstoneInfo[] | null;
  current_stage: string;
  staff_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  weight_before: number | null;
  weight_after: number | null;
  status: "waiting" | "in_progress" | "completed";
}

interface YieldRow {
  order_date: string;
  order_number: string;
  target: number | null;
  actual: number | null;
  susut: number | null;
}

interface ProduksiData {
  experts: Expert[];
  microSetting: MicroSettingRow[];
  yieldData: YieldRow[];
}

export const dynamic = "force-dynamic";

// ============================================================
// Labels & Icons
// ============================================================

const ROLE_CONFIG: Record<string, { name: string; Icon: LucideIcon }> = {
  staff_racik: { name: "Racik Bahan", Icon: Gem },
  staff_lebur: { name: "Lebur Bahan", Icon: Flame },
  staff_bentuk: { name: "Pembentukan", Icon: Hammer },
  staff_pemolesan: { name: "Pemolesan", Icon: Sparkles },
  staff_laser: { name: "Laser", Icon: ScanLine },
  staff_finishing: { name: "Finishing", Icon: Wrench },
};

function getRoleConfig(roleName: string) {
  return ROLE_CONFIG[roleName] ?? { name: roleName, Icon: User };
}

// ============================================================
// Formatters
// ============================================================

function formatGemstone(info: GemstoneInfo[] | null): string {
  if (!info || info.length === 0) return "—";
  const first = info[0];
  const type = first.gemstone_type ?? first.type ?? "permata";
  const carat = first.carat_total;
  const pieces = first.pieces;
  const parts: string[] = [type];
  if (pieces && pieces > 1) parts.push(`×${pieces}`);
  if (carat != null) parts.push(`${carat}ct`);
  return parts.join(" ");
}

// ============================================================
// Page
// ============================================================

export default function ProduksiPage() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [data, setData] = useState<ProduksiData | null>(null);
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
      const res = await fetch("/api/production");
      if (!res.ok) {
        if (res.status === 401) throw new Error("Sesi Anda telah habis");
        throw new Error("Gagal mengambil data produksi");
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

  // Summary metrics untuk yield
  const yieldStats = data
    ? {
        avgYield:
          data.yieldData.length > 0
            ? data.yieldData.reduce((acc, item) => {
                if (item.actual && item.target && item.target > 0) {
                  return acc + (item.actual / item.target) * 100;
                }
                return acc;
              }, 0) / data.yieldData.length
            : 0,
        totalTarget: data.yieldData.reduce(
          (acc, item) => acc + (item.target ?? 0),
          0,
        ),
        totalActual: data.yieldData.reduce(
          (acc, item) => acc + (item.actual ?? 0),
          0,
        ),
      }
    : { avgYield: 0, totalTarget: 0, totalActual: 0 };

  const activeExperts = data?.experts.filter((e) => e.activeOrder).length ?? 0;

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
                Monitoring Produksi
              </h2>
              <p className="text-sm text-slate-400 font-mono mt-1">
                Pantau aktivitas tukang, micro setting, dan yield material
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
            <Loading variant="skeleton" text="Memuat data produksi..." />
          ) : error ? (
            <ProduksiError error={error} onRetry={() => fetchData(true)} />
          ) : !data ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">Tidak ada data tersedia</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ========== SECTION 1: JEWELRY EXPERT ========== */}
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
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      <span className="font-medium text-slate-700">
                        {activeExperts}
                      </span>
                      <span className="mx-1">dari</span>
                      <span className="font-medium text-slate-700">
                        {data.experts.length}
                      </span>
                      aktif
                    </span>
                  </div>
                </header>

                {data.experts.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm text-slate-400">
                      Belum ada data tukang aktif
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 lg:grid-cols-3">
                    {data.experts.map((expert) => (
                      <ExpertCard key={expert.userId} expert={expert} />
                    ))}
                  </div>
                )}
              </section>

              {/* ========== SECTION 2: MICRO SETTING & YIELD ========== */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Micro Setting */}
                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Microscope className="h-4 w-4 text-slate-400" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        Micro Setting
                      </h2>
                    </div>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                      {data.microSetting.length} order
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
                        {data.microSetting.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-10 text-center text-sm text-slate-400"
                            >
                              Tidak ada order micro setting
                            </td>
                          </tr>
                        ) : (
                          data.microSetting
                            .slice(0, 10)
                            .map((order) => (
                              <MicroSettingRow
                                key={order.order_id}
                                order={order}
                              />
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
                    <span className="text-xs text-slate-500">
                      7 hari terakhir
                    </span>
                  </header>

                  {data.yieldData.length === 0 ? (
                    <div className="p-12 text-center">
                      <BarChart3 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm text-slate-400">
                        Belum ada data yield
                      </p>
                    </div>
                  ) : (
                    <div className="p-5">
                      {/* Summary Stats */}
                      <div className="mb-5 grid grid-cols-3 gap-2">
                        <StatCard
                          label="Rata-rata Yield"
                          value={`${yieldStats.avgYield.toFixed(1)}%`}
                          tone={
                            yieldStats.avgYield >= 95
                              ? "emerald"
                              : yieldStats.avgYield >= 90
                                ? "amber"
                                : "rose"
                          }
                        />
                        <StatCard
                          label="Total Target"
                          value={`${yieldStats.totalTarget.toFixed(1)}g`}
                          tone="slate"
                        />
                        <StatCard
                          label="Total Aktual"
                          value={`${yieldStats.totalActual.toFixed(1)}g`}
                          tone="slate"
                        />
                      </div>

                      {/* Yield List */}
                      <div className="space-y-2.5">
                        {data.yieldData.slice(0, 7).map((item, idx) => (
                          <YieldRow key={idx} item={item} />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Sub: ExpertCard
// ============================================================

function ExpertCard({ expert }: { expert: Expert }) {
  const config = getRoleConfig(expert.roleName);
  const { Icon } = config;

  const hasSusut = expert.rataSusut != null && expert.targetSusut != null;
  const isOverSusut = hasSusut && expert.rataSusut! > expert.targetSusut!;

  const isActive = expert.activeOrder != null;
  const activeDuration = expert.activeOrder
    ? Math.floor(
        (Date.now() - new Date(expert.activeOrder.startedAt).getTime()) /
          60_000,
      )
    : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {config.name}
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

      {/* Active Order */}
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
              {activeDuration} mnt
            </span>
          </div>
        </div>
      )}

      {/* Stats grid */}
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
                className={`text-xs font-semibold ${
                  isOverSusut ? "text-rose-600" : "text-emerald-600"
                }`}
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

// ============================================================
// Sub: MicroSettingRow
// ============================================================

function MicroSettingRow({ order }: { order: MicroSettingRow }) {
  const gemstone = formatGemstone(order.gemstone_info);

  return (
    <tr className="border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50">
      <td className="px-5 py-2.5">
        <span className="font-mono text-xs text-slate-700">
          {order.order_number}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Gem className="h-3 w-3 shrink-0 text-violet-400" />
          <span className="text-xs text-slate-600">{gemstone}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-600">
        {order.staff_name ?? <span className="text-slate-400">Menunggu</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-600">
        {order.weight_before != null && order.weight_after != null ? (
          <span>
            {order.weight_before.toFixed(2)} →{" "}
            <span className="font-medium text-slate-900">
              {order.weight_after.toFixed(2)}
            </span>
            <span className="ml-0.5 text-slate-400">g</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-5 py-2.5">
        <StatusBadge status={order.status} />
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
}: {
  status: "waiting" | "in_progress" | "completed";
}) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Selesai
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
        <Loader2 className="h-3 w-3 animate-spin" />
        Proses
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      <Clock className="h-3 w-3" />
      Antri
    </span>
  );
}

// ============================================================
// Sub: YieldRow
// ============================================================

function YieldRow({ item }: { item: YieldRow }) {
  const yieldPercent =
    item.actual != null && item.target != null && item.target > 0
      ? (item.actual / item.target) * 100
      : 0;

  const tone =
    yieldPercent >= 98
      ? "emerald"
      : yieldPercent >= 95
        ? "emerald"
        : yieldPercent >= 90
          ? "amber"
          : "rose";

  const toneClassMap = {
    emerald: {
      bar: "bg-emerald-500",
      text: "text-emerald-600",
    },
    amber: {
      bar: "bg-amber-500",
      text: "text-amber-600",
    },
    rose: {
      bar: "bg-rose-500",
      text: "text-rose-600",
    },
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 truncate font-mono text-xs text-slate-500">
        {item.order_number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-600">
            {item.target?.toFixed(2) ?? "-"}g →{" "}
            <span className="font-medium text-slate-900">
              {item.actual?.toFixed(2) ?? "-"}g
            </span>
          </span>
          <span className={`font-semibold ${toneClassMap[tone].text}`}>
            {yieldPercent.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${toneClassMap[tone].bar}`}
            style={{ width: `${Math.min(yieldPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub: StatCard
// ============================================================

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "rose" | "slate";
}) {
  const toneMap = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    slate: "text-slate-900",
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-base font-semibold ${toneMap[tone]}`}>
        {value}
      </p>
    </div>
  );
}

// ============================================================
// Error
// ============================================================

function ProduksiError({
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
          Gagal memuat data produksi
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
