"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyStaffRow {
  id: string;
  name: string;
  branch: string;
  lead_masuk: number;
  lead_serius: number;
  closing: number;
  omset: number;
  last_activity: string | null;
}

interface DailyTrend {
  date: string;
  label: string;
  lead_masuk: number;
  closing: number;
  omset: number;
  gross_profit: number;
}

interface DailyTotals {
  lead_masuk: number;
  lead_serius: number;
  closing: number;
  omset: number;
  gross_profit: number;
  lead_masuk_delta: number;
  closing_delta: number;
  omset_delta: number;
}

interface DailyData {
  date: string;
  totals: DailyTotals;
  staff: DailyStaffRow[];
  trend: DailyTrend[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtRpShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
};

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDisplayDate = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeltaBadge({ delta, unit = "" }: { delta: number; unit?: string }) {
  if (delta === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
        = sama
      </span>
    );
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(delta)}{unit} vs kemarin
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(pts[pts.length - 1].split(",")[0])} cy={parseFloat(pts[pts.length - 1].split(",")[1])} r="3" fill={color} />
    </svg>
  );
}

function TrendBars({ trend, field, color, fmt }: {
  trend: DailyTrend[];
  field: keyof DailyTrend;
  color: string;
  fmt: (v: number) => string;
}) {
  const vals = trend.map((t) => Number(t[field]));
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {trend.map((t, i) => {
        const h = Math.max((vals[i] / max) * 100, 3);
        const isLast = i === trend.length - 1;
        return (
          <div key={t.date} className="flex flex-col items-center flex-1 h-full gap-1">
            <span className="text-[9px] font-mono text-slate-400 h-4 flex items-center">{fmt(vals[i])}</span>
            <div className="flex-1 w-full flex items-end">
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{ height: `${h}%`, background: isLast ? color : `${color}55` }}
              />
            </div>
            <span className={`text-[10px] font-mono whitespace-nowrap ${isLast ? "text-indigo-500 font-semibold" : "text-slate-400"}`}>
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({ title, value, sub, color, delta, deltaUnit, sparkData, sparkColor }: {
  title: string;
  value: string | number;
  sub?: string;
  color: string;
  delta?: number;
  deltaUnit?: string;
  sparkData?: number[];
  sparkColor?: string;
}) {
  const accent: Record<string, string> = {
    indigo: "before:bg-indigo-500",
    emerald: "before:bg-emerald-500",
    amber: "before:bg-amber-400",
    rose: "before:bg-rose-400",
    sky: "before:bg-sky-500",
    violet: "before:bg-violet-500",
    teal: "before:bg-teal-500",
    orange: "before:bg-orange-400",
  };
  return (
    <div className={`relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:rounded-t-2xl ${accent[color] ?? ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
      <p className="text-[22px] font-bold text-slate-900 leading-none mb-1.5">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 font-mono mb-2">{sub}</p>}
      {delta !== undefined && <DeltaBadge delta={delta} unit={deltaUnit} />}
      {sparkData && sparkData.length >= 2 && (
        <div className="mt-3">
          <Sparkline data={sparkData} color={sparkColor ?? "#6366f1"} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyAnalysisPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date()));
  const [data, setData] = useState<DailyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "trend">("overview");

  useEffect(() => { setClientUser(getClientUser()); }, []);

  const fetchDaily = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/daily-stats?date=${selectedDate}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchDaily(); }, [fetchDaily]);

  // Keyboard navigation: ← / →
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") {
        const d = new Date(selectedDate + "T00:00:00");
        d.setDate(d.getDate() - 1);
        setSelectedDate(toLocalDate(d));
      } else if (e.key === "ArrowRight") {
        const d = new Date(selectedDate + "T00:00:00");
        d.setDate(d.getDate() + 1);
        if (d <= new Date()) setSelectedDate(toLocalDate(d));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedDate]);

  const isToday = selectedDate === toLocalDate(new Date());

  const cr = data && data.totals.lead_masuk > 0
    ? (data.totals.closing / data.totals.lead_masuk) * 100
    : 0;
  const crSerius = data && data.totals.lead_serius > 0
    ? (data.totals.closing / data.totals.lead_serius) * 100
    : 0;

  const trend7Lead = data?.trend.map((t) => t.lead_masuk) ?? [];
  const trend7Omset = data?.trend.map((t) => t.omset) ?? [];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "staff", label: "Aktivitas CS" },
    { key: "trend", label: "Trend 7 Hari" },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                Data Harian
              </h2>
              <p className="text-sm text-slate-400 font-mono">
                {formatDisplayDate(selectedDate)}
                {isToday && (
                  <span className="ml-2 text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                    HARI INI
                  </span>
                )}
              </p>
            </div>

            {/* Date navigator */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
              <button
                title="Hari sebelumnya (←)"
                onClick={() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(toLocalDate(d));
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg transition-colors"
              >
                ‹
              </button>
              <input
                type="date"
                value={selectedDate}
                max={toLocalDate(new Date())}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="border-none outline-none font-mono text-sm font-medium text-slate-800 bg-transparent cursor-pointer"
              />
              <button
                title="Hari berikutnya (→)"
                onClick={() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  d.setDate(d.getDate() + 1);
                  if (d <= new Date()) setSelectedDate(toLocalDate(d));
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${
                  isToday ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
                disabled={isToday}
              >
                ›
              </button>
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(toLocalDate(new Date()))}
                  className="ml-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Hari Ini
                </button>
              )}
              <button
                onClick={fetchDaily}
                title="Refresh"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data harian..." />
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <svg className="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Tidak ada data untuk tanggal ini.</p>
            </div>
          ) : (
            <>
              {/* ═══ TAB: OVERVIEW ═══════════════════════════════════════════ */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Primary KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                      title="Lead Masuk"
                      value={data.totals.lead_masuk}
                      sub={`${data.totals.lead_serius} lead serius`}
                      color="indigo"
                      delta={data.totals.lead_masuk_delta}
                      sparkData={trend7Lead}
                      sparkColor="#6366f1"
                    />
                    <KpiCard
                      title="Closing"
                      value={data.totals.closing}
                      sub={`CR ${fmtPct(cr)}`}
                      color="emerald"
                      delta={data.totals.closing_delta}
                    />
                    <KpiCard
                      title="Omzet"
                      value={fmtRpShort(data.totals.omset)}
                      sub={data.totals.closing > 0 ? `${fmtRpShort(data.totals.omset / data.totals.closing)} / closing` : "—"}
                      color="amber"
                      delta={data.totals.omset_delta}
                      deltaUnit=" Jt"
                      sparkData={trend7Omset}
                      sparkColor="#f59e0b"
                    />
                    <KpiCard
                      title="Gross Profit"
                      value={fmtRpShort(data.totals.gross_profit)}
                      sub={data.totals.omset > 0 ? `${fmtPct((data.totals.gross_profit / data.totals.omset) * 100)} margin` : "0% margin"}
                      color="rose"
                    />
                  </div>

                  {/* Secondary KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                      title="CR Serius"
                      value={fmtPct(crSerius)}
                      sub={`${data.totals.closing} / ${data.totals.lead_serius} lead`}
                      color="sky"
                    />
                    <KpiCard
                      title="CR Masuk"
                      value={fmtPct(cr)}
                      sub={`${data.totals.closing} / ${data.totals.lead_masuk} lead`}
                      color="violet"
                    />
                    <KpiCard
                      title="Basket Size"
                      value={data.totals.closing > 0 ? fmtRpShort(data.totals.omset / data.totals.closing) : "—"}
                      sub="rata-rata per transaksi"
                      color="teal"
                    />
                    <KpiCard
                      title="Cabang Aktif"
                      value={data.staff.filter((s) => s.lead_masuk > 0).length}
                      sub={`dari ${data.staff.length} cabang terdaftar`}
                      color="orange"
                    />
                  </div>
                </div>
              )}

              {/* ═══ TAB: STAFF ACTIVITY ═══════════════════════════════════ */}
              {activeTab === "staff" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Aktivitas Cabang CS</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{formatDisplayDate(selectedDate)}</p>
                    </div>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">
                      {data.staff.length} cabang
                    </span>
                  </div>

                  {/* Summary strip */}
                  <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100">
                    {[
                      { label: "Total Lead", val: data.totals.lead_masuk },
                      { label: "Total Closing", val: data.totals.closing },
                      { label: "Omzet", val: fmtRpShort(data.totals.omset) },
                      { label: "CR Masuk", val: fmtPct(cr) },
                    ].map(({ label, val }) => (
                      <div key={label} className="px-5 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                        <p className="text-base font-bold text-slate-800 mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>

                  {data.staff.length === 0 ? (
                    <div className="flex flex-col items-center py-14 text-slate-400">
                      <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm">Belum ada aktivitas untuk tanggal ini.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {["#", "Cabang", "Kode", "Lead Masuk", "Closing", "CR"].map((h) => (
                              <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {data.staff
                            .sort((a, b) => b.closing - a.closing)
                            .map((s, i) => {
                              const staffCr = s.lead_masuk > 0 ? (s.closing / s.lead_masuk) * 100 : 0;
                              const initials = s.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                              const rankColors = ["bg-yellow-100 text-yellow-700", "bg-slate-100 text-slate-600", "bg-orange-100 text-orange-600"];
                              const rankColor = rankColors[i] ?? "bg-slate-50 text-slate-400";
                              return (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <span className={`w-6 h-6 inline-flex items-center justify-center text-[11px] font-bold rounded-md ${rankColor}`}>
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                        {initials}
                                      </div>
                                      <span className="font-semibold text-slate-800">{s.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{s.branch}</td>
                                  <td className="px-5 py-3.5 font-semibold text-slate-700">{s.lead_masuk}</td>
                                  <td className="px-5 py-3.5 font-bold text-emerald-600">{s.closing}</td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-semibold ${staffCr > 30 ? "text-emerald-600" : staffCr > 15 ? "text-amber-500" : "text-rose-500"}`}>
                                        {fmtPct(staffCr)}
                                      </span>
                                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-indigo-500 transition-all"
                                          style={{ width: `${Math.min(staffCr, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: TREND 7 HARI ═══════════════════════════════════ */}
              {activeTab === "trend" && (
                <div className="space-y-4">
                  {data.trend.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-slate-400">
                      <p className="text-sm">Belum ada data trend.</p>
                    </div>
                  ) : (
                    <>
                      {/* 4 mini charts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Lead Masuk", field: "lead_masuk" as const, color: "#6366f1", fmt: (v: number) => String(v) },
                          { label: "Closing", field: "closing" as const, color: "#10b981", fmt: (v: number) => String(v) },
                          { label: "Omzet", field: "omset" as const, color: "#f59e0b", fmt: (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(v) },
                          { label: "Gross Profit", field: "gross_profit" as const, color: "#f43f5e", fmt: (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : String(v) },
                        ].map(({ label, field, color, fmt }) => (
                          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-sm font-bold text-slate-800">{label}</span>
                              <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">7 hari</span>
                            </div>
                            <TrendBars trend={data.trend} field={field} color={color} fmt={fmt} />
                          </div>
                        ))}
                      </div>

                      {/* Detail table */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                          <h3 className="text-sm font-bold text-slate-800">Detail Harian — 7 Hari Terakhir</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                {["Tanggal", "Lead Masuk", "Closing", "CR", "Omzet", "Gross Profit"].map((h) => (
                                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {[...data.trend].reverse().map((t) => {
                                const rowCr = t.lead_masuk > 0 ? (t.closing / t.lead_masuk) * 100 : 0;
                                const isSelected = t.date === selectedDate;
                                return (
                                  <tr key={t.date} className={`transition-colors ${isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                                    <td className="px-5 py-3.5">
                                      <div className="flex items-center gap-2">
                                        {isSelected && (
                                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">
                                            {t.date === toLocalDate(new Date()) ? "HARI INI" : "DIPILIH"}
                                          </span>
                                        )}
                                        <span className="font-mono text-xs text-slate-600">{t.label}</span>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5 font-semibold text-slate-700">{t.lead_masuk}</td>
                                    <td className="px-5 py-3.5 font-bold text-emerald-600">{t.closing}</td>
                                    <td className="px-5 py-3.5">
                                      <span className={`text-xs font-semibold ${rowCr > 30 ? "text-emerald-600" : rowCr > 15 ? "text-amber-500" : "text-rose-500"}`}>
                                        {fmtPct(rowCr)}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{fmtRpShort(t.omset)}</td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{fmtRpShort(t.gross_profit)}</td>
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
            </>
          )}

          {/* Keyboard hint */}
          <p className="mt-6 text-center text-[11px] text-slate-300 font-mono">
            Gunakan ← → untuk navigasi tanggal
          </p>
        </main>
      </div>
    </div>
  );
}
