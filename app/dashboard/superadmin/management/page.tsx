// app/dashboard/superadmin/management/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  CheckCircle2,
  Users,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  ArrowUp,
  Target,
} from "lucide-react";
import { Diamond } from "@/components/dashboard/superadmin/Diamond";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ManagerData {
  id: string;
  full_name: string;
  role_name: string;
  tasks: Array<{
    title: string;
    deadline?: string | null;
    items: Array<{
      id: string;
      title: string;
      progress: Array<{
        is_completed: boolean;
        completed_at: string | null;
        status?: string | null;
        notes?: string | null;
        kendala?: string | null;
        admin_notes?: string | null;
      }> | null;
    }> | null;
  }>;
}

const C = {
  page: "var(--color-parch-page)",
  card: "var(--color-parch-card)",
  header: "var(--color-parch-header)",
  raised: "var(--color-parch-raised)",
  border: "var(--color-parch-border)",
  gold: "#B89B5B",
  goldDim: "var(--color-gold-dim)",
  ink: "var(--color-text-ink)",
  sepia: "var(--color-text-sepia)",
  faded: "var(--color-text-faded)",
  ghost: "var(--color-text-ghost)",
  sage: "#4A7A3A",
  terra: "#9A3A20",
  amber: "#8A6010",
};

const ROLE_DISPLAY: Record<string, string> = {
  leader_hc: "Leader HC",
  leader_operational: "Leader Operasional",
  leader_production: "Leader Produksi",
  leader_marketing: "Leader Marketing",
  leader_sales: "Leader Sales",
  leader_fat: "Leader FAT",
  leader_rnd: "Leader RND",
  leader_safar: "Leader Safar",
  leader_ga: "Leader GA",
  operational_supervisor: "Spv. Operasional",
  production_supervisor: "Spv. Produksi",
  superadmin: "Super Admin",
};

