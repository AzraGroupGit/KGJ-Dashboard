// app/dashboard/superadmin/bms/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, BarChart3, ExternalLink, Sparkles, Star, TrendingUp, Zap } from "lucide-react";

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

const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── Animated Value Hook ───────────────────────────────────────────────────────

function useAnimatedValue(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => { if (target <= 0) { setValue(0); return; } const start = performance.now(); let raf: number; function tick(now: number) { const p = Math.min((now - start) / duration, 1); setValue(Math.round(target * (1 - Math.pow(1 - p, 4)))); if (p < 1) raf = requestAnimationFrame(tick); } raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [target, duration]); return value;
}

// ─── Color Tokens ──────────────────────────────────────────────────────────────

const P = { purple: "#7c3aed", purpleLight: "#f5f3ff", purpleMuted: "#c4b5fd", green: "#059669", greenLight: "#ecfdf5", greenMuted: "#a7f3d0", gray: "#6b7280", grayLight: "#f9fafb", grayBorder: "#e5e7eb", orange: "#ea580c", orangeLight: "#fff7ed", blue: "#3b82f6", blueLight: "#eff6ff", red: "#dc2626", redLight: "#fef2f2", ink: "#111827", card: "#fff" };

// ─── 1. Hero Banner ────────────────────────────────────────────────────────────

function HeroBanner({ rate, done, total, delta, href }: { rate: number; done: number; total: number; delta: number; href: string }) {
  const animated = useAnimatedValue(rate);
  const up = delta >= 0;
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${P.purple} 0%, #5b21b6 100%)` }}>
      <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-20" style={{ background: `radial-gradient(circle, #fff 0%, transparent 70%)` }} />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><span className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs" style={{ background: "rgba(255,255,255,0.2)" }}><Sparkles size={14} /></span><p className="text-sm font-semibold text-white/80">Completion Rate</p></div>
          <p className="text-[56px] font-bold leading-none text-white">{animated}%</p>
          <p className="text-sm mt-1 text-white/60">{done} dari {total} items selesai</p>
          <div className="h-2 rounded-full mt-3 overflow-hidden w-full max-w-[300px]" style={{ background: "rgba(255,255,255,0.2)" }}><div className="h-full rounded-full bg-white/60 transition-all duration-700" style={{ width: `${Math.min(rate, 100)}%` }} /></div>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${up ? "bg-green-400/20 text-green-200" : "bg-red-400/20 text-red-200"}`}>{up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta)}% vs kemarin</span>
          <a href={href} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold bg-white text-purple-700 transition-all duration-150 active:scale-[0.96] hover:bg-white/90">View Details <ArrowUpRight size={14} /></a>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Stat Cluster ───────────────────────────────────────────────────────────

function StatCluster({ items }: { items: { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string }[] }) {
  return (
    <div className="rounded-2xl p-4 grid grid-cols-2 gap-3" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      {items.map(({ label, value, icon, color, bg }) => (
        <div key={label} className="rounded-xl p-3" style={{ background: bg }}>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs mb-2" style={{ background: color, color: "#fff" }}>{icon}</span>
          <p className="text-[10px] font-medium" style={{ color: P.gray }}>{label}</p>
          <p className="text-lg font-bold" style={{ color: P.ink }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── 3. Breakdown List Card ────────────────────────────────────────────────────

function BreakdownList({ items, title, viewAllHref }: { items: { name: string; sub: string; value: string; growth?: number; color: string }[]; title: string; viewAllHref: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <div className="flex items-center justify-between mb-3"><h3 className="text-[13px] font-semibold" style={{ color: P.ink }}>{title}</h3><a href={viewAllHref} className="text-[10px] font-semibold" style={{ color: P.purple }}>View All</a></div>
      <div className="space-y-3">
        {items.map(({ name, sub, value, growth, color }) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: color }}>{name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}</span>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: P.ink }}>{name}</p><p className="text-[10px]" style={{ color: P.gray }}>{sub}</p></div>
            <div className="text-right shrink-0"><p className="text-sm font-bold" style={{ color: P.ink }}>{value}</p>{growth !== undefined && <span className={`text-[10px] font-semibold ${growth >= 0 ? "text-green-600" : "text-red-500"}`}>{growth >= 0 ? "+" : ""}{growth}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 4. Mini Stat + Sparkline ─────────────────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null; const max = Math.max(...data, 1), min = Math.min(...data), r = max - min || 1, W = 100, H = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / r) * H}`);
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}><polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
}

