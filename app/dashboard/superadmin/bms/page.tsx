// app/dashboard/superadmin/bms/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, RefreshCw, TrendingDown, TrendingUp, Users } from "lucide-react";

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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full transition-colors duration-200 ${up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(delta)}
      {unit} vs kemarin
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 80,
    H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={parseFloat(pts[pts.length - 1].split(",")[0])}
        cy={parseFloat(pts[pts.length - 1].split(",")[1])}
        r="3"
        fill={color}
      />
    </svg>
  );
}

function KpiCard({
  title, value, sub, color, delta, deltaUnit, sparkData, sparkColor,
}: {
  title: string; value: string | number; sub?: string; color: string; delta?: number; deltaUnit?: string; sparkData?: number[]; sparkColor?: string;
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 p-4 overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-4px_rgba(124,58,237,0.1)]">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
        <p className="text-[10px] text-gray-500 tracking-wide">{title}</p>
      </div>
      <p className="text-[22px] font-bold text-gray-900 leading-none mb-1.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mb-2">{sub}</p>}
      {delta !== undefined && <DeltaBadge delta={delta} unit={deltaUnit} />}
      {sparkData && sparkData.length >= 2 && <div className="mt-3"><Sparkline data={sparkData} color={sparkColor ?? "#a78bfa"} /></div>}
    </div>
  );
}

// ─── Chart A: Conversion Funnel ─────────────────────────────────────────────────

function ConversionFunnel({
  leadMasuk,
  leadSerius,
  closing,
}: {
  leadMasuk: number;
  leadSerius: number;
  closing: number;
}) {
  if (leadMasuk === 0) return null;
  const steps = [
    { label: "Lead Masuk", value: leadMasuk, pct: 100, w: 100 },
    { label: "Lead Serius", value: leadSerius, pct: Math.round((leadSerius / leadMasuk) * 100), w: 80 },
    { label: "Closing", value: closing, pct: Math.round((closing / leadMasuk) * 100), w: 60 },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">Corong Konversi</h3>
      </div>
      <div className="space-y-2.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2.5">
            <span className="text-[10px] text-slate-500 w-[72px] shrink-0 text-right">
              {step.label}
            </span>
            <div className="flex-1 flex items-center">
              <div
                className="h-6 rounded-md relative overflow-hidden transition-all duration-500"
                style={{ width: `${step.w}%` }}
              >
                <div
                  className="absolute inset-0 bg-violet-400/15 rounded-md"
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-violet-300 to-violet-400 transition-all duration-700"
                  style={{ width: `${step.pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-violet-700 tabular-nums">
                  {step.value}
                  <span className="ml-1 font-normal text-violet-400">
                    ({step.pct}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart B: Omzet & Closing Trend Line ────────────────────────────────────────

function OmzetClosingChart({ trend }: { trend: DailyTrend[] }) {
  if (trend.length < 2) return null;
  const chartData = trend.map((t) => ({
    label: t.label,
    Omzet: t.omset,
    Closing: t.closing,
  }));
  const fmtJt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}Jt` : String(v);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">Omzet & Closing</h3>
        <span className="text-[10px] font-semibold bg-violet-50 text-violet-500 px-2 py-0.5 rounded-md ml-auto">
          7 hari
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorClosing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 11,
              boxShadow: "0 4px 12px rgba(139,92,246,0.08)",
            }}
            formatter={(v: unknown) => [fmtJt(Number(v)), ""]}
          />
          <Area type="monotone" dataKey="Omzet" stroke="#a78bfa" strokeWidth={2} fill="url(#colorOmzet)" dot={false} activeDot={{ r: 4, fill: "#a78bfa" }} />
          <Area type="monotone" dataKey="Closing" stroke="#34d399" strokeWidth={2} fill="url(#colorClosing)" dot={false} activeDot={{ r: 4, fill: "#34d399" }} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 mt-1">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" /> Omzet
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> Closing
        </span>
      </div>
    </div>
  );
}

// ─── Chart D: CR Donut Ring ────────────────────────────────────────────────────

function CRDonut({ cr, total, label }: { cr: number; total: number; label: string }) {
  if (total === 0) return null;
  const data = [
    { name: "Closing", value: cr, fill: "#a78bfa" },
    { name: "Remaining", value: Math.max(100 - cr, 0), fill: "#f1f5f9" },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)] hover:border-violet-200 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">{label}</h3>
      </div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={100}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={44}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[18px] font-bold text-violet-500 tabular-nums leading-none">
              {cr.toFixed(1)}%
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">{total} total</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chart E: Day-over-Day Waterfall ───────────────────────────────────────────

