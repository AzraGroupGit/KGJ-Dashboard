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
  biaya_marketing: number;
  lead_serius: number;
  lead_all: number;
  closing: number;
  cr_serius: number;
  cpls: number;
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

interface TrendPoint {
  date: string;
  label: string;
  lead_masuk: number;
  closing: number;
  omset: number;
  gross_profit: number;
}

interface DailyStaff {
  id: string;
  name: string;
  branch: string;
  lead_masuk: number;
  closing: number;
  cr: number;
}

interface DailyStats {
  date: string;
  totals: {
    lead_masuk: number;
    lead_serius: number;
    closing: number;
    omset: number;
    gross_profit: number;
    lead_masuk_delta: number;
    closing_delta: number;
    omset_delta: number;
  };
  staff: DailyStaff[];
  trend: TrendPoint[];
}

type ComparisonMode = "none" | "dod" | "mom" | "yoy";

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmtRp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const fmtRpShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return fmtRp(v);
};

const pctDelta = (current: number, previous: number): number | undefined => {
  if (!previous) return undefined;
  return ((current - previous) / previous) * 100;
};

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatistikPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [prevStats, setPrevStats] = useState<StatsData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("none");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "error"; message: string } | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      if (comparisonMode === "dod") {
        const res = await fetch(`/api/daily-stats?date=${selectedDate}`);
        const json = await res.json();
        if (!res.ok) {
          setAlert({ type: "error", message: json.error || "Gagal memuat data harian" });
          return;
        }
        setDailyStats(json);
        setIsLoading(false);
        return;
      }

      const [resA, resB] = await Promise.all([
        fetch(`/api/stats?year=${selectedYear}`),
        comparisonMode === "yoy" || comparisonMode === "mom"
          ? fetch(`/api/stats?year=${selectedYear - 1}`)
          : Promise.resolve(null),
      ]);

      const jsonA = await resA.json();
      if (!resA.ok) {
        setAlert({ type: "error", message: jsonA.error || "Gagal memuat data statistik" });
        return;
      }
      setStats(jsonA);

      if (resB) {
        const jsonB = await resB.json();
        if (resB.ok) setPrevStats(jsonB);
      } else {
        setPrevStats(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, comparisonMode, selectedDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Current-period metrics ─────────────────────────────────────────────────

  const t = stats?.totals;
  const grossProfit = t ? Math.round(t.omset * 0.5) : 0;
  const avgCrSerius = t && t.lead_serius > 0 ? (t.closing_mkt / t.lead_serius) * 100 : 0;
  const avgBasketSize = t && t.closing_mkt > 0 ? t.omset / t.closing_mkt : 0;
  const avgAcquisitionCost = t && t.closing_mkt > 0 ? t.biaya_marketing / t.closing_mkt : 0;
  const avgGpPerBm = t && t.biaya_marketing > 0 ? grossProfit / t.biaya_marketing : 0;
  const avgBmPerOmset = t && t.omset > 0 ? (t.biaya_marketing / t.omset) * 100 : 0;
  const avgCpls = t && t.lead_serius > 0 ? t.biaya_marketing / t.lead_serius : 0;

  // ─── Comparison metrics (YoY) ───────────────────────────────────────────────

  const pt = prevStats?.totals;
  const prevGrossProfit = pt ? Math.round(pt.omset * 0.5) : 0;
  const prevCrSerius = pt && pt.lead_serius > 0 ? (pt.closing_mkt / pt.lead_serius) * 100 : 0;
  const prevBasketSize = pt && pt.closing_mkt > 0 ? pt.omset / pt.closing_mkt : 0;
  const prevAcquisitionCost = pt && pt.closing_mkt > 0 ? pt.biaya_marketing / pt.closing_mkt : 0;
  const prevGpPerBm = pt && pt.biaya_marketing > 0 ? prevGrossProfit / pt.biaya_marketing : 0;
  const prevBmPerOmset = pt && pt.omset > 0 ? (pt.biaya_marketing / pt.omset) * 100 : 0;
  const prevCpls = pt && pt.lead_serius > 0 ? pt.biaya_marketing / pt.lead_serius : 0;

  // ─── Comparison metrics (MoM) ───────────────────────────────────────────────

  const curMonthRow = stats?.monthly.find((m) => m.month === selectedMonth);
  const prevMonthRow =
    selectedMonth > 1
      ? stats?.monthly.find((m) => m.month === selectedMonth - 1)
      : prevStats?.monthly.find((m) => m.month === 12);

  const momMetrics = curMonthRow
    ? {
        omset: curMonthRow.omset,
        grossProfit: curMonthRow.gross_profit,
        leadSerius: curMonthRow.lead_serius,
        closing: curMonthRow.closing,
        biayaMarketing: curMonthRow.biaya_marketing,
        crSerius:
          curMonthRow.lead_serius > 0
            ? (curMonthRow.closing / curMonthRow.lead_serius) * 100
            : 0,
      }
    : null;

  const momPrevMetrics = prevMonthRow
    ? {
        omset: prevMonthRow.omset,
        grossProfit: prevMonthRow.gross_profit,
        leadSerius: prevMonthRow.lead_serius,
        closing: prevMonthRow.closing,
        biayaMarketing: prevMonthRow.biaya_marketing,
        crSerius:
          prevMonthRow.lead_serius > 0
            ? (prevMonthRow.closing / prevMonthRow.lead_serius) * 100
            : 0,
      }
    : null;

  // ─── Resolve deltas based on mode ───────────────────────────────────────────

  const deltas =
    comparisonMode === "yoy" && pt
      ? {
          omset: pctDelta(t?.omset ?? 0, pt.omset),
          grossProfit: pctDelta(grossProfit, prevGrossProfit),
          crSerius: pctDelta(avgCrSerius, prevCrSerius),
          basketSize: pctDelta(avgBasketSize, prevBasketSize),
          acquisitionCost: pctDelta(avgAcquisitionCost, prevAcquisitionCost),
          gpPerBm: pctDelta(avgGpPerBm, prevGpPerBm),
          bmPerOmset: pctDelta(avgBmPerOmset, prevBmPerOmset),
          cpls: pctDelta(avgCpls, prevCpls),
        }
      : comparisonMode === "mom" && momMetrics && momPrevMetrics
        ? {
            omset: pctDelta(momMetrics.omset, momPrevMetrics.omset),
            grossProfit: pctDelta(momMetrics.grossProfit, momPrevMetrics.grossProfit),
            crSerius: pctDelta(momMetrics.crSerius, momPrevMetrics.crSerius),
            basketSize: undefined,
            acquisitionCost: undefined,
            gpPerBm: undefined,
            bmPerOmset: undefined,
            cpls: undefined,
          }
        : null;

  // ─── DoD metrics ────────────────────────────────────────────────────────────

  const trend = dailyStats?.trend ?? [];
  const todayPoint = trend[trend.length - 1] ?? null;
  const yesterdayPoint = trend[trend.length - 2] ?? null;

  const dodDeltas =
    comparisonMode === "dod" && todayPoint && yesterdayPoint
      ? {
          omset: pctDelta(todayPoint.omset, yesterdayPoint.omset),
          grossProfit: pctDelta(todayPoint.gross_profit, yesterdayPoint.gross_profit),
          leadMasuk: pctDelta(todayPoint.lead_masuk, yesterdayPoint.lead_masuk),
          closing: pctDelta(todayPoint.closing, yesterdayPoint.closing),
          cr: pctDelta(
            yesterdayPoint.lead_masuk > 0 ? (todayPoint.closing / todayPoint.lead_masuk) * 100 : 0,
            yesterdayPoint.lead_masuk > 0 ? (yesterdayPoint.closing / yesterdayPoint.lead_masuk) * 100 : 0,
          ),
        }
      : null;

  const prevDateLabel = yesterdayPoint
    ? new Date(yesterdayPoint.date + "T00:00:00").toLocaleDateString("id-ID", {
        weekday: "long", day: "numeric", month: "long",
      })
    : "";

  // ─── Chart data ─────────────────────────────────────────────────────────────

  const chartLabels = (stats?.monthly ?? []).map((m) => MONTH_ABBR[m.month - 1]);
  const omsetData = stats?.monthly.map((m) => m.omset) ?? [];
  const gpData = stats?.monthly.map((m) => m.gross_profit) ?? [];
  const bmData = stats?.monthly.map((m) => m.biaya_marketing) ?? [];
  const prevOmsetData = prevStats?.monthly.map((m) => m.omset) ?? [];
  const prevGpData = prevStats?.monthly.map((m) => m.gross_profit) ?? [];
  const prevBmData = prevStats?.monthly.map((m) => m.biaya_marketing) ?? [];
  const channelLabels = (stats?.channels ?? []).slice(0, 8).map((c) => c.channel);
  const channelClosing = (stats?.channels ?? []).slice(0, 8).map((c) => c.closing);
  const channelCpls = (stats?.channels ?? []).slice(0, 8).map((c) => c.cpls);

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
    { key: "biaya_marketing", label: "Biaya Marketing", format: fmtRp },
    { key: "lead_serius", label: "Lead Serius" },
    { key: "closing", label: "Closing" },
    { key: "cr_serius", label: "CR Serius", format: (v: number) => `${v.toFixed(1)}%` },
    { key: "cpls", label: "CPLS", format: fmtRp },
  ];

  const branchColumns = [
    { key: "name", label: "Cabang" },
    { key: "code", label: "Kode" },
    { key: "lead_masuk", label: "Lead Masuk" },
    { key: "closing", label: "Closing" },
    { key: "conversion_rate", label: "Conversion Rate", format: (v: number) => `${v.toFixed(1)}%` },
  ];

  // ─── Comparison label helpers ────────────────────────────────────────────────

  const compLabel =
    comparisonMode === "dod"
      ? prevDateLabel ? `vs ${prevDateLabel}` : ""
      : comparisonMode === "yoy"
        ? `vs ${selectedYear - 1}`
        : comparisonMode === "mom" && prevMonthRow
          ? `vs ${MONTH_NAMES[(selectedMonth === 1 ? 12 : selectedMonth - 1) - 1]}${selectedMonth === 1 ? ` ${selectedYear - 1}` : ""}`
          : "";

  const activeOmset = comparisonMode === "mom" && momMetrics ? momMetrics.omset : t?.omset ?? 0;
  const activeGrossProfit = comparisonMode === "mom" && momMetrics ? momMetrics.grossProfit : grossProfit;
  const activeCrSerius = comparisonMode === "mom" && momMetrics ? momMetrics.crSerius : avgCrSerius;
  const activeLeadSerius =
    comparisonMode === "mom" && curMonthRow ? curMonthRow.lead_serius : t?.lead_serius ?? 0;
  const activeClosing = comparisonMode === "mom" && curMonthRow ? curMonthRow.closing : t?.closing_mkt ?? 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
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
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <label className="text-sm text-gray-600 font-medium">Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="text-sm border-none outline-none bg-transparent font-semibold text-gray-800 cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Comparison mode bar ── */}
          <div className="bg-white rounded-xl shadow-sm px-5 py-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Perbandingan:</span>
              {(
                [
                  { key: "none", label: "Tidak Ada" },
                  { key: "dod", label: "Hari vs Hari" },
                  { key: "mom", label: "Bulan vs Bulan" },
                  { key: "yoy", label: "Tahun vs Tahun" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setComparisonMode(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    comparisonMode === key
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {label}
                </button>
              ))}

              {comparisonMode !== "none" && compLabel && (
                <span className="text-xs text-gray-400 ml-auto">{compLabel}</span>
              )}
            </div>

            {/* Date picker for DoD */}
            {comparisonMode === "dod" && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-sm text-gray-600">Pilih tanggal:</label>
                <input
                  type="date"
                  value={selectedDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-4 text-xs text-gray-500 ml-2">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded bg-indigo-500" />
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })} (dipilih)
                  </span>
                  {prevDateLabel && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-0.5 rounded bg-gray-400" />
                      {yesterdayPoint && new Date(yesterdayPoint.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })} (sebelumnya)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Month selector for MoM */}
            {comparisonMode === "mom" && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {MONTH_NAMES.map((name, idx) => {
                  const m = idx + 1;
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedMonth === m
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* YoY period indicator */}
            {comparisonMode === "yoy" && (
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded bg-indigo-500" />
                  {selectedYear} (sekarang)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded bg-gray-400" />
                  {selectedYear - 1} (pembanding)
                </span>
              </div>
            )}
          </div>

          {/* Alert */}
          {alert && (
            <div className="mb-6">
              <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            </div>
          )}

          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data statistik..." />
          ) : comparisonMode === "dod" ? (
            /* ── DoD view ── */
            <>
              {!dailyStats ? (
                <p className="text-gray-500 text-sm">Tidak ada data untuk tanggal ini.</p>
              ) : (
                <>
                  {/* DoD stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                    <StatCard
                      title="Omzet"
                      value={fmtRpShort(todayPoint?.omset ?? 0)}
                      subtitle={`Rp ${(yesterdayPoint?.omset ?? 0).toLocaleString("id-ID")}`}
                      color="blue"
                      delta={dodDeltas?.omset}
                    />
                    <StatCard
                      title="Gross Profit"
                      value={fmtRpShort(todayPoint?.gross_profit ?? 0)}
                      subtitle="Est. 50% margin"
                      color="green"
                      delta={dodDeltas?.grossProfit}
                    />
                    <StatCard
                      title="Lead Masuk"
                      value={todayPoint?.lead_masuk ?? 0}
                      subtitle={`kemarin: ${yesterdayPoint?.lead_masuk ?? 0}`}
                      color="purple"
                      delta={dodDeltas?.leadMasuk}
                    />
                    <StatCard
                      title="Closing"
                      value={todayPoint?.closing ?? 0}
                      subtitle={`kemarin: ${yesterdayPoint?.closing ?? 0}`}
                      color="orange"
                      delta={dodDeltas?.closing}
                    />
                    <StatCard
                      title="CR Hari Ini"
                      value={`${todayPoint && todayPoint.lead_masuk > 0 ? ((todayPoint.closing / todayPoint.lead_masuk) * 100).toFixed(1) : "0.0"}%`}
                      subtitle={`kemarin: ${yesterdayPoint && yesterdayPoint.lead_masuk > 0 ? ((yesterdayPoint.closing / yesterdayPoint.lead_masuk) * 100).toFixed(1) : "0.0"}%`}
                      color="indigo"
                      delta={dodDeltas?.cr}
                    />
                  </div>

                  {/* 7-day trend chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <ChartCard
                      title="Trend Omzet 7 Hari"
                      type="line"
                      labels={trend.map((d) => d.label)}
                      datasets={[
                        { label: "Omzet", data: trend.map((d) => d.omset), color: "#6366f1" },
                        { label: "Gross Profit", data: trend.map((d) => d.gross_profit), color: "#10b981" },
                      ]}
                      period="7 hari terakhir"
                      formatValue={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(Math.round(v))}
                    />
                    <ChartCard
                      title="Trend Lead & Closing 7 Hari"
                      type="bar"
                      labels={trend.map((d) => d.label)}
                      datasets={[
                        { label: "Lead Masuk", data: trend.map((d) => d.lead_masuk), color: "#8b5cf6" },
                        { label: "Closing", data: trend.map((d) => d.closing), color: "#f59e0b" },
                      ]}
                      period="7 hari terakhir"
                    />
                  </div>

                  {/* DoD comparison table */}
                  <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">
                      Perbandingan Hari:{" "}
                      <span className="text-indigo-600">
                        {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                      {prevDateLabel && <> vs <span className="text-gray-500">{prevDateLabel}</span></>}
                    </h3>
                    {todayPoint && yesterdayPoint ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 pr-6 text-gray-500 font-medium">Metrik</th>
                              <th className="text-right py-2 px-4 text-indigo-600 font-semibold">Hari Ini</th>
                              <th className="text-right py-2 px-4 text-gray-500 font-medium">Kemarin</th>
                              <th className="text-right py-2 pl-4 font-medium text-gray-500">Δ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {[
                              { label: "Omzet", cur: fmtRpShort(todayPoint.omset), prev: fmtRpShort(yesterdayPoint.omset), delta: dodDeltas?.omset },
                              { label: "Gross Profit", cur: fmtRpShort(todayPoint.gross_profit), prev: fmtRpShort(yesterdayPoint.gross_profit), delta: dodDeltas?.grossProfit },
                              { label: "Lead Masuk", cur: todayPoint.lead_masuk, prev: yesterdayPoint.lead_masuk, delta: dodDeltas?.leadMasuk },
                              { label: "Closing", cur: todayPoint.closing, prev: yesterdayPoint.closing, delta: dodDeltas?.closing },
                              {
                                label: "CR",
                                cur: `${todayPoint.lead_masuk > 0 ? ((todayPoint.closing / todayPoint.lead_masuk) * 100).toFixed(1) : "0.0"}%`,
                                prev: `${yesterdayPoint.lead_masuk > 0 ? ((yesterdayPoint.closing / yesterdayPoint.lead_masuk) * 100).toFixed(1) : "0.0"}%`,
                                delta: dodDeltas?.cr,
                              },
                            ].map((row) => (
                              <tr key={row.label}>
                                <td className="py-2.5 pr-6 text-gray-700">{row.label}</td>
                                <td className="py-2.5 px-4 text-right font-semibold text-gray-800">{row.cur}</td>
                                <td className="py-2.5 px-4 text-right text-gray-500">{row.prev}</td>
                                <td className="py-2.5 pl-4 text-right">
                                  {row.delta !== undefined ? (
                                    <span className={`text-xs font-semibold ${row.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                                      {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}%
                                    </span>
                                  ) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Data kemarin tidak tersedia.</p>
                    )}
                  </div>

                  {/* Branch breakdown */}
                  {dailyStats.staff.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800">Performa Cabang Hari Ini</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {["Cabang", "Kode", "Lead Masuk", "Closing", "CR"].map((h) => (
                                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {dailyStats.staff.map((s) => (
                              <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-800">{s.name}</td>
                                <td className="px-6 py-3 text-gray-500">{s.branch}</td>
                                <td className="px-6 py-3 text-gray-700">{s.lead_masuk}</td>
                                <td className="px-6 py-3 text-gray-700">{s.closing}</td>
                                <td className="px-6 py-3">
                                  <span className={`text-xs font-semibold ${s.cr > 30 ? "text-green-600" : s.cr > 15 ? "text-yellow-600" : "text-red-500"}`}>
                                    {s.cr.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* ── Key Metrics Row 1 ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-2">
                <StatCard
                  title="Total Omzet"
                  value={fmtRpShort(activeOmset)}
                  subtitle={comparisonMode === "mom" ? MONTH_NAMES[selectedMonth - 1] : `${activeClosing} closing`}
                  color="blue"
                  delta={deltas?.omset}
                />
                <StatCard
                  title="Total Gross Profit"
                  value={fmtRpShort(activeGrossProfit)}
                  subtitle="Est. 50% margin"
                  color="green"
                  delta={deltas?.grossProfit}
                />
                <StatCard
                  title="Average CR Serius"
                  value={`${activeCrSerius.toFixed(1)}%`}
                  subtitle={`${activeLeadSerius} lead serius`}
                  color="purple"
                  delta={deltas?.crSerius}
                />
                <StatCard
                  title="Average Basket Size"
                  value={fmtRpShort(avgBasketSize)}
                  subtitle="per closing"
                  color="orange"
                  delta={deltas?.basketSize}
                />
              </div>

              {/* ── Key Metrics Row 2 ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard
                  title="Acquisition Cost"
                  value={fmtRpShort(avgAcquisitionCost)}
                  subtitle="per closing"
                  color="red"
                  delta={deltas?.acquisitionCost}
                  higherIsBetter={false}
                />
                <StatCard
                  title="GP / Biaya Marketing"
                  value={`${avgGpPerBm.toFixed(2)}×`}
                  subtitle="return on marketing"
                  color="indigo"
                  delta={deltas?.gpPerBm}
                />
                <StatCard
                  title="BM / Omzet"
                  value={`${avgBmPerOmset.toFixed(1)}%`}
                  subtitle="marketing spend ratio"
                  color="yellow"
                  delta={deltas?.bmPerOmset}
                  higherIsBetter={false}
                />
                <StatCard
                  title="CPLS"
                  value={fmtRpShort(avgCpls)}
                  subtitle="cost per lead serius"
                  color="blue"
                  delta={deltas?.cpls}
                  higherIsBetter={false}
                />
              </div>

              {/* ── MoM comparison summary ── */}
              {comparisonMode === "mom" && momMetrics && momPrevMetrics && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">
                    Perbandingan Bulan:{" "}
                    <span className="text-indigo-600">{MONTH_NAMES[selectedMonth - 1]}</span>
                    {" "}vs{" "}
                    <span className="text-gray-500">
                      {MONTH_NAMES[(selectedMonth === 1 ? 12 : selectedMonth - 1) - 1]}
                      {selectedMonth === 1 ? ` ${selectedYear - 1}` : ""}
                    </span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 pr-6 text-gray-500 font-medium">Metrik</th>
                          <th className="text-right py-2 px-4 text-indigo-600 font-semibold">
                            {MONTH_NAMES[selectedMonth - 1]}
                          </th>
                          <th className="text-right py-2 px-4 text-gray-500 font-medium">
                            {MONTH_NAMES[(selectedMonth === 1 ? 12 : selectedMonth - 1) - 1]}
                          </th>
                          <th className="text-right py-2 pl-4 font-medium text-gray-500">Δ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[
                          { label: "Omzet", cur: fmtRpShort(momMetrics.omset), prev: fmtRpShort(momPrevMetrics.omset), delta: pctDelta(momMetrics.omset, momPrevMetrics.omset) },
                          { label: "Gross Profit", cur: fmtRpShort(momMetrics.grossProfit), prev: fmtRpShort(momPrevMetrics.grossProfit), delta: pctDelta(momMetrics.grossProfit, momPrevMetrics.grossProfit) },
                          { label: "Biaya Marketing", cur: fmtRpShort(momMetrics.biayaMarketing), prev: fmtRpShort(momPrevMetrics.biayaMarketing), delta: pctDelta(momMetrics.biayaMarketing, momPrevMetrics.biayaMarketing), lowerIsBetter: true },
                          { label: "Lead Serius", cur: momMetrics.leadSerius, prev: momPrevMetrics.leadSerius, delta: pctDelta(momMetrics.leadSerius, momPrevMetrics.leadSerius) },
                          { label: "Closing", cur: momMetrics.closing, prev: momPrevMetrics.closing, delta: pctDelta(momMetrics.closing, momPrevMetrics.closing) },
                          { label: "CR Serius", cur: `${momMetrics.crSerius.toFixed(1)}%`, prev: `${momPrevMetrics.crSerius.toFixed(1)}%`, delta: pctDelta(momMetrics.crSerius, momPrevMetrics.crSerius) },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className="py-2.5 pr-6 text-gray-700">{row.label}</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-gray-800">{row.cur}</td>
                            <td className="py-2.5 px-4 text-right text-gray-500">{row.prev}</td>
                            <td className="py-2.5 pl-4 text-right">
                              {row.delta !== undefined ? (
                                <span className={`text-xs font-semibold ${
                                  (row.lowerIsBetter ? row.delta <= 0 : row.delta >= 0)
                                    ? "text-green-600" : "text-red-500"
                                }`}>
                                  {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}%
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Charts ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ChartCard
                  title="Trend Omzet & Gross Profit"
                  type="line"
                  labels={chartLabels}
                  datasets={[
                    { label: `Omzet ${selectedYear}`, data: omsetData, color: "#6366f1" },
                    { label: `Gross Profit ${selectedYear}`, data: gpData, color: "#10b981" },
                    ...(comparisonMode === "yoy" && prevOmsetData.length
                      ? [{ label: `Omzet ${selectedYear - 1}`, data: prevOmsetData, color: "#a5b4fc" }]
                      : []),
                    ...(comparisonMode === "yoy" && prevGpData.length
                      ? [{ label: `GP ${selectedYear - 1}`, data: prevGpData, color: "#6ee7b7" }]
                      : []),
                  ]}
                  period={comparisonMode === "yoy" ? `${selectedYear} vs ${selectedYear - 1}` : `Tahun ${selectedYear}`}
                  formatValue={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(Math.round(v))
                  }
                />
                <ChartCard
                  title="Biaya Marketing per Bulan"
                  type="bar"
                  labels={chartLabels}
                  datasets={[
                    { label: `${selectedYear}`, data: bmData, color: "#f59e0b" },
                    ...(comparisonMode === "yoy" && prevBmData.length
                      ? [{ label: `${selectedYear - 1}`, data: prevBmData, color: "#fcd34d" }]
                      : []),
                  ]}
                  period={comparisonMode === "yoy" ? `${selectedYear} vs ${selectedYear - 1}` : `Tahun ${selectedYear}`}
                  formatValue={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(Math.round(v))
                  }
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ChartCard
                  title="Closing per Channel"
                  type="bar"
                  labels={channelLabels}
                  datasets={[{ label: "Closing", data: channelClosing, color: "#8b5cf6" }]}
                  period={`Tahun ${selectedYear}`}
                />
                <ChartCard
                  title="CPLS per Channel"
                  type="bar"
                  labels={channelLabels}
                  datasets={[{ label: "CPLS", data: channelCpls, color: "#06b6d4" }]}
                  period={`Tahun ${selectedYear}`}
                  formatValue={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(Math.round(v))
                  }
                />
              </div>

              {/* ── Data Tables ── */}
              <div className="space-y-6">
                <DataTable
                  title={`Data Statistik Bulanan ${selectedYear}`}
                  data={stats?.monthly.filter((m) => m.omset > 0 || m.lead_serius > 0) ?? []}
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