function MiniStatCard({ title, value, sub, sparkData, sparkColor, barMax, barVal, barColor }: { title: string; value: string | number; sub?: string; sparkData?: number[]; sparkColor?: string; barMax?: number; barVal?: number; barColor?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <p className="text-[10px] font-medium mb-1" style={{ color: P.gray }}>{title}</p>
      <p className="text-xl font-bold mb-1" style={{ color: P.ink }}>{value}</p>
      {sub && <p className="text-[10px] mb-2" style={{ color: P.gray }}>{sub}</p>}
      {sparkData && <div className="mb-2"><MiniSparkline data={sparkData} color={sparkColor ?? P.purple} /></div>}
      {barMax !== undefined && barVal !== undefined && (
        <div className="space-y-1">
          {[...Array(barMax)].map((_, i) => <div key={i} className="h-1 rounded-full" style={{ background: i < barVal ? (barColor ?? P.purple) : P.grayBorder }} />)}
        </div>
      )}
    </div>
  );
}

// ─── 5. Donut Card ─────────────────────────────────────────────────────────────

function DonutCard({ pct, total, label }: { pct: number; total: number; label: string }) {
  const d = [{ v: Math.min(pct, 100), c: P.green }, { v: Math.max(100 - pct, 0), c: P.grayBorder }];
  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: P.ink }}>{label}</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={d} cx="50%" cy="50%" innerRadius={38} outerRadius={55} dataKey="v" stroke="none" startAngle={90} endAngle={-270}>{d.map((x, i) => <Cell key={i} fill={x.c} />)}</Pie></PieChart></ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-2xl font-bold" style={{ color: P.green }}>{pct.toFixed(1)}%</p></div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-1"><span className="flex items-center gap-1.5 text-[10px]" style={{ color: P.gray }}><span className="w-2 h-2 rounded-full" style={{ background: P.green }} /> Closing</span><span className="text-[10px] font-semibold" style={{ color: P.ink }}>{total} total</span></div>
    </div>
  );
}

// ─── 6. Area Chart Card ────────────────────────────────────────────────────────

function AreaCard({ data, dataKey, label, color }: { data: { label: string; [k: string]: number | string }[]; dataKey: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <h3 className="text-[13px] font-semibold mb-2" style={{ color: P.ink }}>{label}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: -16, bottom: 0 }}>
          <defs><linearGradient id={`gfa_${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: P.gray }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${P.grayBorder}`, borderRadius: 12, fontSize: 11 }} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#gfa_${dataKey})`} dot={false} activeDot={{ r: 4, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 7. Highlighted Bar Chart ──────────────────────────────────────────────────

function HighlightedBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: P.ink }}>Top Performers</h3>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 28, 120)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }} barSize={14}>
          <XAxis type="number" hide /><YAxis dataKey="name" tick={{ fontSize: 10, fill: P.gray }} axisLine={false} tickLine={false} width={70} type="category" />
          <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${P.grayBorder}`, borderRadius: 12, fontSize: 11 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>{data.map((_, i) => <Cell key={i} fill={i === 0 ? P.purple : P.purpleMuted} opacity={i === 0 ? 1 : 0.5} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 8. Radar Chart ────────────────────────────────────────────────────────────

function RadarPerformance({ today, max }: { today: number[]; max: number[] }) {
  const axes = ["Lead", "Closing", "Omzet", "Gross Profit"];
  const data = [axes.map((axis, i) => ({ axis, value: max[i] > 0 ? Math.round((today[i] / max[i]) * 100) : 0 }))];
  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <h3 className="text-[13px] font-semibold mb-2" style={{ color: P.ink }}>Performance Radar</h3>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data[0]} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke={P.grayBorder} />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: P.gray }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${P.grayBorder}`, borderRadius: 12, fontSize: 11 }} />
          <Radar dataKey="value" stroke={P.purple} fill={P.purple} fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 9. Two-Column List ────────────────────────────────────────────────────────