function DoDWaterfall({
  totals,
}: {
  totals: DailyTotals;
}) {
  const items = [
    { label: "Lead Masuk", today: totals.lead_masuk, delta: totals.lead_masuk_delta },
    { label: "Closing", today: totals.closing, delta: totals.closing_delta },
    { label: "Omzet", today: totals.omset, delta: totals.omset_delta, fmt: fmtRpShort },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">Perubahan vs Kemarin</h3>
      </div>
      <div className="space-y-2.5">
        {items.map(({ label, today, delta, fmt }) => {
          const yesterday = today - delta;
          const maxVal = Math.max(today, yesterday, 1);
          const up = delta >= 0;
          const barColor = up ? "#34d399" : "#fb7185";
          return (
            <div key={label} className="flex items-center gap-2.5">
              <span className="text-[10px] text-slate-500 w-[68px] shrink-0 text-right">
                {label}
              </span>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-5 bg-slate-100 rounded-md relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                    style={{ width: `${(yesterday / maxVal) * 100}%`, background: "#e2e8f0" }}
                  />
                  <div
                    className="absolute inset-y-0 rounded-md transition-all duration-500"
                    style={{
                      width: `${(Math.abs(delta) / maxVal) * 100}%`,
                      left: `${(Math.min(today, yesterday) / maxVal) * 100}%`,
                      background: barColor,
                    }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-semibold tabular-nums w-[60px] shrink-0 text-right" style={{ color: barColor }}>
                {up ? "+" : ""}{fmt ? fmt(Math.abs(delta)) : Math.abs(delta)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chart F: Branch Performance Bar Chart ─────────────────────────────────────

function BranchBars({ staff }: { staff: DailyStaffRow[] }) {
  const branches = Object.values(
    staff.reduce(
      (acc, s) => {
        const key = s.branch || "Lainnya";
        if (!acc[key]) acc[key] = { branch: key, lead_masuk: 0, closing: 0 };
        acc[key].lead_masuk += s.lead_masuk;
        acc[key].closing += s.closing;
        return acc;
      },
      {} as Record<string, { branch: string; lead_masuk: number; closing: number }>,
    ),
  ).sort((a, b) => b.closing - a.closing);
  if (branches.length === 0) return null;
  const chartData = branches.map((b) => ({
    branch: b.branch,
    "Lead Masuk": b.lead_masuk,
    Closing: b.closing,
  }));
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)] mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">Performa per Cabang</h3>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(branches.length * 36, 120)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }} barSize={14}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="branch" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 11, boxShadow: "0 4px 12px rgba(139,92,246,0.08)" }}
          />
          <Bar dataKey="Lead Masuk" fill="#c4b5fd" radius={[0, 4, 4, 0]} />
          <Bar dataKey="Closing" fill="#a78bfa" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 mt-2">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-violet-300 shrink-0" /> Lead Masuk
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-violet-400 shrink-0" /> Closing
        </span>
      </div>
    </div>
  );
}

// ─── Chart G: GP + Omzet Dual Area ──────────────────────────────────────────────

function GPOmzetDualArea({ trend }: { trend: DailyTrend[] }) {
  if (trend.length < 2) return null;
  const chartData = trend.map((t) => ({
    label: t.label,
    Omzet: t.omset,
    "Gross Profit": t.gross_profit,
  }));
  const fmtJt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}Jt` : String(v);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">Omzet & Gross Profit</h3>
        <span className="text-[10px] font-semibold bg-violet-50 text-violet-500 px-2 py-0.5 rounded-md ml-auto">7 hari</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOmzet2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorGP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 11, boxShadow: "0 4px 12px rgba(139,92,246,0.08)" }}
            formatter={(v: unknown) => [fmtJt(Number(v)), ""]}
          />
          <Area type="monotone" dataKey="Omzet" stroke="#a78bfa" strokeWidth={1.5} fill="url(#colorOmzet2)" dot={false} activeDot={{ r: 3, fill: "#a78bfa" }} />
          <Area type="monotone" dataKey="Gross Profit" stroke="#fb7185" strokeWidth={1.5} fill="url(#colorGP)" dot={false} activeDot={{ r: 3, fill: "#fb7185" }} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 mt-1">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" /> Omzet</span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" /> Gross Profit</span>
      </div>
    </div>
  );
}

// ─── Chart H: Staff Omzet Horizontal Bars ───────────────────────────────────────

function StaffOmzetBars({ staff }: { staff: DailyStaffRow[] }) {
  const top5 = [...staff].sort((a, b) => b.omset - a.omset).slice(0, 5).filter((s) => s.omset > 0);
  if (top5.length === 0) return null;
  const chartData = top5.map((s) => ({
    name: s.name.split(" ").slice(0, 2).join(" "),
    Omzet: s.omset,
  }));
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)] mt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">Top 5 Omzet</h3>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(top5.length * 36, 100)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }} barSize={18}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 11, boxShadow: "0 4px 12px rgba(139,92,246,0.08)" }}
            formatter={(v: unknown) => [fmtRpShort(Number(v)), "Omzet"]}
          />
          <Bar dataKey="Omzet" radius={[0, 6, 6, 0]}>
            {top5.map((_s, i) => (
              <Cell key={i} fill={i === 0 ? "#fbbf24" : i === 1 ? "#fcd34d" : i === 2 ? "#fde68a" : "#fef3c7"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart I: Basket Size Mini Sparkline ────────────────────────────────────────

function BasketSizeSparkline({ trend, omset, closing }: { trend: DailyTrend[]; omset: number; closing: number }) {
  const sparkData = trend.map((t) => (t.closing > 0 ? t.omset / t.closing : 0));
  if (sparkData.length < 2) return null;
  const avg = closing > 0 ? omset / closing : 0;
  const up = sparkData.length >= 2 && sparkData[sparkData.length - 1] > sparkData[sparkData.length - 2];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_1px_3px_0_rgba(139,92,246,0.04)] hover:border-violet-200 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
        <h3 className="text-[12px] font-semibold text-slate-800">Basket Size</h3>
      </div>
      <p className="text-[22px] font-bold text-slate-900 leading-none mb-1 tabular-nums">
        {fmtRpShort(avg)}
      </p>
      <p className="text-[10px] text-slate-400 mb-2">rata-rata per closing</p>
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={sparkData.map((v) => ({ v }))} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id="colorBS" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="#2dd4bf" strokeWidth={1.5} fill="url(#colorBS)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-[10px] font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
          {up ? "↑" : "↓"} trending
        </span>
      </div>
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
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "trend">(
    "overview",
  );
  const [mounted, setMounted] = useState(false);

  const { data, isLoading, refetch } = useQuery({
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

  const isToday = selectedDate === toLocalDate(new Date());

  const cr =
    data && data.totals.lead_masuk > 0
      ? (data.totals.closing / data.totals.lead_masuk) * 100
      : 0;
  const crSerius =
    data && data.totals.lead_serius > 0
      ? (data.totals.closing / data.totals.lead_serius) * 100
      : 0;

  const trend7Lead = data?.trend.map((t) => t.lead_masuk) ?? [];
  const trend7Omset = data?.trend.map((t) => t.omset) ?? [];

  if (!mounted) {
    return (
      <div className="flex h-screen" style={bgStyle}>
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="" role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data harian..." />
          </main>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Ikhtisar" },
    { key: "staff", label: "Aktivitas CS" },
    { key: "trend", label: "Tren 7 Hari" },
  ] as const;

  return (
    <div className="flex h-screen" style={bgStyle}>
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Title Banner */}
          <div className="mb-6 p-5 rounded-2xl relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #fff 60%)", border: "1px solid #e5e7eb" }}>
            <div className="absolute top-0 right-0 w-48 h-full pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at top right, #c4b5fd 0%, transparent 70%)" }} />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: "#7c3aed" }}>BMS Dashboard</p>
                <h2 className="text-[28px] font-bold leading-tight" style={{ color: "#111827" }}>Data <span style={{ color: "#7c3aed" }}>Harian</span></h2>
                {isToday && <span className="inline-block mt-2 text-[10px] font-semibold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{formatDisplayDate(selectedDate)}</span>}
              </div>
              <div className="flex items-center gap-3 sm:pb-1">
                {[
                  { label: "Lead", value: data?.totals.lead_masuk ?? 0, color: "#7c3aed" },
                  { label: "Closing", value: data?.totals.closing ?? 0, color: "#059669" },
                  { label: "Omzet", value: data ? fmtRpShort(data.totals.omset) : "—", color: "#ea580c" },
                  { label: "CR", value: `${cr.toFixed(1)}%`, color: "#6b7280" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center"><p className="text-[10px] font-medium" style={{ color: "#6b7280" }}>{label}</p><p className="text-base font-bold" style={{ color }}>{value}</p></div>
                ))}
              </div>
            </div>
          </div>

          {/* Date Navigator + Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2">
              <button title="Hari sebelumnya (←)" onClick={() => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() - 1); setSelectedDate(toLocalDate(d)); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-lg transition-all duration-150 active:scale-[0.96]">‹</button>
              <input type="date" value={selectedDate} max={toLocalDate(new Date())} onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="border-none outline-none font-medium text-sm text-gray-800 bg-transparent cursor-pointer" />
              <button title="Hari berikutnya (→)" onClick={() => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() + 1); if (d <= new Date()) setSelectedDate(toLocalDate(d)); }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all duration-150 active:scale-[0.96] ${isToday ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-gray-50 hover:bg-gray-100 text-gray-600"}`} disabled={isToday}>›</button>
              {!isToday && <button onClick={() => setSelectedDate(toLocalDate(new Date()))} className="ml-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-all duration-150 active:scale-[0.96]">Hari Ini</button>}
              <button onClick={() => refetch()} title="Refresh" className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-all duration-150 active:scale-[0.96]"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {tabs.map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-[0.97] ${activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{label}</button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12"><Loading variant="skeleton" text="Memuat data harian..." /></div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400"><BarChart3 className="w-12 h-12 mb-4 opacity-40" /><p className="text-sm">Tidak ada data untuk tanggal ini.</p></div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard title="Lead Masuk" value={data.totals.lead_masuk} sub={`${data.totals.lead_serius} lead serius`} color="#7c3aed" delta={data.totals.lead_masuk_delta} sparkData={trend7Lead} sparkColor="#a78bfa" />
                  <KpiCard title="Closing" value={data.totals.closing} sub={`CR ${fmtPct(cr)}`} color="#059669" delta={data.totals.closing_delta} />
                  <KpiCard title="Omzet" value={fmtRpShort(data.totals.omset)} sub={data.totals.closing > 0 ? `${fmtRpShort(data.totals.omset / data.totals.closing)} / closing` : "—"} color="#ea580c" delta={data.totals.omset_delta} deltaUnit=" Jt" sparkData={trend7Omset} sparkColor="#fbbf24" />
                  <KpiCard title="Gross Profit" value={fmtRpShort(data.totals.gross_profit)} sub={data.totals.omset > 0 ? `${fmtPct((data.totals.gross_profit / data.totals.omset) * 100)} margin` : "0% margin"} color="#dc2626" />
                  <div className="lg:col-span-2"><DoDWaterfall totals={data.totals} /></div>
                  <div className="lg:col-span-2"><ConversionFunnel leadMasuk={data.totals.lead_masuk} leadSerius={data.totals.lead_serius} closing={data.totals.closing} /></div>
                  <CRDonut cr={crSerius} total={data.totals.lead_serius} label="CR Serius" />
                  <BasketSizeSparkline trend={data.trend} omset={data.totals.omset} closing={data.totals.closing} />
                  <CRDonut cr={cr} total={data.totals.lead_masuk} label="CR Masuk" />
                  <KpiCard title="Cabang Aktif" value={data.staff.filter((s) => s.lead_masuk > 0).length} sub={`dari ${data.staff.length} cabang`} color="#6b7280" />
                </div>
              )}

              {activeTab === "staff" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                      <div><h3 className="text-[13px] font-semibold text-gray-800">Aktivitas Cabang CS</h3><p className="text-[10px] text-gray-500 mt-0.5">{formatDisplayDate(selectedDate)}</p></div>
                      <span className="text-[11px] font-semibold bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg">{data.staff.length} cabang</span>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-gray-100 bg-gray-50/70 border-b border-gray-100">
                      {[{ label: "Total Lead", val: data.totals.lead_masuk }, { label: "Total Closing", val: data.totals.closing }, { label: "Omzet", val: fmtRpShort(data.totals.omset) }, { label: "CR Masuk", val: fmtPct(cr) }].map(({ label, val }) => (
                        <div key={label} className="px-5 py-3"><p className="text-[10px] text-gray-500 tracking-wide">{label}</p><p className="text-base font-bold text-gray-800 mt-0.5 tabular-nums">{val}</p></div>
                      ))}
                    </div>
                    <div className="px-5 py-3"><BranchBars staff={data.staff} /><StaffOmzetBars staff={data.staff} /></div>
                    {data.staff.length === 0 ? (
                      <div className="flex flex-col items-center py-14 text-gray-400"><Users className="w-10 h-10 mb-3 opacity-40" /><p className="text-sm">Belum ada aktivitas untuk tanggal ini.</p></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50/70"><tr>{["#", "Cabang", "Kode", "Lead Masuk", "Closing", "CR"].map((h) => <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 tracking-wide">{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-gray-50">
                            {data.staff.sort((a, b) => b.closing - a.closing).map((s, i) => {
                              const sc = s.lead_masuk > 0 ? (s.closing / s.lead_masuk) * 100 : 0;
                              const inits = s.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                              return (<tr key={s.id} className="hover:bg-gray-50/70 transition-colors"><td className="px-5 py-3.5"><span className={`w-6 h-6 inline-flex items-center justify-center text-[11px] font-bold rounded-md ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-400"}`}>{i + 1}</span></td>
                                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{inits}</div><span className="font-semibold text-gray-800">{s.name}</span></div></td>
                                <td className="px-5 py-3.5 text-xs text-gray-500">{s.branch}</td><td className="px-5 py-3.5 font-semibold text-gray-700 tabular-nums">{s.lead_masuk}</td>
                                <td className="px-5 py-3.5 font-bold text-emerald-600 tabular-nums">{s.closing}</td>
                                <td className="px-5 py-3.5"><div className="flex items-center gap-2"><span className={`text-xs font-semibold tabular-nums ${sc > 30 ? "text-emerald-600" : sc > 15 ? "text-amber-500" : "text-red-500"}`}>{fmtPct(sc)}</span><div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-purple-400 transition-all duration-500" style={{ width: `${Math.min(sc, 100)}%` }} /></div></div></td></tr>);
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "trend" && (
                <div className="space-y-4">
                  {data.trend.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-gray-400"><p className="text-sm">Belum ada data tren.</p></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <OmzetClosingChart trend={data.trend} />
                        <GPOmzetDualArea trend={data.trend} />
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100"><h3 className="text-[13px] font-semibold text-gray-800">Detail Harian — 7 Hari Terakhir</h3></div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50/70"><tr>{["Tanggal", "Lead Masuk", "Closing", "CR", "Omzet", "Gross Profit"].map((h) => <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 tracking-wide">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-50">
                              {[...data.trend].reverse().map((t) => {
                                const rc = t.lead_masuk > 0 ? (t.closing / t.lead_masuk) * 100 : 0;
                                const isSel = t.date === selectedDate;
                                return (<tr key={t.date} className={`transition-colors ${isSel ? "bg-purple-50/60" : "hover:bg-gray-50"}`}><td className="px-5 py-3.5"><div className="flex items-center gap-2">{isSel && <span className="text-[10px] font-semibold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">{t.date === toLocalDate(new Date()) ? "Hari ini" : "Dipilih"}</span>}<span className="text-xs text-gray-600">{t.label}</span></div></td>
                                  <td className="px-5 py-3.5 font-semibold text-gray-700 tabular-nums">{t.lead_masuk}</td><td className="px-5 py-3.5 font-bold text-emerald-600 tabular-nums">{t.closing}</td>
                                  <td className="px-5 py-3.5"><span className={`text-xs font-semibold tabular-nums ${rc > 30 ? "text-emerald-600" : rc > 15 ? "text-amber-500" : "text-red-500"}`}>{fmtPct(rc)}</span></td>
                                  <td className="px-5 py-3.5 text-xs text-gray-700 tabular-nums">{fmtRpShort(t.omset)}</td><td className="px-5 py-3.5 text-xs text-gray-700 tabular-nums">{fmtRpShort(t.gross_profit)}</td></tr>);
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

          <p className="mt-5 text-center text-[10px] text-gray-300 pb-2">Gunakan ← → untuk navigasi tanggal</p>
        </main>
      </div>
    </div>
  );
}
