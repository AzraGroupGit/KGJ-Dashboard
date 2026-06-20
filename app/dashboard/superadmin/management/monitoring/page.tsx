// app/dashboard/superadmin/management/monitoring/page.tsx

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { LayoutGrid, List, Calendar, X } from "lucide-react";
import { MetricsSection } from "@/components/dashboard/superadmin/MetricsSection";
import { ManagerCard } from "@/components/dashboard/superadmin/ManagerCard";
import { TaskDetailModal } from "@/components/dashboard/superadmin/TaskDetailModal";
import { Diamond } from "@/components/dashboard/superadmin/Diamond";
import { C, ROLE_DISPLAY } from "../_shared/constants";
import type { ManagerData } from "../_shared/types";
import { getManagerStats, isOverdue } from "../_shared/utils";
import type { Manager } from "@/components/dashboard/superadmin/ManagerCard";

type SortKey = "completion" | "overdue" | "name";
const PAGE_SIZE = 8;

export default function ManagementMonitoringPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchName, setSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedManager, setSelectedManager] = useState<ManagerData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("completion");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

  const filteredManagers = useMemo(() => {
    const result = managers.filter((m) => {
      if (searchName && !m.full_name.toLowerCase().includes(searchName.toLowerCase()) && !m.role_name.toLowerCase().includes(searchName.toLowerCase())) return false;
      return true;
    }).map((m) => {
      const ft = m.tasks.map((task) => {
        const fi = (task.items ?? []).filter((item) => {
          if (!dateFrom && !dateTo) return true;
          const d = item.progress?.[0]?.completed_at ? new Date(item.progress[0].completed_at) : null;
          if (dateFrom && (!d || d < new Date(dateFrom))) return false;
          if (dateTo && (!d || d > new Date(dateTo + "T23:59:59"))) return false;
          return true;
        });
        return { ...task, items: fi };
      });
      return { ...m, tasks: ft };
    });
    result.sort((a, b) => {
      const sa = getManagerStats(a); const sb = getManagerStats(b);
      if (sortKey === "completion") return sa.rate - sb.rate;
      if (sortKey === "overdue") {
        const oa = a.tasks.flatMap((tk) => (tk.items ?? []).map((item) => ({ item, deadline: tk.deadline }))).filter((x) => isOverdue(x.deadline ?? null, x.item.progress?.[0]?.status ?? null)).length;
        const ob = b.tasks.flatMap((tk) => (tk.items ?? []).map((item) => ({ item, deadline: tk.deadline }))).filter((x) => isOverdue(x.deadline ?? null, x.item.progress?.[0]?.status ?? null)).length;
        return ob - oa;
      }
      return a.full_name.localeCompare(b.full_name);
    });
    return result;
  }, [managers, searchName, dateFrom, dateTo, sortKey]);

  const visibleManagers = useMemo(() => filteredManagers.slice(0, visibleCount), [filteredManagers, visibleCount]);
  const hasMore = visibleCount < filteredManagers.length;

  const metrics = useMemo(() => {
    const allItems = filteredManagers.flatMap((m) => m.tasks.flatMap((t) => (t.items ?? []).map((item) => ({ item, deadline: t.deadline }))));
    const total = allItems.length;
    const done = allItems.filter((i) => i.item.progress?.[0]?.status === "selesai").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const overdue = allItems.filter((i) => isOverdue(i.deadline ?? null, i.item.progress?.[0]?.status ?? null)).length;
    const atRisk = allItems.filter((i) => i.item.progress?.[0]?.status === "proses" && !isOverdue(i.deadline ?? null, i.item.progress?.[0]?.status ?? null)).length;
    const now = new Date(); now.setHours(23, 59, 59, 999);
    const twoDaysAhead = new Date(now.getTime() + 2 * 86400000);
    const dueSoon = allItems.filter((i) => { if (!i.deadline || i.item.progress?.[0]?.status === "selesai") return false; const d = new Date(i.deadline); return d >= now && d <= twoDaysAhead; }).length;
    return { completionRate, total, done, overdue, atRisk, dueSoon };
  }, [filteredManagers]);

  const showAlert = (type: "success" | "error", msg: string) => { setAlert({ type, message: msg }); setTimeout(() => setAlert(null), 3000); };
  const handleSaveNote = async (progressId: string) => {
    const note = noteInput[progressId]?.trim(); if (note === undefined) return;
    try {
      const res = await fetch("/api/superadmin/management-tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress_id: progressId, admin_notes: note || null }) });
      if (!res.ok) throw new Error("Gagal");
      showAlert("success", "Catatan tersimpan");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "management-tasks"] });
    } catch (e) { showAlert("error", e instanceof Error ? e.message : "Gagal"); }
  };
  const handleEscalate = async (manager: ManagerData) => {
    const allItems = manager.tasks.flatMap((tk) => (tk.items ?? []).map((item) => ({ item, taskTitle: tk.title, deadline: tk.deadline })));
    const oi = allItems.filter((i) => isOverdue(i.deadline ?? null, i.item.progress?.[0]?.status ?? null));
    const ai = allItems.filter((i) => i.item.progress?.[0]?.status === "proses" && !isOverdue(i.deadline ?? null, i.item.progress?.[0]?.status ?? null));
    const taskList = [...oi, ...ai].map((i) => `\u25C6 ${i.item.title} (${i.taskTitle})`).join("\n");
    const text = `Eskalasi \u2014 ${manager.full_name}\n\nTask perlu perhatian:\n${taskList}`;
    try { await navigator.clipboard.writeText(text); showAlert("success", "Template eskalasi disalin"); } catch { showAlert("error", "Gagal menyalin"); }
  };

  const hasFilters = !!(searchName || dateFrom || dateTo);
  const filterHint = hasFilters && filteredManagers.length !== managers.length ? `${filteredManagers.length} managers dari ${managers.length} total` : null;
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchName, dateFrom, dateTo, sortKey]);

  const inputBase = "block w-full rounded border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = { borderColor: "var(--color-parch-border)", color: "var(--color-text-ink)", background: "var(--color-parch-sidebar)" };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h2 className="text-[28px] leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: C.ink }}>Monitoring <i style={{ color: C.gold, fontWeight: 400 }}>Manajemen</i></h2>
              <p className="text-sm mt-0.5" style={{ color: C.faded }}>Pantau progress task leaders untuk keseluruhan divisi</p>
            </div>
            <div className="flex rounded overflow-hidden shrink-0" style={{ border: `1px solid ${C.border}` }}>
              <button onClick={() => setViewMode("cards")} className="px-3 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2" style={{ background: viewMode === "cards" ? C.gold : "var(--color-parch-sidebar)", color: viewMode === "cards" ? "#fff" : C.faded }}><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button onClick={() => setViewMode("table")} className="px-3 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2" style={{ background: viewMode === "table" ? C.gold : "var(--color-parch-sidebar)", color: viewMode === "table" ? "#fff" : C.faded }}><List className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <MetricsSection completionRate={metrics.completionRate} totalItems={metrics.total} doneItems={metrics.done} atRiskCount={metrics.atRisk} overdueCount={metrics.overdue} dueSoonCount={metrics.dueSoon} />

          <div className="sticky top-0 z-10 -mx-6 px-6 pt-3 pb-3 mb-3" style={{ background: "#F9FAFB", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Cari nama atau role..." className={inputBase} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }} onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative" ref={datePickerRef}>
                  <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
                    style={{ borderColor: dateFrom || dateTo ? C.gold : C.border, color: dateFrom || dateTo ? C.goldText : C.faded, background: C.card }}>
                    <Calendar className="h-3.5 w-3.5" />
                    {dateFrom || dateTo ? <span>{dateFrom ? new Date(dateFrom).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "…"}{" — "}{dateTo ? new Date(dateTo).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "…"}</span> : "Filter"}
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
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={inputBase + " w-auto text-xs"} style={inputStyle}><option value="completion">Completion ↑</option><option value="overdue">Overdue ↓</option><option value="name">Nama A-Z</option></select>
              </div>
            </div>
          </div>

          {filterHint && <p className="text-[11px] mb-3 italic" style={{ color: C.ghost }}>{filterHint}</p>}

          {isLoading ? <Loading variant="skeleton" text="Memuat data..." /> : filteredManagers.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              {hasFilters ? <div className="space-y-3"><p className="text-sm" style={{ color: C.faded }}>Tidak ada hasil{searchName ? ` untuk "${searchName}"` : null}</p></div> : <p style={{ color: C.ghost }}>Belum ada data manager dengan task.</p>}
            </div>
          ) : viewMode === "cards" ? (
            <><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{visibleManagers.map((m) => <ManagerCard key={m.id} manager={m as Manager} onViewAll={setSelectedManager} onEscalate={handleEscalate} />)}</div>
              {hasMore && <div className="flex justify-center mt-4"><button onClick={() => setVisibleCount((p) => Math.min(p + PAGE_SIZE, filteredManagers.length))} className="rounded px-6 py-2.5 text-sm font-medium" style={{ border: `1px solid ${C.border}`, color: C.goldText, background: "var(--color-parch-sidebar)" }}>Tampilkan {Math.min(PAGE_SIZE, filteredManagers.length - visibleCount)} lainnya · {filteredManagers.length - visibleCount} tersisa</button></div>}</>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <table className="w-full text-sm">
                <thead style={{ background: C.header }}><tr>{["Manager", "Progress", "Status", "Aksi"].map((h) => <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: C.faded, borderBottom: `0.5px solid ${C.goldDim}` }}>{h}</th>)}</tr></thead>
                <tbody>{filteredManagers.map((m) => {
                  const stats = getManagerStats(m);
                  const allItems = m.tasks.flatMap((t) => (t.items ?? []).map((item) => ({ item, deadline: t.deadline })));
                  const overdue = allItems.filter((i) => isOverdue(i.deadline ?? null, i.item.progress?.[0]?.status ?? null)).length;
                  return (<tr key={m.id} style={{ borderBottom: `0.5px solid ${C.goldDim}` }}>
                    <td className="px-5 py-3"><p className="leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: C.ink }}>{m.full_name}</p><p className="text-[11px]" style={{ color: C.faded }}>{ROLE_DISPLAY[m.role_name] ?? m.role_name}</p></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="flex-1 flex gap-0.5 max-w-[120px]">{[...Array(stats.total)].map((_, i) => { const st = allItems[i]?.item.progress?.[0]?.status ?? "belum"; return <div key={i} className="flex-1 h-1" style={{ background: st === "selesai" ? C.sage : st === "proses" ? C.gold : C.border }} />; })}</div><span className="text-xs" style={{ color: C.sepia, fontFamily: "var(--font-display)" }}>{stats.rate}%</span></div></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-1.5 flex-wrap">{stats.done > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--color-sage-bg)", color: C.sage, border: "1px solid var(--color-sage-border)", borderRadius: 2 }}><Diamond size={4} />{stats.done}</span>}{overdue > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--color-terra-bg)", color: C.terra, border: "1px solid var(--color-terra-border)", borderRadius: 2 }}><Diamond size={4} />{overdue}</span>}</div></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2"><button onClick={() => setSelectedManager(m)} className="rounded px-3 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.border}`, color: C.sepia }}>Detail</button></div></td>
                  </tr>);
                })}</tbody>
              </table>
            </div>
          )}
        </main>
      </div>
      {selectedManager && <TaskDetailModal manager={selectedManager as unknown as Manager} noteInput={noteInput} setNoteInput={setNoteInput} onSaveNote={handleSaveNote} onClose={() => setSelectedManager(null)} />}
    </div>
  );
}