function TwoColumnList({ items }: { items: { name: string; sub: string; value: string; positive: boolean }[] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: P.ink }}>Cabang Overview</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {items.map(({ name, sub, value, positive }) => (
          <div key={name} className="flex items-center gap-2">
            <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate" style={{ color: P.ink }}>{name}</p><p className="text-[10px]" style={{ color: P.gray }}>{sub}</p></div>
            <span className={`text-xs font-semibold shrink-0 ${positive ? "text-green-600" : "text-red-500"}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 10. Activity Timeline ─────────────────────────────────────────────────────

function ActivityTimeline({ items }: { items: { name: string; time: string; status: "done" | "pending" }[] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.grayBorder}` }}>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: P.ink }}>Recent Activity</h3>
      <div className="space-y-0 relative max-h-[200px] overflow-y-auto">
        <div className="absolute left-[6px] top-2 bottom-2 w-px" style={{ background: P.grayBorder }} />
        {items.map(({ name, time, status }) => (
          <div key={name + time} className="flex items-start gap-3 py-1.5 relative">
            <span className="w-[13px] h-[13px] rounded-full shrink-0 mt-0.5 z-10 border-2" style={{ background: "#fff", borderColor: status === "done" ? P.green : P.grayBorder }} />
            <div className="flex-1 min-w-0"><p className="text-xs font-medium" style={{ color: P.ink }}>{name}</p></div>
            <span className="text-[10px] shrink-0 mt-0.5" style={{ color: P.gray }}>{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 11. CTA Card ──────────────────────────────────────────────────────────────

function CTACard({ title, desc, href, label }: { title: string; desc: string; href: string; label: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${P.purple}, #5b21b6)` }}>
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-20" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
      <div className="relative"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl mb-3 text-white font-bold" style={{ background: "rgba(255,255,255,0.2)" }}><Zap size={16} /></span><p className="text-sm font-semibold text-white/90">{title}</p><p className="text-xs mt-0.5 text-white/60">{desc}</p></div>
      <a href={href} className="relative inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold bg-white text-purple-700 transition-all duration-150 active:scale-[0.96] mt-3 self-start">{label} <ExternalLink size={14} /></a>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyAnalysisPage() {
  const [clientUser] = useState<ClientUser | null>(() => {
    if (typeof window === "undefined") return null;
    return getClientUser();
  });
  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date()));
  const [mounted, setMounted] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["daily-stats", selectedDate],
    queryFn: () => fetcher<DailyData>(`/api/daily-stats-1?date=${selectedDate}`),
  });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!clientUser) return;
  }, [clientUser]);

  const bgStyle = {
    background:
      "#f8f9fb url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='0.75' fill='rgba(139,92,246,0.06)'/%3E%3C/svg%3E\") repeat",
  };

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

  const cr =
    data && data.totals.lead_masuk > 0
      ? (data.totals.closing / data.totals.lead_masuk) * 100
      : 0;

  const trend7Lead = data?.trend.map((t) => t.lead_masuk) ?? [];
  const trend7Closing = data?.trend.map((t) => t.closing) ?? [];

  const overallRate = data && data.totals.lead_masuk > 0 ? Math.round((data.totals.closing / data.totals.lead_masuk) * 100) : 0;
  const todayMetrics = data ? [data.totals.lead_masuk, data.totals.closing, data.totals.omset, data.totals.gross_profit] : [0, 0, 0, 0];
  const max7Metrics = data?.trend.length ? [
    Math.max(...data.trend.map((t) => t.lead_masuk), 1),
    Math.max(...data.trend.map((t) => t.closing), 1),
    Math.max(...data.trend.map((t) => t.omset), 1),
    Math.max(...data.trend.map((t) => t.gross_profit), 1),
  ] : [1, 1, 1, 1];

  const omzetArea = data?.trend.map((t) => ({ label: t.label, Omzet: t.omset })) ?? [];

  const topBars = data ? [...data.staff].sort((a, b) => b.closing - a.closing).slice(0, 7).map((s) => ({ name: s.name.split(" ").slice(0, 2).join(" "), value: s.closing })) : [];

  const breakdownList = data ? [...data.staff].sort((a, b) => b.closing - a.closing).slice(0, 4).map((s) => ({ name: s.name, sub: s.branch, value: fmtRpShort(s.omset), growth: s.closing - Math.round(data.staff.reduce((sum, x) => sum + x.closing, 0) / (data.staff.length || 1)), color: "#7c3aed" })) : [];

  const twoColumnItems = data ? data.staff.filter((s) => s.lead_masuk > 0).slice(0, 6).map((s) => ({ name: s.name, sub: s.branch, value: s.closing > 0 ? `+${s.closing}` : "0", positive: s.closing > 0 })) : [];

  const timeline = data ? data.staff.filter((s) => s.closing > 0 || s.lead_masuk > 0).slice(0, 5).map((s) => ({ name: s.name, time: `${s.closing} closing · ${s.lead_masuk} lead`, status: (s.closing > 0 ? "done" : "pending") as "done" | "pending" })) : [];

  if (!mounted) {
    return (
      <div className="flex h-screen" style={bgStyle}>
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="" role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-4 h-[140px] rounded-2xl bg-white/60 animate-pulse" />
              <div className="lg:col-span-4 h-[100px] rounded-2xl bg-white/60 animate-pulse" />
              <div className="lg:col-span-2 h-[200px] rounded-2xl bg-white/60 animate-pulse" />
              <div className="lg:col-span-2 h-[200px] rounded-2xl bg-white/60 animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const avgClosing = data ? Math.round(data.staff.reduce((s, x) => s + x.closing, 0) / (data.staff.length || 1)) : 0;

  return (
    <div className="flex h-screen" style={bgStyle}>
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">

          {isLoading ? <div className="p-12"><Loading variant="skeleton" text="Memuat data harian..." /></div> : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertTriangle className="w-12 h-12 mb-4" style={{ color: P.red }} />
              <p className="text-sm font-medium mb-1" style={{ color: P.red }}>Gagal memuat data</p>
              <p className="text-xs mb-4 text-gray-500">{error instanceof Error ? error.message : "Koneksi gagal"}</p>
              <button onClick={() => window.location.reload()} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: P.purple }}>Coba Lagi</button>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400"><BarChart3 className="w-12 h-12 mb-4 opacity-40" /><p className="text-sm">Tidak ada data untuk tanggal ini.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Row 1: Hero Banner + Stat Cluster */}
              <div className="lg:col-span-4"><HeroBanner rate={overallRate} done={data.totals.closing} total={data.totals.lead_masuk} delta={data.totals.omset_delta} href="/dashboard/superadmin/bms/statistik" /></div>
              <div className="lg:col-span-4"><StatCluster items={[
                { label: "Lead Masuk", value: data.totals.lead_masuk, icon: <Sparkles size={14} />, color: P.purple, bg: P.purpleLight },
                { label: "Closing", value: data.totals.closing, icon: <Star size={14} />, color: P.green, bg: P.greenLight },
                { label: "Omzet", value: fmtRpShort(data.totals.omset), icon: <Zap size={14} />, color: P.orange, bg: P.orangeLight },
                { label: "Gross Profit", value: fmtRpShort(data.totals.gross_profit), icon: <TrendingUp size={14} />, color: P.blue, bg: P.blueLight },
              ]} /></div>

              {/* Row 2: Breakdown List + Mini Stats */}
              <div className="lg:col-span-2"><BreakdownList title="Top Branches" items={breakdownList} viewAllHref="#" /></div>
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 gap-3">
                  <MiniStatCard title="Lead Trend" value={data.totals.lead_masuk} sub={`${data.totals.lead_masuk_delta >= 0 ? "+" : ""}${data.totals.lead_masuk_delta} vs kemarin`} sparkData={trend7Lead} sparkColor={P.purple} />
                  <MiniStatCard title="Closing Trend" value={data.totals.closing} sub={`${data.totals.closing_delta >= 0 ? "+" : ""}${data.totals.closing_delta} vs kemarin`} sparkData={trend7Closing} sparkColor={P.green} barMax={Math.max(data.totals.closing_delta + avgClosing, 1)} barVal={avgClosing} barColor={P.green} />
                </div>
              </div>

              {/* Row 3: Donut + Area Chart */}
              <div className="lg:col-span-2"><DonutCard pct={cr} total={data.totals.lead_masuk} label="Conversion Rate" /></div>
              <div className="lg:col-span-2"><AreaCard data={omzetArea} dataKey="Omzet" label="Omzet Trend" color={P.purple} /></div>

              {/* Row 4: Radar + Highlighted Bar */}
              <div className="lg:col-span-2"><RadarPerformance today={todayMetrics} max={max7Metrics} /></div>
              <div className="lg:col-span-2"><HighlightedBar data={topBars} /></div>

              {/* Row 5: Two-Column + Timeline + CTA */}
              <div className="lg:col-span-2"><TwoColumnList items={twoColumnItems} /></div>
              <div className="lg:col-span-1"><ActivityTimeline items={timeline} /></div>
              <div className="lg:col-span-1"><CTACard title="Lihat Laporan" desc="Analisis lengkap di halaman statistik" href="/dashboard/superadmin/bms/statistik" label="Buka Statistik" /></div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
