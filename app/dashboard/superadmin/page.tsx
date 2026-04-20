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
  date: string; // "YYYY-MM-DD"
  label: string; // "Sen 14", "Sel 15", etc.
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
  // vs yesterday
  lead_masuk_delta: number;
  closing_delta: number;
  omset_delta: number;
}

interface DailyData {
  date: string;
  totals: DailyTotals;
  staff: DailyStaffRow[];
  trend: DailyTrend[]; // last 7 days
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmtRpShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
};

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDisplayDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta, unit = "" }: { delta: number; unit?: string }) {
  if (delta === 0) return <span className="daily-delta neutral">= sama</span>;
  const up = delta > 0;
  return (
    <span className={`daily-delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(delta)}
      {unit} vs kemarin
    </span>
  );
}

// ─── Tiny sparkline (SVG) ─────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
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
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block" }}
    >
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

// ─── Mini bar chart (7-day trend) ─────────────────────────────────────────────

function TrendBars({
  trend,
  field,
  color,
  fmt,
}: {
  trend: DailyTrend[];
  field: keyof DailyTrend;
  color: string;
  fmt: (v: number) => string;
}) {
  const vals = trend.map((t) => Number(t[field]));
  const max = Math.max(...vals, 1);
  return (
    <div className="trend-bars">
      {trend.map((t, i) => {
        const h = Math.max((vals[i] / max) * 100, 4);
        const isLast = i === trend.length - 1;
        return (
          <div key={t.date} className="trend-bar-col">
            <div className="trend-bar-value">{fmt(vals[i])}</div>
            <div className="trend-bar-wrap">
              <div
                className="trend-bar-fill"
                style={{
                  height: `${h}%`,
                  background: isLast ? color : `${color}55`,
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
            <div className={`trend-bar-label ${isLast ? "today" : ""}`}>
              {t.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyAnalysisPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date()));
  const [data, setData] = useState<DailyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "trend">(
    "overview",
  );

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

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

  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  const crSerius =
    data && data.totals.lead_serius > 0
      ? (data.totals.closing / data.totals.lead_serius) * 100
      : 0;

  const trend7Lead = data?.trend.map((t) => t.lead_masuk) ?? [];
  const trend7Omset = data?.trend.map((t) => t.omset) ?? [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700&family=JetBrains+Mono:wght@300;400;500&display=swap');

        .daily-root { font-family: 'Bricolage Grotesque', sans-serif; }

        /* ── Page header ── */
        .daily-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .daily-title {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.03em;
          margin-bottom: 4px;
        }
        .daily-subtitle {
          font-size: 13px;
          color: #94a3b8;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 300;
        }

        /* ── Date picker + nav ── */
        .date-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 8px 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .date-nav-btn {
          width: 32px; height: 32px;
          border: none;
          background: #f1f5f9;
          border-radius: 8px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #475569;
          font-size: 16px;
          transition: background .15s;
        }
        .date-nav-btn:hover { background: #e2e8f0; }
        .date-input {
          border: none;
          outline: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          background: transparent;
          cursor: pointer;
        }
        .today-btn {
          padding: 6px 12px;
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Bricolage Grotesque', sans-serif;
          cursor: pointer;
          transition: background .15s;
        }
        .today-btn:hover { background: #4f46e5; }

        /* ── Tabs ── */
        .daily-tabs {
          display: flex;
          gap: 4px;
          background: #f1f5f9;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          width: fit-content;
        }
        .daily-tab {
          padding: 8px 20px;
          border: none;
          background: transparent;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Bricolage Grotesque', sans-serif;
          color: #64748b;
          cursor: pointer;
          transition: all .2s;
        }
        .daily-tab.active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 1px 4px rgba(0,0,0,.1);
        }

        /* ── KPI cards ── */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (min-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr); }
          .kpi-grid-2 { grid-template-columns: repeat(4, 1fr); }
        }
        .kpi-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }

        .kpi-card {
          background: #fff;
          border-radius: 16px;
          padding: 18px 20px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
          position: relative;
          overflow: hidden;
          animation: fadeSlideUp .4s both;
        }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          border-radius: 16px 16px 0 0;
        }
        .kpi-card.blue::before { background: #6366f1; }
        .kpi-card.green::before { background: #10b981; }
        .kpi-card.amber::before { background: #f59e0b; }
        .kpi-card.rose::before { background: #f43f5e; }
        .kpi-card.sky::before { background: #0ea5e9; }
        .kpi-card.violet::before { background: #8b5cf6; }
        .kpi-card.teal::before { background: #14b8a6; }
        .kpi-card.orange::before { background: #f97316; }

        .kpi-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .kpi-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px;
        }
        .kpi-icon.blue { background: #eef2ff; }
        .kpi-icon.green { background: #ecfdf5; }
        .kpi-icon.amber { background: #fffbeb; }
        .kpi-icon.rose { background: #fff1f2; }
        .kpi-icon.sky { background: #f0f9ff; }
        .kpi-icon.violet { background: #f5f3ff; }
        .kpi-icon.teal { background: #f0fdfa; }
        .kpi-icon.orange { background: #fff7ed; }

        .kpi-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .kpi-sub {
          font-size: 11px;
          color: #94a3b8;
          font-family: 'JetBrains Mono', monospace;
        }

        /* ── Delta badge ── */
        .daily-delta {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 500;
          padding: 2px 7px;
          border-radius: 100px;
          margin-top: 6px;
        }
        .daily-delta.up { background: #ecfdf5; color: #059669; }
        .daily-delta.down { background: #fff1f2; color: #e11d48; }
        .daily-delta.neutral { background: #f1f5f9; color: #64748b; }

        /* ── Trend section ── */
        .trend-section {
          background: #fff;
          border-radius: 18px;
          padding: 22px 24px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
          margin-bottom: 20px;
        }
        .trend-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .trend-chip {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #64748b;
          font-family: 'JetBrains Mono', monospace;
        }

        .trend-bars {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 120px;
        }
        .trend-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          gap: 4px;
        }
        .trend-bar-value {
          font-size: 9px;
          font-family: 'JetBrains Mono', monospace;
          color: #94a3b8;
          text-align: center;
          height: 16px;
          display: flex;
          align-items: center;
        }
        .trend-bar-wrap {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
        }
        .trend-bar-fill {
          width: 100%;
          min-height: 4px;
          transition: height .4s ease;
        }
        .trend-bar-label {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: #94a3b8;
          text-align: center;
          white-space: nowrap;
        }
        .trend-bar-label.today {
          color: #6366f1;
          font-weight: 600;
        }

        .trend-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .trend-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
        }

        /* ── Staff table ── */
        .staff-section {
          background: #fff;
          border-radius: 18px;
          padding: 22px 24px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
          margin-bottom: 20px;
          overflow-x: auto;
        }
        .staff-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .staff-table th {
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .07em;
          color: #94a3b8;
          padding: 0 12px 12px 0;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
        }
        .staff-table td {
          padding: 12px 12px 12px 0;
          border-bottom: 1px solid #f8fafc;
          color: #334155;
          vertical-align: middle;
        }
        .staff-table tr:last-child td { border-bottom: none; }
        .staff-table tr:hover td { background: #f8fafc; }

        .staff-avatar {
          width: 32px; height: 32px;
          border-radius: 10px;
          background: #eef2ff;
          color: #6366f1;
          font-size: 12px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .staff-name-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .staff-name { font-weight: 600; color: #0f172a; font-size: 13px; }
        .staff-branch { font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }

        .staff-cr {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .staff-cr-bar {
          height: 5px;
          width: 60px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }
        .staff-cr-fill {
          height: 100%;
          border-radius: 3px;
          background: #6366f1;
          transition: width .4s ease;
        }

        .rank-badge {
          width: 22px; height: 22px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }
        .rank-badge.r1 { background: #fef9c3; color: #ca8a04; }
        .rank-badge.r2 { background: #f1f5f9; color: #475569; }
        .rank-badge.r3 { background: #fff7ed; color: #c2410c; }
        .rank-badge.rn { background: #f8fafc; color: #94a3b8; }

        .activity-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 5px;
        }
        .activity-dot.active { background: #10b981; box-shadow: 0 0 0 2px #d1fae5; }
        .activity-dot.idle { background: #f59e0b; }
        .activity-dot.offline { background: #e2e8f0; }

        /* ── Summary row ── */
        .summary-bar {
          display: flex;
          gap: 12px;
          padding: 14px 18px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 100px;
        }
        .summary-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
        .summary-val { font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }

        /* ── Animations ── */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kpi-card:nth-child(1) { animation-delay: .05s; }
        .kpi-card:nth-child(2) { animation-delay: .10s; }
        .kpi-card:nth-child(3) { animation-delay: .15s; }
        .kpi-card:nth-child(4) { animation-delay: .20s; }

        .empty-state {
          text-align: center;
          padding: 48px;
          color: #94a3b8;
          font-size: 14px;
        }
        .empty-state-icon { font-size: 36px; margin-bottom: 12px; }
      `}</style>

      <div className="flex h-screen bg-gray-50 daily-root">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            {/* ── Page header ── */}
            <div className="daily-page-header">
              <div>
                <h1 className="da-title">
                  Data <em>Hari Ini</em>
                </h1>
                <p className="daily-subtitle">
                  {selectedDate ? formatDisplayDate(selectedDate) : "—"}
                </p>
              </div>

              {/* Date picker + nav */}
              <div className="date-nav">
                <button
                  className="date-nav-btn"
                  title="Hari sebelumnya"
                  onClick={() => {
                    const d = new Date(selectedDate + "T00:00:00");
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(toLocalDate(d));
                  }}
                >
                  ‹
                </button>
                <input
                  type="date"
                  className="date-input"
                  value={selectedDate}
                  max={toLocalDate(new Date())}
                  onChange={(e) =>
                    e.target.value && setSelectedDate(e.target.value)
                  }
                />
                <button
                  className="date-nav-btn"
                  title="Hari berikutnya"
                  onClick={() => {
                    const d = new Date(selectedDate + "T00:00:00");
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate());
                    d.setDate(d.getDate() + 1);
                    if (d <= new Date()) setSelectedDate(toLocalDate(d));
                  }}
                >
                  ›
                </button>
                <button
                  className="today-btn"
                  onClick={() => setSelectedDate(toLocalDate(new Date()))}
                >
                  Hari Ini
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="daily-tabs">
              {(["overview", "staff", "trend"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`daily-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "overview" && "Overview"}
                  {tab === "staff" && "Aktivitas CS"}
                  {tab === "trend" && "Trend 7 Hari"}
                </button>
              ))}
            </div>

            {isLoading ? (
              <Loading variant="skeleton" text="Memuat data harian..." />
            ) : !data ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>Tidak ada data untuk tanggal ini.</p>
              </div>
            ) : (
              <>
                {/* ═══ TAB: OVERVIEW ═══════════════════════════════════════ */}
                {activeTab === "overview" && (
                  <>
                    {/* Row 1: Primary KPIs */}
                    <div className="kpi-grid">
                      <div className="kpi-card blue">
                        <div className="kpi-top">
                          <div>
                            <div className="kpi-label">Lead Masuk</div>
                            <div className="kpi-value">
                              {data.totals.lead_masuk}
                            </div>
                          </div>
                        </div>
                        <div className="kpi-sub">
                          {data.totals.lead_serius} lead serius
                        </div>
                        <div>
                          <DeltaBadge delta={data.totals.lead_masuk_delta} />
                        </div>
                        <Sparkline data={trend7Lead} color="#6366f1" />
                      </div>

                      <div className="kpi-card green">
                        <div className="kpi-top">
                          <div>
                            <div className="kpi-label">Closing</div>
                            <div className="kpi-value">
                              {data.totals.closing}
                            </div>
                          </div>
                        </div>
                        <div className="kpi-sub">
                          {fmtPct(crSerius)} CR serius
                        </div>
                        <div>
                          <DeltaBadge delta={data.totals.closing_delta} />
                        </div>
                      </div>

                      <div className="kpi-card amber">
                        <div className="kpi-top">
                          <div>
                            <div className="kpi-label">Omzet</div>
                            <div className="kpi-value">
                              {fmtRpShort(data.totals.omset)}
                            </div>
                          </div>
                        </div>
                        <div className="kpi-sub">
                          {data.totals.closing > 0
                            ? fmtRpShort(
                                data.totals.omset / data.totals.closing,
                              )
                            : "—"}{" "}
                          / closing
                        </div>
                        <div>
                          <DeltaBadge
                            delta={data.totals.omset_delta}
                            unit=" Jt"
                          />
                        </div>
                        <Sparkline data={trend7Omset} color="#f59e0b" />
                      </div>

                      <div className="kpi-card rose">
                        <div className="kpi-top">
                          <div>
                            <div className="kpi-label">Gross Profit</div>
                            <div className="kpi-value">
                              {fmtRpShort(data.totals.gross_profit)}
                            </div>
                          </div>
                        </div>
                        <div className="kpi-sub">
                          {data.totals.omset > 0
                            ? fmtPct(
                                (data.totals.gross_profit / data.totals.omset) *
                                  100,
                              )
                            : "0%"}{" "}
                          margin
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Secondary KPIs */}
                    <div className="kpi-grid-2">
                      <div className="kpi-card sky">
                        <div className="kpi-top">
                          <div>
                            <div className="kpi-label">CR Serius</div>
                            <div className="kpi-value">{fmtPct(crSerius)}</div>
                          </div>
                        </div>
                        <div className="kpi-sub">
                          {data.totals.closing} / {data.totals.lead_serius} lead
                        </div>
                      </div>

                      <div className="kpi-card violet">
                        <div className="kpi-top">
                          <div>
                            <div className="kpi-label">Basket Size</div>
                            <div className="kpi-value">
                              {data.totals.closing > 0
                                ? fmtRpShort(
                                    data.totals.omset / data.totals.closing,
                                  )
                                : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="kpi-sub">rata-rata per transaksi</div>
                      </div>

                      <div className="kpi-card teal">
                        <div className="kpi-top">
                          <div>
                            <div className="kpi-label">Total Staff Aktif</div>
                            <div className="kpi-value">
                              {
                                data.staff.filter((s) => s.lead_masuk > 0)
                                  .length
                              }
                            </div>
                          </div>
                        </div>
                        <div className="kpi-sub">
                          dari {data.staff.length} CS terdaftar
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ═══ TAB: STAFF ACTIVITY ═══════════════════════════════ */}
                {activeTab === "staff" && (
                  <div className="staff-section">
                    <div className="trend-section-title">
                      Aktivitas CS/Staff
                      <span className="trend-chip">
                        {formatDisplayDate(selectedDate)}
                      </span>
                    </div>

                    {/* Summary bar */}
                    <div className="summary-bar">
                      <div className="summary-item">
                        <span className="summary-label">Total Lead</span>
                        <span className="summary-val">
                          {data.totals.lead_masuk}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Total Closing</span>
                        <span className="summary-val">
                          {data.totals.closing}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Total Omzet</span>
                        <span className="summary-val">
                          {fmtRpShort(data.totals.omset)}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Avg CR</span>
                        <span className="summary-val">{fmtPct(crSerius)}</span>
                      </div>
                    </div>

                    {data.staff.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">👤</div>
                        <p>Belum ada aktivitas staff untuk tanggal ini.</p>
                      </div>
                    ) : (
                      <table className="staff-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Staff</th>
                            <th>Lead Masuk</th>
                            <th>Lead Serius</th>
                            <th>Closing</th>
                            <th>CR</th>
                            <th>Omzet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.staff
                            .sort((a, b) => b.closing - a.closing)
                            .map((s, i) => {
                              const cr =
                                s.lead_serius > 0
                                  ? (s.closing / s.lead_serius) * 100
                                  : 0;
                              const initials = s.name
                                .split(" ")
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase();
                              const rankClass =
                                i === 0
                                  ? "r1"
                                  : i === 1
                                    ? "r2"
                                    : i === 2
                                      ? "r3"
                                      : "rn";

                              // Determine activity status from last_activity timestamp

                              return (
                                <tr key={s.id}>
                                  <td>
                                    <span className={`rank-badge ${rankClass}`}>
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="staff-name-wrap">
                                      <div className="staff-avatar">
                                        {initials}
                                      </div>
                                      <div>
                                        <div className="staff-name">
                                          {s.name}
                                        </div>
                                        <div className="staff-branch">
                                          {s.branch}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {s.lead_masuk}
                                  </td>
                                  <td>{s.lead_serius}</td>
                                  <td
                                    style={{
                                      fontWeight: 700,
                                      color: "#059669",
                                    }}
                                  >
                                    {s.closing}
                                  </td>
                                  <td>
                                    <div className="staff-cr">
                                      <span
                                        style={{
                                          fontFamily:
                                            "JetBrains Mono, monospace",
                                          fontSize: 12,
                                        }}
                                      >
                                        {fmtPct(cr)}
                                      </span>
                                      <div className="staff-cr-bar">
                                        <div
                                          className="staff-cr-fill"
                                          style={{
                                            width: `${Math.min(cr, 100)}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      fontFamily: "JetBrains Mono, monospace",
                                      fontSize: 12,
                                    }}
                                  >
                                    {fmtRpShort(s.omset)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ═══ TAB: TREND 7 HARI ════════════════════════════════ */}
                {activeTab === "trend" && (
                  <>
                    {data.trend.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📉</div>
                        <p>Belum ada data trend.</p>
                      </div>
                    ) : (
                      <div className="trend-grid" style={{ marginBottom: 20 }}>
                        {/* Lead masuk */}
                        <div className="trend-section">
                          <div className="trend-section-title">
                            Lead Masuk
                            <span className="trend-chip">7 hari</span>
                          </div>
                          <TrendBars
                            trend={data.trend}
                            field="lead_masuk"
                            color="#6366f1"
                            fmt={(v) => String(v)}
                          />
                        </div>

                        {/* Closing */}
                        <div className="trend-section">
                          <div className="trend-section-title">
                            Closing
                            <span className="trend-chip">7 hari</span>
                          </div>
                          <TrendBars
                            trend={data.trend}
                            field="closing"
                            color="#10b981"
                            fmt={(v) => String(v)}
                          />
                        </div>

                        {/* Omzet */}
                        <div className="trend-section">
                          <div className="trend-section-title">
                            Omzet
                            <span className="trend-chip">7 hari</span>
                          </div>
                          <TrendBars
                            trend={data.trend}
                            field="omset"
                            color="#f59e0b"
                            fmt={(v) =>
                              v >= 1_000_000
                                ? `${(v / 1_000_000).toFixed(0)}Jt`
                                : String(v)
                            }
                          />
                        </div>

                        {/* Gross Profit */}
                        <div className="trend-section">
                          <div className="trend-section-title">
                            Gross Profit
                            <span className="trend-chip">7 hari</span>
                          </div>
                          <TrendBars
                            trend={data.trend}
                            field="gross_profit"
                            color="#f43f5e"
                            fmt={(v) =>
                              v >= 1_000_000
                                ? `${(v / 1_000_000).toFixed(0)}Jt`
                                : String(v)
                            }
                          />
                        </div>
                      </div>
                    )}

                    {/* Trend table detail */}
                    <div className="staff-section">
                      <div className="trend-section-title">
                        Detail Harian — 7 Hari Terakhir
                      </div>
                      <table className="staff-table" style={{ minWidth: 600 }}>
                        <thead>
                          <tr>
                            <th>Tanggal</th>
                            <th>Lead Masuk</th>
                            <th>Closing</th>
                            <th>Omzet</th>
                            <th>Gross Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...data.trend].reverse().map((t, i) => (
                            <tr
                              key={t.date}
                              style={{ fontWeight: i === 0 ? 700 : 400 }}
                            >
                              <td
                                style={{
                                  fontFamily: "JetBrains Mono, monospace",
                                  fontSize: 12,
                                }}
                              >
                                {i === 0 && (
                                  <span
                                    style={{
                                      background: "#eef2ff",
                                      color: "#6366f1",
                                      fontSize: 10,
                                      padding: "2px 6px",
                                      borderRadius: 5,
                                      marginRight: 6,
                                      fontWeight: 700,
                                    }}
                                  >
                                    HARI INI
                                  </span>
                                )}
                                {t.label}
                              </td>
                              <td>{t.lead_masuk}</td>
                              <td style={{ color: "#059669", fontWeight: 600 }}>
                                {t.closing}
                              </td>
                              <td
                                style={{
                                  fontFamily: "JetBrains Mono, monospace",
                                  fontSize: 12,
                                }}
                              >
                                {fmtRpShort(t.omset)}
                              </td>
                              <td
                                style={{
                                  fontFamily: "JetBrains Mono, monospace",
                                  fontSize: 12,
                                }}
                              >
                                {fmtRpShort(t.gross_profit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