function useAnimatedValue(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round((target * eased)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function getManagerStats(m: ManagerData) {
  const items = m.tasks.flatMap((t) => t.items ?? []);
  const done = items.filter((i) => i.progress?.[0]?.is_completed).length;
  const total = items.length || 1;
  const rate = Math.round((done / total) * 100);
  return { items, done, total, rate };
}

function isOverdue(deadline: string | null, status: string | null): boolean {
  if (!deadline || status === "selesai") return false;
  return new Date(deadline) < new Date();
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ManagementDashboardPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [drillManager, setDrillManager] = useState<ManagerData | null>(null);
  useEffect(() => { setClientUser(getClientUser()); }, []);

  const { data, isLoading } = useQuery<{ success: boolean; data: ManagerData[] }>({
    queryKey: ["superadmin", "management-tasks"],
    queryFn: () => fetcher("/api/superadmin/management-tasks"),
  });

  const managers = useMemo(() => data?.data ?? [], [data]);

  const stats = useMemo(() => {
    const allItems = managers.flatMap((m) => m.tasks.flatMap((t) => t.items ?? []));
    const totalTasks = managers.flatMap((m) => m.tasks).length;
    const done = allItems.filter((i) => i.progress?.[0]?.is_completed).length;
    const total = allItems.length;
    const overallRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const thisWeekDone = allItems.filter((i) => {
      const d = i.progress?.[0]?.completed_at;
      if (!d) return false;
      return new Date(d) >= new Date(Date.now() - 7 * 86400000);
    }).length;
    const atRisk = managers.filter((m) => {
      const s = getManagerStats(m);
      return s.total > 0 && s.done < s.total;
    }).length;
    return { totalTasks, done, total, overallRate, thisWeekDone, atRisk };
  }, [managers]);

  const animatedRate = useAnimatedValue(stats.overallRate);

  const managerComparison = useMemo(() => {
    return managers
      .map((m) => ({ ...getManagerStats(m), manager: m }))
      .sort((a, b) => b.rate - a.rate);
  }, [managers]);

  const statusSummary = useMemo(() => {
    let onTrack = 0, atRisk = 0, overdue = 0;
    managers.forEach((m) => {
      m.tasks.forEach((t) => (t.items ?? []).forEach((item) => {
        const pg = item.progress?.[0];
        if (!pg) return;
        if (pg.is_completed) { onTrack++; return; }
        if (isOverdue(t.deadline ?? null, pg.status ?? null)) { overdue++; return; }
        if (pg.status === "proses") { atRisk++; return; }
      }));
    });
    return { onTrack, atRisk, overdue };
  }, [managers]);

  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; rate: number }[] = [];
    const allItems = managers.flatMap((m) => m.tasks.flatMap((t) => (t.items ?? []).map((i) => ({ item: i, manager: m }))));
    for (let w = 7; w >= 0; w--) {
      const cutoff = new Date(Date.now() - (w + 1) * 7 * 86400000);
      const end = new Date(Date.now() - w * 7 * 86400000);
      const inWindow = allItems.filter((i) => {
        const d = i.item.progress?.[0]?.completed_at;
        if (!d) return false;
        const dd = new Date(d);
        return dd >= cutoff && dd < end;
      }).length;
      const active = allItems.length || 1;
      weeks.push({
        label: `W${8 - w}`,
        rate: Math.round((inWindow / active) * 100),
      });
    }
    if (weeks[weeks.length - 1]) {
      weeks[weeks.length - 1].rate = stats.overallRate;
    }
    return weeks;
  }, [managers, stats.overallRate]);

  const insights = useMemo(() => {
    const below50 = managerComparison.filter((m) => m.rate < 50 && m.total > 0).length;
    const above70 = managerComparison.filter((m) => m.rate >= 70 && m.total > 0).length;
    const trendUp = weeklyTrend.length >= 2 && weeklyTrend[weeklyTrend.length - 1].rate >= (weeklyTrend[weeklyTrend.length - 2]?.rate ?? 0);
    const delta = weeklyTrend.length >= 2 ? weeklyTrend[weeklyTrend.length - 1].rate - weeklyTrend[0].rate : 0;
    return { below50, above70, trendUp, delta };
  }, [managerComparison, weeklyTrend]);

  const leaderboard = useMemo(() => {
    return [...managers]
      .map((m) => ({ ...getManagerStats(m), manager: m }))
      .sort((a, b) => b.done - a.done);
  }, [managers]);

  const topManagers = useMemo(() => managerComparison.filter((m) => m.rate >= 50).slice(0, 8), [managerComparison]);

  const handleDrillClose = useCallback(() => setDrillManager(null), []);
  useEffect(() => {
    if (!drillManager) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleDrillClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [drillManager, handleDrillClose]);

  const chartMargin = { top: 5, right: 20, bottom: 5, left: 0 };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-12"><Loading variant="skeleton" text="Memuat data..." /></div>
          ) : (
            <div className="max-w-5xl mx-auto px-8 py-10">

              {/* ── Masthead ── */}
              <div className="mb-10">
                <h2 className="text-[56px] leading-[0.95] mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: C.ink, letterSpacing: "-0.02em" }}>
                  Dashboard{" "}<i style={{ color: C.gold, fontWeight: 400 }}>Management</i>
                </h2>
                <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
              </div>

              {/* ── Hero Number + Stats ── */}
              <div className="flex flex-col lg:flex-row gap-8 mb-10">
                <div className="flex flex-col items-start lg:w-[40%]" style={{ borderRight: `0.5px solid ${C.goldDim}` }}>
                  <p className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: C.faded }}>Completion Rate</p>
                  <div className="relative">
                    <span className="text-[140px] leading-none block" style={{ fontFamily: "var(--font-display)", fontWeight: 300, letterSpacing: "-0.03em", color: stats.overallRate >= 80 ? C.sage : stats.overallRate >= 50 ? C.gold : C.terra }}>
                      {animatedRate}
                    </span>
                    <span className="text-4xl" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: C.faded }}>%</span>
                  </div>
                  <p className="text-sm mt-2" style={{ color: C.ghost }}>{stats.done} dari {stats.total} item diselesaikan oleh {managers.length} manager</p>
                  <TrendingUp className="h-5 w-5 mt-3" style={{ color: stats.overallRate >= 50 ? C.sage : C.terra }} />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-0">
                  {[
                    { label: "Total Manager", value: managers.length, icon: Users },
                    { label: "Total Tasks", value: stats.totalTasks, icon: BarChart3 },
                    { label: "Selesai Minggu Ini", value: stats.thisWeekDone, icon: CheckCircle2 },
                    { label: "Butuh Perhatian", value: stats.atRisk, icon: AlertTriangle, accent: stats.atRisk > 0 ? C.amber : C.sage },
                  ].map(({ label, value, icon: Icon, accent }) => (
                    <div key={label} className="p-5" style={{ borderBottom: `0.5px solid ${C.goldDim}`, borderRight: `0.5px solid ${C.goldDim}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4" style={{ color: accent ?? C.gold }} />
                        <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: C.faded }}>{label}</p>
                      </div>
                      <p className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: C.ink }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Insight Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="rounded-lg p-5" style={{ background: insights.trendUp ? "#EAF2E4" : "#F5EAE4", border: `0.5px solid ${insights.trendUp ? C.sage : C.terra}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    {insights.trendUp ? <TrendingUp className="h-4 w-4" style={{ color: C.sage }} /> : <TrendingDown className="h-4 w-4" style={{ color: C.terra }} />}
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: insights.trendUp ? C.sage : C.terra }}>{insights.trendUp ? "Trending Up" : "Trending Down"}</p>
                  </div>
                  <p className="text-sm" style={{ color: C.sepia }}>Completion {insights.delta >= 0 ? "+" : ""}{insights.delta}% dari 8 minggu lalu</p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.faded }}>{stats.done} items diselesaikan sejauh ini</p>
                </div>
                <div className="rounded-lg p-5" style={{ background: insights.below50 > 0 ? "#F5EAE4" : "#EAF2E4", border: `0.5px solid ${insights.below50 > 0 ? C.terra : C.sage}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" style={{ color: insights.below50 > 0 ? C.terra : C.sage }} />
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: insights.below50 > 0 ? C.terra : C.sage }}>{insights.below50 > 0 ? "Action Needed" : "All On Track"}</p>
                  </div>
                  <p className="text-sm" style={{ color: C.sepia }}>{insights.below50 > 0 ? `${insights.below50} managers below 50% — need attention` : "No managers below 50% threshold"}</p>
                </div>
                <div className="rounded-lg p-5" style={{ background: "#FFF5DC", border: `0.5px solid ${C.amber}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4" style={{ color: C.amber }} />
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: C.amber }}>Team Achievement</p>
                  </div>
                  <p className="text-sm" style={{ color: C.sepia }}>{insights.above70}/{managers.length} managers above 70%</p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.faded }}>{stats.thisWeekDone} items completed this week</p>
                </div>
              </div>

              {/* ── Charts Row: Trend + Donut ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Line Chart — 8-week trend */}
                <div className="lg:col-span-2 rounded-lg p-5" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}>
                  <p className="text-[9px] uppercase tracking-[0.22em] mb-4" style={{ color: C.gold }}>Performance Trend</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={weeklyTrend} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-parch-border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.faded }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.faded }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12 }} />
                      <Line type="monotone" dataKey="rate" stroke={C.gold} strokeWidth={2} dot={{ r: 3, fill: C.gold }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Chart — Status distribution */}
                <div className="rounded-lg p-5 flex flex-col items-center" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}>
                  <p className="text-[9px] uppercase tracking-[0.22em] mb-2 self-start" style={{ color: C.gold }}>Status Breakdown</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={[
                        { name: "On Track", value: statusSummary.onTrack, color: C.sage },
                        { name: "At Risk", value: statusSummary.atRisk, color: C.amber },
                        { name: "Overdue", value: statusSummary.overdue, color: C.terra },
                      ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {[C.sage, C.amber, C.terra].map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-1">
                    {[{ label: "On Track", color: C.sage, v: statusSummary.onTrack }, { label: "At Risk", color: C.amber, v: statusSummary.atRisk }, { label: "Overdue", color: C.terra, v: statusSummary.overdue }].map(({ label, color, v }) => (
                      <div key={label} className="flex items-center gap-1 text-[10px]" style={{ color: C.faded }}>
                        <span className="w-2 h-2 rounded-sm" style={{ background: color }} /> {v}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Bar Chart: Manager Comparison ── */}
              <div className="rounded-lg p-5 mb-10" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}>
                <p className="text-[9px] uppercase tracking-[0.22em] mb-4" style={{ color: C.gold }}>Team Performance</p>
                <ResponsiveContainer width="100%" height={Math.max(200, managerComparison.length * 32)}>
                  <BarChart data={managerComparison.map((m) => ({
                    name: m.manager.full_name,
                    rate: m.rate,
                    fill: m.rate >= 80 ? C.sage : m.rate >= 50 ? C.gold : C.terra,
                  }))} layout="vertical" margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-parch-border)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: C.faded }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: C.faded, fontFamily: "var(--font-display)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12 }} />
                    <Bar dataKey="rate" radius={[0, 2, 2, 0]} barSize={16} onClick={(d: unknown) => {
                      const name = (d as { name?: string })?.name;
                      if (!name) return;
                      const found = managers.find((m) => m.full_name === name);
                      if (found) setDrillManager(found);
                    }} style={{ cursor: "pointer" }}>
                      {managerComparison.map((m, i) => <Cell key={i} fill={m.rate >= 80 ? C.sage : m.rate >= 50 ? C.gold : C.terra} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Top Performers Carousel ── */}
              {topManagers.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: C.gold }}>Top Performers</p>
                    <span className="text-[10px]" style={{ color: C.ghost }}>scroll →</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {topManagers.map((m, idx) => {
                      const barColor = m.rate >= 80 ? C.sage : m.rate >= 50 ? C.gold : C.terra;
                      return (
                        <div key={m.manager.id} className="shrink-0 w-48 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }} onClick={() => setDrillManager(m.manager)}>
                          <div className="flex items-center gap-2 mb-3">
                            <Diamond size={idx === 0 ? 7 : 5} />
                            <span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{m.manager.full_name}</span>
                          </div>
                          <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: C.border }}>
                            <div className="h-full rounded-full" style={{ width: `${m.rate}%`, background: barColor }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: C.faded }}>{ROLE_DISPLAY[m.manager.role_name] ?? m.manager.role_name}</span>
                            <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-display)", color: C.sepia }}>{m.rate}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Leaderboard Timeline ── */}
              <div className="mb-6">
                <p className="text-[9px] uppercase tracking-[0.22em] mb-5" style={{ color: C.gold }}>Leaderboard</p>
                <div className="space-y-0">
                  {leaderboard.map((m, idx) => {
                    const barColor = m.rate >= 80 ? C.sage : m.rate >= 50 ? C.gold : C.terra;
                    const tag = m.rate >= 80 ? "Excellent" : m.rate >= 50 ? "On Track" : "Needs Focus";
                    return (
                      <div key={m.manager.id} className="group flex items-center gap-3 py-3 cursor-pointer" style={{ borderBottom: `0.5px solid ${C.goldDim}` }} onClick={() => setDrillManager(m.manager)}>
                        <span className="w-6 text-right text-xs shrink-0" style={{ color: idx < 3 ? C.gold : C.ghost, fontFamily: "var(--font-display)", fontWeight: 600 }}>{String(idx + 1).padStart(2, "0")}</span>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <Diamond size={idx === 0 ? 7 : 4} />
                          {idx < leaderboard.length - 1 && <div className="w-px h-6" style={{ background: C.goldDim }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{m.manager.full_name}</span>
                            <span className="text-[10px]" style={{ color: C.ghost }}>{ROLE_DISPLAY[m.manager.role_name] ?? m.manager.role_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                              <div className="h-full rounded-full" style={{ width: `${m.rate}%`, background: barColor }} />
                            </div>
                            <span className="text-xs w-8 text-right shrink-0" style={{ fontFamily: "var(--font-display)", color: C.sepia }}>{m.rate}%</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs block" style={{ color: C.sepia }}>{m.done}/{m.total}</span>
                          <span className="text-[10px] font-medium" style={{ color: barColor }}>{tag}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: C.gold }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Drill-Down Modal ── */}
      {drillManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(44, 24, 16, 0.6)" }} onClick={(e) => { if (e.target === e.currentTarget) handleDrillClose(); }}>
          <div className="w-full max-w-lg max-h-[85vh] rounded-lg shadow-2xl flex flex-col overflow-hidden" style={{ background: "var(--color-parch-sidebar)", border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: C.header, borderTop: `2px solid ${C.gold}`, borderBottom: `0.5px solid ${C.goldDim}` }}>
              <div>
                <p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: C.gold }}>Manager Detail</p>
                <p className="text-xl leading-tight mt-0.5" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: C.ink }}>{drillManager.full_name}</p>
                <p className="text-xs" style={{ color: C.faded }}>{ROLE_DISPLAY[drillManager.role_name] ?? drillManager.role_name}</p>
              </div>
              <button onClick={handleDrillClose} className="rounded p-2 transition-colors" style={{ color: C.ghost }} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const s = getManagerStats(drillManager);
                const statusClr = s.rate >= 80 ? C.sage : s.rate >= 50 ? C.gold : C.terra;
                return (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: C.faded }}>Completion</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: statusClr }}>{s.rate}%</span>
                          <span className="text-sm" style={{ color: C.faded }}>{s.done}/{s.total} tasks</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: `color-mix(in srgb, ${statusClr} 12%, transparent)`, color: statusClr, fontSize: 11 }}>
                        <Diamond size={4} /> {s.rate >= 80 ? "On Track" : s.rate >= 50 ? "In Progress" : "Needs Focus"}
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
                      <div className="h-full rounded-full" style={{ width: `${s.rate}%`, background: statusClr }} />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.22em] mb-3" style={{ color: C.gold }}>Task Breakdown</p>
                      <div className="space-y-2">
                        {drillManager.tasks.flatMap((task) => (task.items ?? []).map((item) => {
                          const pg = item.progress?.[0];
                          const st = pg?.status ?? "belum";
                          const done = pg?.is_completed;
                          const overdue = isOverdue(task.deadline ?? null, st);
                          const stClr = done ? C.sage : overdue ? C.terra : st === "proses" ? C.amber : C.terra;
                          const icon = done ? "✓" : overdue ? "⚠" : "○";
                          return (
                            <div key={item.id} className="flex items-start gap-3 py-2" style={{ borderBottom: `0.5px solid ${C.goldDim}` }}>
                              <span className="text-sm shrink-0 mt-0.5" style={{ color: stClr }}>{icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm" style={{ color: C.ink }}>{item.title}</p>
                                <p className="text-[10px]" style={{ color: C.faded }}>{task.title}</p>
                                {pg?.completed_at && <p className="text-[10px] mt-0.5" style={{ color: C.ghost }}>Selesai {new Date(pg.completed_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>}
                                {overdue && task.deadline && <p className="text-[10px]" style={{ color: C.terra }}>Overdue — {new Date(task.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>}
                              </div>
                              <span className="text-[10px] shrink-0 font-medium" style={{ color: stClr }}>{done ? "Done" : st === "proses" ? "Proses" : "Pending"}</span>
                            </div>
                          );
                        }))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] pt-1" style={{ color: C.faded }}>
                      {insights.trendUp ? <ArrowUp className="h-3 w-3" style={{ color: C.sage }} /> : <TrendingDown className="h-3 w-3" style={{ color: C.terra }} />}
                      {insights.delta >= 0 ? "+" : ""}{insights.delta}% vs 8 minggu lalu
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end px-6 py-3 shrink-0" style={{ borderTop: `0.5px solid ${C.goldDim}`, background: C.header }}>
              <button onClick={handleDrillClose} className="rounded px-4 py-2 text-xs font-medium transition-colors" style={{ border: `1px solid ${C.border}`, color: C.sepia }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
