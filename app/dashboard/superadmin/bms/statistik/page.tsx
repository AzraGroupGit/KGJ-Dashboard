// app/dashboard/superadmin/statistik/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCard from "@/components/dashboard/StatCard";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import DataTable, { type Column } from "@/components/dashboard/DataTable";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CalendarDays } from "lucide-react";

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

interface BMSStatsData {
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
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("none");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // DUA TANGGAL untuk perbandingan hari vs hari
  const [dateA, setDateA] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateB, setDateB] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

  const isDod = comparisonMode === "dod";

  const dailyAQuery = useQuery({
    queryKey: ["daily-stats", dateA],
    queryFn: () => fetcher<DailyStats>(`/api/daily-stats-1?date=${dateA}`),
    enabled: isDod,
  });

  const dailyBQuery = useQuery({
    queryKey: ["daily-stats", dateB],
    queryFn: () => fetcher<DailyStats>(`/api/daily-stats-1?date=${dateB}`),
    enabled: isDod,
  });

  const statsQuery = useQuery({
    queryKey: ["stats", selectedYear],
    queryFn: () => fetcher<BMSStatsData>(`/api/stats?year=${selectedYear}`),
    enabled: !isDod,
  });

  const prevStatsQuery = useQuery({
    queryKey: ["stats", selectedYear - 1],
    queryFn: () => fetcher<BMSStatsData>(`/api/stats?year=${selectedYear - 1}`),
    enabled: !isDod && (comparisonMode === "yoy" || comparisonMode === "mom"),
  });

  const stats = statsQuery.data ?? null;
  const prevStats = prevStatsQuery.data ?? null;
  const dailyStatsA = dailyAQuery.data ?? null;
  const dailyStatsB = dailyBQuery.data ?? null;
  const isLoading = isDod
    ? dailyAQuery.isLoading || dailyBQuery.isLoading
    : statsQuery.isLoading || prevStatsQuery.isLoading;

  const queryErrors = isDod ? [dailyAQuery.error, dailyBQuery.error] : [statsQuery.error, prevStatsQuery.error];
  const currentError = queryErrors.find(Boolean)?.message ?? null;
  const alert = currentError && currentError !== dismissedError ? { type: "error" as const, message: currentError } : null;

  // ─── Current-period metrics ─────────────────────────────────────────────────

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

  // ─── Comparison metrics (YoY) ───────────────────────────────────────────────

  const pt = prevStats?.totals;
  const prevGrossProfit = pt ? Math.round(pt.omset * 0.5) : 0;
  const prevCrSerius =
    pt && pt.lead_serius > 0 ? (pt.closing_mkt / pt.lead_serius) * 100 : 0;
  const prevBasketSize =
    pt && pt.closing_mkt > 0 ? pt.omset / pt.closing_mkt : 0;
  const prevAcquisitionCost =
    pt && pt.closing_mkt > 0 ? pt.biaya_marketing / pt.closing_mkt : 0;
  const prevGpPerBm =
    pt && pt.biaya_marketing > 0 ? prevGrossProfit / pt.biaya_marketing : 0;
  const prevBmPerOmset =
    pt && pt.omset > 0 ? (pt.biaya_marketing / pt.omset) * 100 : 0;
  const prevCpls =
    pt && pt.lead_serius > 0 ? pt.biaya_marketing / pt.lead_serius : 0;

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
            grossProfit: pctDelta(
              momMetrics.grossProfit,
              momPrevMetrics.grossProfit,
            ),
            crSerius: pctDelta(momMetrics.crSerius, momPrevMetrics.crSerius),
            basketSize: undefined,
            acquisitionCost: undefined,
            gpPerBm: undefined,
            bmPerOmset: undefined,
            cpls: undefined,
          }
        : null;

  // ─── DoD metrics (perbandingan DUA HARI yang dipilih) ──────────────────────

  const pointA = dailyStatsA?.totals ?? null;
  const pointB = dailyStatsB?.totals ?? null;

  const dodDeltas =
    comparisonMode === "dod" && pointA && pointB
      ? {
          omset: pctDelta(pointB.omset, pointA.omset),
          grossProfit: pctDelta(pointB.gross_profit, pointA.gross_profit),
          leadMasuk: pctDelta(pointB.lead_masuk, pointA.lead_masuk),
          closing: pctDelta(pointB.closing, pointA.closing),
          cr: pctDelta(
            pointB.lead_masuk > 0
              ? (pointB.closing / pointB.lead_masuk) * 100
              : 0,
            pointA.lead_masuk > 0
              ? (pointA.closing / pointA.lead_masuk) * 100
              : 0,
          ),
        }
      : null;

  const dateALabel = dateA
    ? new Date(dateA + "T00:00:00").toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  const dateBLabel = dateB
    ? new Date(dateB + "T00:00:00").toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  // ─── Chart data ─────────────────────────────────────────────────────────────

  const chartLabels = (stats?.monthly ?? []).map(
    (m) => MONTH_ABBR[m.month - 1],
  );
  const omsetData = stats?.monthly.map((m) => m.omset) ?? [];
  const gpData = stats?.monthly.map((m) => m.gross_profit) ?? [];
  const bmData = stats?.monthly.map((m) => m.biaya_marketing) ?? [];
  const prevOmsetData = prevStats?.monthly.map((m) => m.omset) ?? [];
  const prevGpData = prevStats?.monthly.map((m) => m.gross_profit) ?? [];
  const prevBmData = prevStats?.monthly.map((m) => m.biaya_marketing) ?? [];
  const channelLabels = (stats?.channels ?? [])
    .slice(0, 8)
    .map((c) => c.channel);
  const channelClosing = (stats?.channels ?? [])
    .slice(0, 8)
    .map((c) => c.closing);
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
    {
      key: "cr_serius",
      label: "CR Serius",
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    { key: "cpls", label: "CPLS", format: fmtRp },
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

  // ─── Comparison label helpers ────────────────────────────────────────────────

  const compLabel =
    comparisonMode === "dod"
      ? `${dateALabel} vs ${dateBLabel}`
      : comparisonMode === "yoy"
        ? `vs ${selectedYear - 1}`
        : comparisonMode === "mom" && prevMonthRow
          ? `vs ${MONTH_NAMES[(selectedMonth === 1 ? 12 : selectedMonth - 1) - 1]}${selectedMonth === 1 ? ` ${selectedYear - 1}` : ""}`
          : "";

  const activeOmset =
    comparisonMode === "mom" && momMetrics ? momMetrics.omset : (t?.omset ?? 0);
  const activeGrossProfit =
    comparisonMode === "mom" && momMetrics
      ? momMetrics.grossProfit
      : grossProfit;
  const activeCrSerius =
    comparisonMode === "mom" && momMetrics ? momMetrics.crSerius : avgCrSerius;
  const activeLeadSerius =
    comparisonMode === "mom" && curMonthRow
      ? curMonthRow.lead_serius
      : (t?.lead_serius ?? 0);
  const activeClosing =
    comparisonMode === "mom" && curMonthRow
      ? curMonthRow.closing
      : (t?.closing_mkt ?? 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#26211c]">
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
            {comparisonMode !== "dod" && (
              <div className="flex items-center gap-3 bg-cocoa rounded-xl shadow-sm px-4 py-3">
                <CalendarDays className="w-4 h-4 text-white/40" />
                <label className="text-sm text-gray-600 font-medium">
                  Tahun
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) =>
                    setSelectedYear(parseInt(e.target.value, 10))
                  }
                  className="text-sm border-none outline-none bg-transparent font-semibold text-gray-800 cursor-pointer"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Comparison mode bar ── */}
          <div className="bg-cocoa rounded-xl shadow-sm px-5 py-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-600">
                Perbandingan:
              </span>
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
                      : "bg-cocoa text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {label}
                </button>
              ))}

              {comparisonMode !== "none" && compLabel && (
                <span className="text-xs text-white/40 ml-auto">
                  {compLabel}
                </span>
              )}
            </div>

            {/* DUA DATE PICKER untuk Hari vs Hari */}
            {comparisonMode === "dod" && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-16">Tanggal A:</span>
                  <input
                    type="date"
                    value={dateA}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDateA(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-white/40">
                    {dateA &&
                      new Date(dateA + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-16">Tanggal B:</span>
                  <input
                    type="date"
                    value={dateB}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDateB(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-white/40">
                    {dateB &&
                      new Date(dateB + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 ml-2">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded bg-white/30" />
                    A (pembanding)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded bg-indigo-500" />
                    B (utama)
                  </span>
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
                          : "bg-cocoa text-gray-500 border-gray-200 hover:border-indigo-300"
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
                  <span className="inline-block w-3 h-0.5 rounded bg-white/30" />
                  {selectedYear - 1} (pembanding)
                </span>
              </div>
            )}
          </div>

          {/* Alert */}
          {alert && (
            <div className="mb-6">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setDismissedError(currentError)}
              />
            </div>
          )}

          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data statistik..." />
          ) : comparisonMode === "dod" ? (
            /* ── DoD view dengan DUA HARI ── */
            <>
              {!dailyStatsA || !dailyStatsB ? (
                <p className="text-gray-500 text-sm">
                  Tidak ada data untuk salah satu tanggal.
                </p>
              ) : (
                <>
                  {/* DoD stat cards - Menampilkan data Tanggal B sebagai utama */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                    <StatCard
                      title="Omzet"
                      value={fmtRpShort(pointB?.omset ?? 0)}
                      subtitle={`A: ${fmtRpShort(pointA?.omset ?? 0)}`}
                      color="blue"
                      delta={dodDeltas?.omset}
                    />
                    <StatCard
                      title="Gross Profit"
                      value={fmtRpShort(pointB?.gross_profit ?? 0)}
                      subtitle={`A: ${fmtRpShort(pointA?.gross_profit ?? 0)}`}
                      color="green"
                      delta={dodDeltas?.grossProfit}
                    />
                    <StatCard
                      title="Lead Masuk"
                      value={pointB?.lead_masuk ?? 0}
                      subtitle={`A: ${pointA?.lead_masuk ?? 0}`}
                      color="purple"
                      delta={dodDeltas?.leadMasuk}
                    />
                    <StatCard
                      title="Closing"
                      value={pointB?.closing ?? 0}
                      subtitle={`A: ${pointA?.closing ?? 0}`}
                      color="orange"
                      delta={dodDeltas?.closing}
                    />
                    <StatCard
                      title="CR"
                      value={`${pointB && pointB.lead_masuk > 0 ? ((pointB.closing / pointB.lead_masuk) * 100).toFixed(1) : "0.0"}%`}
                      subtitle={`A: ${pointA && pointA.lead_masuk > 0 ? ((pointA.closing / pointA.lead_masuk) * 100).toFixed(1) : "0.0"}%`}
                      color="indigo"
                      delta={dodDeltas?.cr}
                    />
                  </div>

                  {/* Perbandingan detail table */}
                  <div className="bg-cocoa rounded-xl shadow-sm p-6 mb-8">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">
                      Perbandingan Hari:{" "}
                      <span className="text-gray-500">{dateALabel}</span> vs{" "}
                      <span className="text-indigo-600">{dateBLabel}</span>
                    </h3>
                    {pointA && pointB ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 pr-6 text-gray-500 font-medium">
                                Metrik
                              </th>
                              <th className="text-right py-2 px-4 text-gray-500 font-medium">
                                Tanggal A
                              </th>
                              <th className="text-right py-2 px-4 text-indigo-600 font-semibold">
                                Tanggal B
                              </th>
                              <th className="text-right py-2 pl-4 font-medium text-gray-500">
                                Δ (B vs A)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {[
                              {
                                label: "Omzet",
                                a: fmtRpShort(pointA.omset),
                                b: fmtRpShort(pointB.omset),
                                delta: dodDeltas?.omset,
                              },
                              {
                                label: "Gross Profit",
                                a: fmtRpShort(pointA.gross_profit),
                                b: fmtRpShort(pointB.gross_profit),
                                delta: dodDeltas?.grossProfit,
                              },
                              {
                                label: "Lead Masuk",
                                a: pointA.lead_masuk,
                                b: pointB.lead_masuk,
                                delta: dodDeltas?.leadMasuk,
                              },
                              {
                                label: "Closing",
                                a: pointA.closing,
                                b: pointB.closing,
                                delta: dodDeltas?.closing,
                              },
                              {
                                label: "CR",
                                a: `${pointA.lead_masuk > 0 ? ((pointA.closing / pointA.lead_masuk) * 100).toFixed(1) : "0.0"}%`,
                                b: `${pointB.lead_masuk > 0 ? ((pointB.closing / pointB.lead_masuk) * 100).toFixed(1) : "0.0"}%`,
                                delta: dodDeltas?.cr,
                              },
                            ].map((row) => (
                              <tr key={row.label}>
                                <td className="py-2.5 pr-6 text-gray-700">
                                  {row.label}
                                </td>
                                <td className="py-2.5 px-4 text-right text-gray-500">
                                  {row.a}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold text-gray-800">
                                  {row.b}
                                </td>
                                <td className="py-2.5 pl-4 text-right">
                                  {row.delta !== undefined ? (
                                    <span
                                      className={`text-xs font-semibold ${row.delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                                    >
                                      {row.delta >= 0 ? "+" : ""}
                                      {row.delta.toFixed(1)}%
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">
                        Data tidak tersedia.
                      </p>
                    )}
                  </div>

                  {/* Branch breakdown untuk Tanggal B */}
                  {dailyStatsB.staff.length > 0 && (
                    <div className="bg-cocoa rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800">
                          Performa Cabang - {dateBLabel}
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#26211c]">
                            <tr>
                              {[
                                "Cabang",
                                "Kode",
                                "Lead Masuk",
                                "Closing",
                                "CR",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {dailyStatsB.staff.map((s) => (
                              <tr key={s.id} className="hover:bg-[#26211c]">
                                <td className="px-6 py-3 font-medium text-gray-800">
                                  {s.name}
                                </td>
                                <td className="px-6 py-3 text-gray-500">
                                  {s.branch}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {s.lead_masuk}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {s.closing}
                                </td>
                                <td className="px-6 py-3">
                                  <span
                                    className={`text-xs font-semibold ${s.cr > 30 ? "text-emerald-300" : s.cr > 15 ? "text-amber-300" : "text-rose-300"}`}
                                  >
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
            // ... (kode untuk none, mom, yoy tetap sama seperti sebelumnya)
            <>
              {/* ── Key Metrics Row 1 ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-2">
                <StatCard
                  title="Total Omzet"
                  value={fmtRpShort(activeOmset)}
                  subtitle={
                    comparisonMode === "mom"
                      ? MONTH_NAMES[selectedMonth - 1]
                      : `${activeClosing} closing`
                  }
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
                <div className="bg-cocoa rounded-xl shadow-sm p-6 mb-8">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">
                    Perbandingan Bulan:{" "}
                    <span className="text-indigo-600">
                      {MONTH_NAMES[selectedMonth - 1]}
                    </span>{" "}
                    vs{" "}
                    <span className="text-gray-500">
                      {
                        MONTH_NAMES[
                          (selectedMonth === 1 ? 12 : selectedMonth - 1) - 1
                        ]
                      }
                      {selectedMonth === 1 ? ` ${selectedYear - 1}` : ""}
                    </span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 pr-6 text-gray-500 font-medium">
                            Metrik
                          </th>
                          <th className="text-right py-2 px-4 text-indigo-600 font-semibold">
                            {MONTH_NAMES[selectedMonth - 1]}
                          </th>
                          <th className="text-right py-2 px-4 text-gray-500 font-medium">
                            {
                              MONTH_NAMES[
                                (selectedMonth === 1 ? 12 : selectedMonth - 1) -
                                  1
                              ]
                            }
                          </th>
                          <th className="text-right py-2 pl-4 font-medium text-gray-500">
                            Δ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[
                          {
                            label: "Omzet",
                            cur: fmtRpShort(momMetrics.omset),
                            prev: fmtRpShort(momPrevMetrics.omset),
                            delta: pctDelta(
                              momMetrics.omset,
                              momPrevMetrics.omset,
                            ),
                          },
                          {
                            label: "Gross Profit",
                            cur: fmtRpShort(momMetrics.grossProfit),
                            prev: fmtRpShort(momPrevMetrics.grossProfit),
                            delta: pctDelta(
                              momMetrics.grossProfit,
                              momPrevMetrics.grossProfit,
                            ),
                          },
                          {
                            label: "Biaya Marketing",
                            cur: fmtRpShort(momMetrics.biayaMarketing),
                            prev: fmtRpShort(momPrevMetrics.biayaMarketing),
                            delta: pctDelta(
                              momMetrics.biayaMarketing,
                              momPrevMetrics.biayaMarketing,
                            ),
                            lowerIsBetter: true,
                          },
                          {
                            label: "Lead Serius",
                            cur: momMetrics.leadSerius,
                            prev: momPrevMetrics.leadSerius,
                            delta: pctDelta(
                              momMetrics.leadSerius,
                              momPrevMetrics.leadSerius,
                            ),
                          },
                          {
                            label: "Closing",
                            cur: momMetrics.closing,
                            prev: momPrevMetrics.closing,
                            delta: pctDelta(
                              momMetrics.closing,
                              momPrevMetrics.closing,
                            ),
                          },
                          {
                            label: "CR Serius",
                            cur: `${momMetrics.crSerius.toFixed(1)}%`,
                            prev: `${momPrevMetrics.crSerius.toFixed(1)}%`,
                            delta: pctDelta(
                              momMetrics.crSerius,
                              momPrevMetrics.crSerius,
                            ),
                          },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className="py-2.5 pr-6 text-gray-700">
                              {row.label}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-gray-800">
                              {row.cur}
                            </td>
                            <td className="py-2.5 px-4 text-right text-gray-500">
                              {row.prev}
                            </td>
                            <td className="py-2.5 pl-4 text-right">
                              {row.delta !== undefined ? (
                                <span
                                  className={`text-xs font-semibold ${
                                    (
                                      row.lowerIsBetter
                                        ? row.delta <= 0
                                        : row.delta >= 0
                                    )
                                      ? "text-emerald-300"
                                      : "text-rose-300"
                                  }`}
                                >
                                  {row.delta >= 0 ? "+" : ""}
                                  {row.delta.toFixed(1)}%
                                </span>
                              ) : (
                                "—"
                              )}
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
                <div className="bg-cocoa rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-800">Trend Omzet & Gross Profit</h3>
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-3 h-0.5 rounded inline-block bg-indigo-500" />
                        Omzet {selectedYear}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-3 h-0.5 rounded inline-block bg-emerald-500" />
                        GP {selectedYear}
                      </span>
                      {comparisonMode === "yoy" && prevOmsetData.length > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-0.5 rounded inline-block bg-indigo-300" />
                          Omzet {selectedYear - 1}
                        </span>
                      )}
                      {comparisonMode === "yoy" && prevGpData.length > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-0.5 rounded inline-block bg-emerald-300" />
                          GP {selectedYear - 1}
                        </span>
                      )}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={224}>
                    <LineChart
                      data={chartLabels.map((l, i) => ({
                        bulan: l,
                        omzet: omsetData[i] ?? 0,
                        gp: gpData[i] ?? 0,
                        ...(prevOmsetData.length ? { prevOmzet: prevOmsetData[i] ?? 0 } : {}),
                        ...(prevGpData.length ? { prevGp: prevGpData[i] ?? 0 } : {}),
                      }))}
                      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(Math.round(v))}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(value: unknown) => {
                          const v = value as number;
                          return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)} Jt` : `Rp ${v.toLocaleString("id-ID")}`;
                        }}
                      />
                      <Line type="monotone" dataKey="omzet" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                      <Line type="monotone" dataKey="gp" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                      {comparisonMode === "yoy" && prevOmsetData.length > 0 && (
                        <Line type="monotone" dataKey="prevOmzet" stroke="#a5b4fc" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2, fill: "#a5b4fc", strokeWidth: 0 }} connectNulls />
                      )}
                      {comparisonMode === "yoy" && prevGpData.length > 0 && (
                        <Line type="monotone" dataKey="prevGp" stroke="#6ee7b7" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2, fill: "#6ee7b7", strokeWidth: 0 }} connectNulls />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="mt-3 text-center text-xs text-white/40">{comparisonMode === "yoy" ? `${selectedYear} vs ${selectedYear - 1}` : `Tahun ${selectedYear}`}</p>
                </div>
                <div className="bg-cocoa rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">Biaya Marketing per Bulan</h3>
                  <ResponsiveContainer width="100%" height={224}>
                    <BarChart
                      data={chartLabels.map((l, i) => ({
                        bulan: l,
                        bm: bmData[i] ?? 0,
                        ...(prevBmData.length ? { prevBm: prevBmData[i] ?? 0 } : {}),
                      }))}
                      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(Math.round(v))}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(value: unknown) => {
                          const v = value as number;
                          return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)} Jt` : `Rp ${v.toLocaleString("id-ID")}`;
                        }}
                      />
                      <Bar dataKey="bm" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      {comparisonMode === "yoy" && prevBmData.length > 0 && (
                        <Bar dataKey="prevBm" fill="#fcd34d" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mt-3 text-center text-xs text-white/40">{comparisonMode === "yoy" ? `${selectedYear} vs ${selectedYear - 1}` : `Tahun ${selectedYear}`}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-cocoa rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">Closing per Channel</h3>
                  <ResponsiveContainer width="100%" height={224}>
                    <BarChart
                      data={channelLabels.map((l, i) => ({ channel: l, closing: channelClosing[i] ?? 0 }))}
                      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="closing" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mt-3 text-center text-xs text-white/40">Tahun {selectedYear}</p>
                </div>
                <div className="bg-cocoa rounded-xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">CPLS per Channel</h3>
                  <ResponsiveContainer width="100%" height={224}>
                    <BarChart
                      data={channelLabels.map((l, i) => ({ channel: l, cpls: channelCpls[i] ?? 0 }))}
                      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(Math.round(v))} />
                      <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(value: unknown) => {
                          const v = value as number;
                          return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)} Jt` : `Rp ${v.toLocaleString("id-ID")}`;
                        }}
                      />
                      <Bar dataKey="cpls" fill="#06b6d4" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mt-3 text-center text-xs text-white/40">Tahun {selectedYear}</p>
                </div>
              </div>

              {/* ── Data Tables ── */}
              <div className="space-y-6">
                <DataTable
                  title={`Data Statistik Bulanan ${selectedYear}`}
                  data={
                    (stats?.monthly.filter(
                      (m) => m.omset > 0 || m.lead_serius > 0,
                    ) ?? []) as unknown as Record<string, unknown>[]
                  }
                  columns={monthlyColumns as Column[]}
                />
                <DataTable
                  title={`Performa Channel Marketing ${selectedYear}`}
                  data={(stats?.channels ?? []) as unknown as Record<string, unknown>[]}
                  columns={channelColumns as Column[]}
                />
                <DataTable
                  title={`Performa Cabang CS ${selectedYear}`}
                  data={(stats?.branches ?? []) as unknown as Record<string, unknown>[]}
                  columns={branchColumns as Column[]}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
