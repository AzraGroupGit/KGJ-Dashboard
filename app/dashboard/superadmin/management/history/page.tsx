// app/dashboard/superadmin/management/history/page.tsx

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CheckCircle2, User, AlertCircle, ChevronDown, Calendar, Search, X } from "lucide-react";
import { Diamond } from "@/components/dashboard/superadmin/Diamond";
import { C } from "../_shared/constants";
import type { ManagerData, HistoryEntry } from "../_shared/types";
import { getManagerStats } from "../_shared/utils";

export default function ManagementHistoryPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedIdxs, setExpandedIdxs] = useState<Set<number>>(new Set());
  const datePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setClientUser(getClientUser()); }, []);
  useEffect(() => {
    if (!showDatePicker) return;
    const h = (e: MouseEvent) => { if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDatePicker]);

  const { data, isLoading } = useQuery<{ success: boolean; data: ManagerData[] }>({
    queryKey: ["superadmin", "management-tasks"],
    queryFn: () => fetcher("/api/superadmin/management-tasks"),
  });

  const managers = useMemo(() => data?.data ?? [], [data]);

  const managerRates = useMemo(() => {
    const map = new Map<string, { done: number; total: number; rate: number }>();
    managers.forEach((m) => { const s = getManagerStats(m); map.set(m.id, { ...s }); });
    return map;
  }, [managers]);

  const history = useMemo(() => {
    const entries: HistoryEntry[] = managers.flatMap((m) => {
      const mRate = managerRates.get(m.id)!;
      return m.tasks.flatMap((task) => (task.items ?? []).filter((item) => item.progress?.[0]?.completed_at).map((item) => ({
        manager: m.full_name, managerId: m.id, role: m.role_name, item: item.title, task: task.title,
        status: item.progress![0].status ?? "pending", completed_at: item.progress![0].completed_at!,
        notes: item.progress![0].notes ?? null, kendala: item.progress![0].kendala ?? null, admin_notes: item.progress![0].admin_notes ?? null,
        managerRate: mRate.rate, managerDone: mRate.done, managerTotal: mRate.total,
      })));
    }).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    return entries;
  }, [managers, managerRates]);

  const filteredHistory = useMemo(() => {
    let result = history;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.manager.toLowerCase().includes(q) || e.role.toLowerCase().includes(q) || e.item.toLowerCase().includes(q) || e.task.toLowerCase().includes(q));
    }
    if (dateFrom) result = result.filter((e) => new Date(e.completed_at) >= new Date(dateFrom));
    if (dateTo) result = result.filter((e) => new Date(e.completed_at) <= new Date(dateTo + "T23:59:59"));
    return result;
  }, [history, searchQuery, dateFrom, dateTo]);

  const monthlyGroups = useMemo(() => {
    const groups: { label: string; entries: HistoryEntry[] }[] = [];
    for (const entry of filteredHistory) {
      const d = new Date(entry.completed_at);
      const label = `${d.toLocaleDateString("id-ID", { month: "long" })} ${d.getFullYear()}`;
      let group = groups.find((g) => g.label === label);
      if (!group) { group = { label, entries: [] }; groups.push(group); }
      group.entries.push(entry);
    }
    return groups;
  }, [filteredHistory]);

  const toggleExpand = (idx: number) => setExpandedIdxs((prev) => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  const uniqueManagers = new Set(history.map((e) => e.managerId)).size;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-[28px] leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: C.ink }}>Riwayat <i style={{ color: C.gold, fontWeight: 400 }}>Management</i></h2>
              <p className="text-sm mt-0.5" style={{ color: C.faded }}>Rekapitulasi penyelesaian tugas seluruh manager</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: C.ghost }} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama / role..." className="min-w-[120px] w-44 rounded border py-1.5 pl-8 pr-2 text-xs outline-none" style={{ borderColor: C.border, color: C.ink, background: C.card, borderStyle: "dashed" }} onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }} onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }} />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: C.ghost }}><X className="h-3 w-3" /></button>}
              </div>
              <div className="relative" ref={datePickerRef}>
                <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors" style={{ borderColor: dateFrom || dateTo ? C.gold : C.border, color: dateFrom || dateTo ? C.goldText : C.faded, background: C.card }}>
                  <Calendar className="h-3.5 w-3.5" />{dateFrom || dateTo ? <span>{dateFrom ? new Date(dateFrom).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "…"}{" — "}{dateTo ? new Date(dateTo).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "…"}</span> : "Filter"}
                </button>
                {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="absolute -top-1 -right-1 rounded-full p-0.5" style={{ background: C.card, border: `1px solid ${C.border}` }}><X className="h-2.5 w-2.5" style={{ color: C.ghost }} /></button>}
                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-1 z-30 rounded-lg border p-3 shadow-lg w-52" style={{ background: C.card, borderColor: C.border }}>
                    <div className="space-y-2">
                      <div><label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: C.faded }}>Dari</label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: C.border, color: C.ink, background: "var(--color-parch-sidebar)" }} onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }} /></div>
                      <div><label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: C.faded }}>Sampai</label><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: C.border, color: C.ink, background: "var(--color-parch-sidebar)" }} onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }} /></div>
                      <button onClick={() => setShowDatePicker(false)} className="w-full rounded py-1.5 text-[10px] font-medium text-white" style={{ background: C.gold }}>Terapkan</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredHistory.length > 0 && (
            <div className="flex items-center gap-4 rounded-lg px-4 py-2 mb-6" style={{ background: C.card, border: `0.5px solid ${C.goldDim}` }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: C.faded }}><CheckCircle2 className="h-3.5 w-3.5" style={{ color: C.sage }} />{filteredHistory.length} entri log</div>
              <div className="w-px h-4" style={{ background: C.border }} />
              <div className="flex items-center gap-1.5 text-xs" style={{ color: C.faded }}><User className="h-3.5 w-3.5" style={{ color: C.gold }} />{uniqueManagers} managers</div>
            </div>
          )}

          {isLoading ? <div className="p-12"><Loading variant="skeleton" text="Memuat data..." /></div> : filteredHistory.length === 0 ? (
            <div className="text-center py-16 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}><CheckCircle2 className="mx-auto mb-3 h-10 w-10" style={{ color: C.ghost }} /><p style={{ color: C.faded }}>Belum ada riwayat.</p></div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-10">
              {monthlyGroups.map((month) => (
                <div key={month.label}>
                  <div className="flex items-center gap-4 mb-5 sticky top-0 z-10 py-2" style={{ background: "#F9FAFB" }}>
                    <div className="shrink-0 flex flex-col items-center"><span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: C.gold }}>{month.label.slice(0, 3)}</span><span className="text-lg" style={{ fontFamily: "var(--font-display)", color: C.ink, lineHeight: 1 }}>{month.label.split(" ")[1]}</span></div>
                    <div className="flex-1 h-px" style={{ background: C.goldDim }} />
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: C.goldDim }} />
                    {month.entries.map((entry) => {
                      const globalIdx = history.indexOf(entry);
                      const isExpanded = expandedIdxs.has(globalIdx);
                      const clr = entry.status === "selesai" ? C.sage : entry.status === "proses" ? C.amber : C.terra;
                      const barColor = entry.managerRate >= 80 ? C.sage : entry.managerRate >= 50 ? C.gold : C.terra;
                      return (
                        <div key={globalIdx} className="relative pb-3 last:pb-0">
                          <div className="absolute left-[-28px] top-1.5 rounded-full border-2" style={{ width: 10, height: 10, borderColor: clr, background: "#F9FAFB" }} />
                          <div className="rounded-lg border p-3 cursor-pointer" style={{ background: C.card, borderColor: C.border }} onClick={() => toggleExpand(globalIdx)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0"><Diamond size={4} /><span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{entry.manager}</span></div>
                              <span className="text-[10px] font-mono shrink-0" style={{ color: C.ghost }}>{new Date(entry.completed_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: C.border }}><div className="h-full rounded-full" style={{ width: `${entry.managerRate}%`, background: barColor }} /></div>
                              <span className="text-[10px] shrink-0" style={{ color: C.faded }}>{entry.managerDone}/{entry.managerTotal}</span>
                              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium shrink-0" style={{ background: `color-mix(in srgb, ${clr} 12%, transparent)`, color: clr }}><Diamond size={3} />{entry.status === "selesai" ? "Selesai" : entry.status === "proses" ? "Proses" : "Belum"}</span>
                              {isExpanded && <ChevronDown className="h-3 w-3 shrink-0" style={{ color: C.gold }} />}
                            </div>
                            {isExpanded && (
                              <div className="mt-2 pt-2 space-y-2 text-[11px]" style={{ borderTop: `0.5px solid ${C.goldDim}` }}>
                                <div className="flex items-start gap-2"><span className="shrink-0 font-medium" style={{ color: C.ghost, width: 80 }}>Task</span><span style={{ color: C.faded }}>{entry.task}</span></div>
                                <div className="flex items-start gap-2"><span className="shrink-0 font-medium" style={{ color: C.ghost, width: 80 }}>Sub-task</span><span style={{ color: C.sepia, fontWeight: 500 }}>{entry.item}</span></div>
                                {entry.notes && <div className="flex items-start gap-2"><span className="shrink-0 font-medium" style={{ color: C.ghost, width: 80 }}>Catatan</span><span style={{ color: C.faded }}>{entry.notes}</span></div>}
                                {entry.kendala && <div className="flex items-start gap-2"><span className="shrink-0 font-medium flex items-center gap-1" style={{ color: C.terra, width: 80 }}><AlertCircle className="h-3 w-3" /> Kendala</span><span style={{ color: C.terra }}>{entry.kendala}</span></div>}
                                {entry.admin_notes && <div className="flex items-start gap-2"><span className="shrink-0 font-medium" style={{ color: C.gold, width: 80 }}>◆ Catatan Admin</span><span style={{ color: C.gold }}>{entry.admin_notes}</span></div>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
