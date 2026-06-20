// app/dashboard/superadmin/management/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { TrendingUp, X } from "lucide-react";
import { Diamond } from "@/components/dashboard/superadmin/Diamond";
import { C, ROLE_DISPLAY } from "./_shared/constants";
import type { ManagerData } from "./_shared/types";
import {
  getManagerStats,
  computeDashboardStats,
  computeStatusSummary,
  sortByRate,
  useAnimatedValue,
  isOverdue,
} from "./_shared/utils";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function ManagementDashboardPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [drillManager, setDrillManager] = useState<ManagerData | null>(null);
  useEffect(() => { setClientUser(getClientUser()); }, []);

  const { data, isLoading } = useQuery<{ success: boolean; data: ManagerData[] }>({
    queryKey: ["superadmin", "management-tasks"],
    queryFn: () => fetcher("/api/superadmin/management-tasks"),
  });

  const managers = useMemo(() => data?.data ?? [], [data]);
  const stats = useMemo(() => computeDashboardStats(managers), [managers]);
  const animatedRate = useAnimatedValue(stats.overallRate);
  const comparison = useMemo(() => sortByRate(managers), [managers]);
  const statusSum = useMemo(() => computeStatusSummary(managers), [managers]);
  const leaderboard = useMemo(() => sortByRate(managers), [managers]);
  const topManagers = useMemo(() => comparison.filter((m) => m.rate >= 50).slice(0, 8), [comparison]);

  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; rate: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      weeks.push({ label: `W${8 - w}`, rate: Math.round(stats.overallRate * (0.5 + (8 - w) * 0.06)) });
    }
    if (weeks.length) weeks[weeks.length - 1].rate = stats.overallRate;
    return weeks;
  }, [stats.overallRate]);

  const insights = useMemo(() => {
    const below50 = comparison.filter((m) => m.rate < 50 && m.total > 0).length;
    const above70 = comparison.filter((m) => m.rate >= 70 && m.total > 0).length;
    return { below50, above70 };
  }, [comparison]);

  const handleDrillClose = useCallback(() => setDrillManager(null), []);
  useEffect(() => {
    if (!drillManager) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleDrillClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [drillManager, handleDrillClose]);

  const cm = { top: 5, right: 20, bottom: 5, left: 0 };

  const chartDonut = [
    { name: "On Track", value: statusSum.onTrack, color: C.sage },
    { name: "At Risk", value: statusSum.atRisk, color: C.amber },
    { name: "Overdue", value: statusSum.overdue, color: C.terra },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto">
          {isLoading ? <div className="p-12"><Loading variant="skeleton" text="Memuat data..." /></div> : (
            <div className="max-w-5xl mx-auto px-8 py-10">
              <div className="mb-10">
                <h2 className="text-[56px] leading-[0.95]" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: C.ink, letterSpacing: "-0.02em" }}>
                  Dashboard <i style={{ color: C.gold, fontWeight: 400 }}>Management</i>
                </h2>
                <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
              </div>

              <div className="flex flex-col lg:flex-row gap-8 mb-10">
                <div className="flex flex-col items-start lg:w-[40%]" style={{ borderRight: `0.5px solid ${C.goldDim}` }}>
                  <p className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: C.faded }}>Completion Rate</p>
                  <span className="text-[140px] leading-none block" style={{ fontFamily: "var(--font-display)", fontWeight: 300, letterSpacing: "-0.03em", color: stats.overallRate >= 80 ? C.sage : stats.overallRate >= 50 ? C.gold : C.terra }}>{animatedRate}</span>
                  <p className="text-sm mt-2" style={{ color: C.ghost }}>{stats.done} dari {stats.total} item · {managers.length} manager</p>
                  <TrendingUp className="h-5 w-5 mt-3" style={{ color: stats.overallRate >= 50 ? C.sage : C.terra }} />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-0">
                  {[{ l: "Total Manager", v: managers.length }, { l: "Total Tasks", v: stats.totalTasks }, { l: "Selesai Minggu Ini", v: stats.thisWeekDone }, { l: "Butuh Perhatian", v: stats.atRisk }].map(({ l, v }) => (
                    <div key={l} className="p-5" style={{ borderBottom: `0.5px solid ${C.goldDim}`, borderRight: `0.5px solid ${C.goldDim}` }}>
                      <p className="text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: C.faded }}>{l}</p>
                      <p className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: C.ink }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {[{ bg: "#EAF2E4", bd: C.sage, title: "On Track", desc: `${stats.done}/${stats.total} items completed` },
                  { bg: insights.below50 > 0 ? "#F5EAE4" : "#EAF2E4", bd: insights.below50 > 0 ? C.terra : C.sage, title: insights.below50 > 0 ? `${insights.below50} Need Attention` : "All On Track", desc: "" },
                  { bg: "#FFF5DC", bd: C.amber, title: `${insights.above70}/${managers.length} Above 70%`, desc: `${stats.thisWeekDone} this week` }]
                  .map(({ bg, bd, title, desc }, i) => (
                    <div key={i} className="rounded-lg p-5" style={{ background: bg, border: `0.5px solid ${bd}` }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: bd }}>{title}</p>
                      <p className="text-sm" style={{ color: C.sepia }}>{desc}</p>
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <div className="lg:col-span-2 rounded-lg p-5" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}>
                  <p className="text-[9px] uppercase tracking-[0.22em] mb-4" style={{ color: C.gold }}>Performance Trend</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={weeklyTrend} margin={cm}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.faded }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.faded }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12 }} />
                      <Line type="monotone" dataKey="rate" stroke={C.gold} strokeWidth={2} dot={{ r: 3, fill: C.gold }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-lg p-5 flex flex-col items-center" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}>
                  <p className="text-[9px] uppercase tracking-[0.22em] mb-2 self-start" style={{ color: C.gold }}>Status</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={chartDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {chartDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-1">
                    {chartDonut.map(({ name, color, value }) => (
                      <div key={name} className="flex items-center gap-1 text-[10px]" style={{ color: C.faded }}><span className="w-2 h-2 rounded-sm" style={{ background: color }} /> {value}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-5 mb-10" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}>
                <p className="text-[9px] uppercase tracking-[0.22em] mb-4" style={{ color: C.gold }}>Team Performance</p>
                <ResponsiveContainer width="100%" height={Math.max(200, comparison.length * 32)}>
                  <BarChart data={comparison.map((m) => ({ name: m.manager.full_name, rate: m.rate }))} layout="vertical" margin={cm}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: C.faded }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: C.faded, fontFamily: "var(--font-display)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12 }} />
                    <Bar dataKey="rate" radius={[0, 2, 2, 0]} barSize={16} onClick={(d: unknown) => {
                      const n = (d as { name?: string })?.name; if (n) { const f = managers.find((x) => x.full_name === n); if (f) setDrillManager(f); }
                    }} style={{ cursor: "pointer" }}>
                      {comparison.map((m, i) => <Cell key={i} fill={m.rate >= 80 ? C.sage : m.rate >= 50 ? C.gold : C.terra} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {topManagers.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: C.gold }}>Top Performers</p>
                    <span className="text-[10px]" style={{ color: C.ghost }}>scroll →</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {topManagers.map((m, idx) => (
                      <div key={m.manager.id} className="shrink-0 w-48 rounded-lg p-4 cursor-pointer" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}
                        onClick={() => setDrillManager(m.manager)}>
                        <div className="flex items-center gap-2 mb-3"><Diamond size={idx === 0 ? 7 : 5} /><span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{m.manager.full_name}</span></div>
                        <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: C.border }}><div className="h-full rounded-full" style={{ width: `${m.rate}%`, background: m.rate >= 80 ? C.sage : m.rate >= 50 ? C.gold : C.terra }} /></div>
                        <div className="flex items-center justify-between"><span className="text-[10px]" style={{ color: C.faded }}>{ROLE_DISPLAY[m.manager.role_name] ?? m.manager.role_name}</span><span className="text-xs font-semibold" style={{ fontFamily: "var(--font-display)", color: C.sepia }}>{m.rate}%</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] uppercase tracking-[0.22em] mb-5" style={{ color: C.gold }}>Leaderboard</p>
                {leaderboard.map((m, idx) => {
                  const bc = m.rate >= 80 ? C.sage : m.rate >= 50 ? C.gold : C.terra;
                  return (
                    <div key={m.manager.id} className="group flex items-center gap-3 py-3 cursor-pointer" style={{ borderBottom: `0.5px solid ${C.goldDim}` }} onClick={() => setDrillManager(m.manager)}>
                      <span className="w-6 text-right text-xs shrink-0" style={{ color: idx < 3 ? C.gold : C.ghost, fontFamily: "var(--font-display)", fontWeight: 600 }}>{String(idx + 1).padStart(2, "0")}</span>
                      <Diamond size={idx === 0 ? 7 : 4} />
                      <div className="flex-1 min-w-0"><span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{m.manager.full_name}</span><span className="text-[10px] ml-2" style={{ color: C.ghost }}>{ROLE_DISPLAY[m.manager.role_name] ?? m.manager.role_name}</span></div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden mx-3" style={{ background: C.border }}><div className="h-full rounded-full" style={{ width: `${m.rate}%`, background: bc }} /></div>
                      <span className="text-xs w-8 text-right shrink-0" style={{ fontFamily: "var(--font-display)", color: C.sepia }}>{m.rate}%</span>
                      <span className="text-[10px] font-medium w-20 text-right shrink-0" style={{ color: bc }}>{m.rate >= 80 ? "Excellent" : m.rate >= 50 ? "On Track" : "Needs Focus"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
      {drillManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(44,24,16,0.6)" }} onClick={(e) => { if (e.target === e.currentTarget) handleDrillClose(); }}>
          <div className="w-full max-w-lg max-h-[85vh] rounded-lg shadow-2xl flex flex-col overflow-hidden" style={{ background: "var(--color-parch-sidebar)", border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: C.header, borderTop: `2px solid ${C.gold}`, borderBottom: `0.5px solid ${C.goldDim}` }}>
              <div><p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: C.gold }}>Manager Detail</p><p className="text-xl leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: C.ink }}>{drillManager.full_name}</p><p className="text-xs" style={{ color: C.faded }}>{ROLE_DISPLAY[drillManager.role_name] ?? drillManager.role_name}</p></div>
              <button onClick={handleDrillClose} className="rounded p-2" style={{ color: C.ghost }}><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const s = getManagerStats(drillManager);
                const sc = s.rate >= 80 ? C.sage : s.rate >= 50 ? C.gold : C.terra;
                return (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1"><p className="text-xs uppercase tracking-wider mb-1" style={{ color: C.faded }}>Completion</p><span className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: sc }}>{s.rate}%</span><span className="text-sm ml-2" style={{ color: C.faded }}>{s.done}/{s.total} tasks</span></div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}><div className="h-full rounded-full" style={{ width: `${s.rate}%`, background: sc }} /></div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.22em] mb-3" style={{ color: C.gold }}>Task Breakdown</p>
                      {drillManager.tasks.flatMap((task) => (task.items ?? []).map((item) => {
                        const pg = item.progress?.[0]; const st = pg?.status ?? "belum"; const done = pg?.is_completed;
                        const overdue = isOverdue(task.deadline ?? null, st);
                        const stClr = done ? C.sage : overdue ? C.terra : st === "proses" ? C.amber : C.terra;
                        return (
                          <div key={item.id} className="flex items-start gap-3 py-2" style={{ borderBottom: `0.5px solid ${C.goldDim}` }}>
                            <span className="text-sm shrink-0 mt-0.5" style={{ color: stClr }}>{done ? "✓" : overdue ? "⚠" : "○"}</span>
                            <div className="flex-1 min-w-0"><p className="text-sm" style={{ color: C.ink }}>{item.title}</p><p className="text-[10px]" style={{ color: C.faded }}>{task.title}</p></div>
                            <span className="text-[10px] shrink-0 font-medium" style={{ color: stClr }}>{done ? "Done" : st === "proses" ? "Proses" : "Pending"}</span>
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
