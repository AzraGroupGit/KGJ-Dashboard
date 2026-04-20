// app/dashboard/superadmin/statistik/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import DataTable from "@/components/dashboard/DataTable";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getClientUser, type ClientUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyRow {
  month: number;
  bulan: string;
  omset: number;
  gross_profit: number;
  biaya_marketing: number;
  lead_serius: number;
  lead_all: number;
  closing: number;
}

interface ChannelRow {
  channel: string;
  omset: number;
  biaya_marketing: number;
  lead_serius: number;
  lead_all: number;
  closing: number;
  cr_serius: number;
  cpls: number;
  roi: number;
}

interface BranchRow {
  name: string;
  code: string;
  lead_masuk: number;
  closing: number;
  conversion_rate: number;
}

interface Totals {
  omset: number;
  biaya_marketing: number;
  lead_serius: number;
  lead_all: number;
  closing_mkt: number;
  lead_masuk_cs: number;
  closing_cs: number;
}

interface StatsData {
  monthly: MonthlyRow[];
  channels: ChannelRow[];
  branches: BranchRow[];
  totals: Totals;
  year: number;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmtRp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const fmtRpShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return fmtRp(v);
};

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatistikPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "error"; message: string } | null>(
    null,
  );
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);

  useEffect(() => {
    setClientUser(getClientUser());
    setSelectedYear(new Date().getFullYear());
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stats?year=${selectedYear}`);
      const json = await res.json();
      if (!res.ok) {
        setAlert({
          type: "error",
          message: json.error || "Gagal memuat data statistik",
        });
        return;
      }
      setStats(json);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Derived metrics ────────────────────────────────────────────────────────

  const t = stats?.totals;
  const grossProfit = t ? Math.round(t.omset * 0.5) : 0;
  const avgCrSerius =
    t && t.lead_serius > 0 ? (t.closing_mkt / t.lead_serius) * 100 : 0;
  const avgBasketSize = t && t.closing_mkt > 0 ? t.omset / t.closing_mkt : 0;
  const avgAcquisitionCost =
    t && t.closing_mkt > 0 ? t.biaya_marketing / t.closing_mkt : 0;
  const avgGpPerBm =
    t && t.biaya_marketing > 0 ? grossProfit / t.biaya_marketing : 0;
  const avgBmPerOmset =
    t && t.omset > 0 ? (t.biaya_marketing / t.omset) * 100 : 0;
  const avgCpls =
    t && t.lead_serius > 0 ? t.biaya_marketing / t.lead_serius : 0;

  // Chart data from real monthly rows (only months with data, capped at 12)
  const chartLabels = (stats?.monthly ?? []).map(
    (m) => MONTH_ABBR[m.month - 1],
  );
  const omsetData = stats?.monthly.map((m) => m.omset) ?? [];
  const gpData = stats?.monthly.map((m) => m.gross_profit) ?? [];
  const bmData = stats?.monthly.map((m) => m.biaya_marketing) ?? [];
  const channelLabels = (stats?.channels ?? [])
    .slice(0, 8)
    .map((c) => c.channel);
  const channelClosing = (stats?.channels ?? [])
    .slice(0, 8)
    .map((c) => c.closing);
  const channelOmset = (stats?.channels ?? []).slice(0, 8).map((c) => c.omset);

  // ─── Table columns ──────────────────────────────────────────────────────────

  const monthlyColumns = [
    { key: "bulan", label: "Bulan" },
    { key: "omset", label: "Omzet", format: fmtRp },
    { key: "gross_profit", label: "Gross Profit", format: fmtRp },
    { key: "biaya_marketing", label: "Biaya Marketing", format: fmtRp },
    { key: "lead_serius", label: "Lead Serius" },
    { key: "lead_all", label: "Lead All" },
    { key: "closing", label: "Closing" },
  ];

  const channelColumns = [
    { key: "channel", label: "Channel" },
    { key: "omset", label: "Omzet", format: fmtRp },
    { key: "biaya_marketing", label: "Biaya Marketing", format: fmtRp },
    { key: "lead_serius", label: "Lead Serius" },
    { key: "closing", label: "Closing" },
    {
      key: "cr_serius",
      label: "CR Serius",
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    { key: "cpls", label: "CPLS", format: fmtRp },
    { key: "roi", label: "ROI", format: (v: number) => `${v.toFixed(0)}%` },
  ];

  const branchColumns = [
    { key: "name", label: "Cabang" },
    { key: "code", label: "Kode" },
    { key: "lead_masuk", label: "Lead Masuk" },
    { key: "closing", label: "Closing" },
    {
      key: "conversion_rate",
      label: "Conversion Rate",
      format: (v: number) => `${v.toFixed(1)}%`,
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Data Statistik Lengkap
              </h2>
              <p className="text-sm text-gray-500">
                Analisis mendalam seluruh metrik bisnis
              </p>
            </div>
            {/* Year filter */}
            <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-4 py-3">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <label className="text-sm text-gray-600 font-medium">Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="text-sm border-none outline-none bg-transparent font-semibold text-gray-800 cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alert */}
          {alert && (
            <div className="mb-6">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            </div>
          )}

          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data statistik..." />
          ) : (
            <>
              {/* ── Key Metrics Row 1 ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-2">
                <StatCard
                  title="Total Omzet"
                  value={fmtRpShort(t?.omset ?? 0)}
                  subtitle={`${t?.closing_mkt ?? 0} closing`}
                  color="blue"
                />
                <StatCard
                  title="Total Gross Profit"
                  value={fmtRpShort(grossProfit)}
                  subtitle="Est. 50% margin"
                  color="green"
                />
                <StatCard
                  title="Average CR Serius"
                  value={`${avgCrSerius.toFixed(1)}%`}
                  subtitle={`${t?.lead_serius ?? 0} lead serius`}
                  color="purple"
                />
                <StatCard
                  title="Average Basket Size"
                  value={fmtRpShort(avgBasketSize)}
                  subtitle="per closing"
                  color="orange"
                />
              </div>

              {/* ── Key Metrics Row 2 ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard
                  title="Acquisition Cost"
                  value={fmtRpShort(avgAcquisitionCost)}
                  subtitle="per closing"
                  color="red"
                />
                <StatCard
                  title="GP / Biaya Marketing"
                  value={`${avgGpPerBm.toFixed(2)}×`}
                  subtitle="return on marketing"
                  color="indigo"
                />
                <StatCard
                  title="BM / Omzet"
                  value={`${avgBmPerOmset.toFixed(1)}%`}
                  subtitle="marketing spend ratio"
                  color="yellow"
                />
                <StatCard
                  title="CPLS"
                  value={fmtRpShort(avgCpls)}
                  subtitle="cost per lead serius"
                  color="blue"
                />
              </div>

              {/* ── Charts ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ChartCard
                  title="Trend Omzet & Gross Profit"
                  type="line"
                  labels={chartLabels}
                  datasets={[
                    { label: "Omzet", data: omsetData, color: "#6366f1" },
                    { label: "Gross Profit", data: gpData, color: "#10b981" },
                  ]}
                  period={`Tahun ${selectedYear}`}
                  formatValue={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(0)}Jt`
                      : String(Math.round(v))
                  }
                />
                <ChartCard
                  title="Biaya Marketing per Bulan"
                  type="bar"
                  labels={chartLabels}
                  datasets={[
                    {
                      label: "Biaya Marketing",
                      data: bmData,
                      color: "#f59e0b",
                    },
                  ]}
                  period={`Tahun ${selectedYear}`}
                  formatValue={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(0)}Jt`
                      : String(Math.round(v))
                  }
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ChartCard
                  title="Closing per Channel"
                  type="bar"
                  labels={channelLabels}
                  datasets={[
                    {
                      label: "Closing",
                      data: channelClosing,
                      color: "#8b5cf6",
                    },
                  ]}
                  period={`Tahun ${selectedYear}`}
                />
                <ChartCard
                  title="Omzet per Channel"
                  type="bar"
                  labels={channelLabels}
                  datasets={[
                    { label: "Omzet", data: channelOmset, color: "#06b6d4" },
                  ]}
                  period={`Tahun ${selectedYear}`}
                  formatValue={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(0)}Jt`
                      : String(Math.round(v))
                  }
                />
              </div>

              {/* ── Data Tables ── */}
              <div className="space-y-6">
                <DataTable
                  title={`Data Statistik Bulanan ${selectedYear}`}
                  data={
                    stats?.monthly.filter(
                      (m) => m.omset > 0 || m.lead_serius > 0,
                    ) ?? []
                  }
                  columns={monthlyColumns}
                />
                <DataTable
                  title={`Performa Channel Marketing ${selectedYear}`}
                  data={stats?.channels ?? []}
                  columns={channelColumns}
                />
                <DataTable
                  title={`Performa Cabang CS ${selectedYear}`}
                  data={stats?.branches ?? []}
                  columns={branchColumns}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
