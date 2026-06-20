// app/dashboard/management/tasks/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  Plus, Trash2, Check, ChevronDown, ChevronRight, Calendar, MessageSquare,
  ClipboardList, StickyNote, AlertTriangle, CalendarClock,
} from "lucide-react";
import { C } from "../../superadmin/management/_shared/constants";
import type { Task } from "../../superadmin/management/_shared/types";

type FilterTab = "all" | "pending" | "done";

function getDeadlineUrgency(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() < now.getTime()) return "overdue" as const;
  if (d.getTime() === now.getTime()) return "today" as const;
  return "future" as const;
}

function formatDate(deadline: string) {
  return new Date(deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatusStyle(status: string | null) {
  switch (status) {
    case "selesai": return "bg-[#4A7A3A] border-[#4A7A3A] text-white";
    case "proses": return "bg-[#8A6010] border-[#8A6010] text-white";
    default: return "border-[#9A3A20] bg-white";
  }
}

function getStatusLabel(status: string | null) {
  switch (status) { case "selesai": return "Selesai"; case "proses": return "Proses"; default: return "Belum"; }
}

export default function ManagementTasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newItemTitle, setNewItemTitle] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemKendala, setItemKendala] = useState<Record<string, string>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterTab>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "task" | "item"; id: string; title: string } | null>(null);
  const [showClearDone, setShowClearDone] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => { const u = getClientUser(); if (!u) { router.push("/login"); return; } setClientUser(u); }, [router]);

  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: Task[] }>({
    queryKey: ["management-tasks"],
    queryFn: () => fetcher("/api/management/tasks"),
  });

  const tasks = useMemo(() => data?.data ?? [], [data]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((task) => {
      const items = task.items ?? [];
      const allDone = items.length > 0 && items.every((i) => i.progress?.[0]?.is_completed);
      if (filter === "done") return allDone;
      return !allDone || items.length === 0;
    });
  }, [tasks, filter]);

  const taskStats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let overdue = 0, dueToday = 0;
    tasks.forEach((task) => {
      if (!task.deadline) return;
      const items = task.items ?? [];
      const allDone = items.length > 0 && items.every((i) => i.progress?.[0]?.is_completed);
      if (allDone) return;
      const d = new Date(task.deadline); d.setHours(0, 0, 0, 0);
      if (d.getTime() < today.getTime()) overdue++;
      else if (d.getTime() === today.getTime()) dueToday++;
    });
    return { overdue, dueToday, total: tasks.length };
  }, [tasks]);

  const doneCount = useMemo(() => {
    let count = 0;
    tasks.forEach((task) => { (task.items ?? []).forEach((item) => { if (item.progress?.[0]?.status === "selesai") count++; }); });
    return count;
  }, [tasks]);

  const showAlert = (type: "success" | "error", message: string) => { setAlert({ type, message }); setTimeout(() => setAlert(null), 3000); };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return; setIsSaving(true);
    try {
      const res = await fetch("/api/management/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTaskTitle, deadline: newTaskDeadline || undefined }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewTaskTitle(""); setNewTaskDeadline(""); refetch(); showAlert("success", "Task berhasil ditambahkan");
    } catch (e) { showAlert("error", e instanceof Error ? e.message : "Gagal"); } finally { setIsSaving(false); }
  };

  const handleDeleteTask = async () => { if (!deleteTarget || deleteTarget.type !== "task") return; try { await fetch(`/api/management/tasks/${deleteTarget.id}`, { method: "DELETE" }); setDeleteTarget(null); refetch(); } catch {} };
  const handleAddItem = async (taskId: string) => {
    const title = newItemTitle[taskId]?.trim(); if (!title) return; setIsSaving(true);
    try { const res = await fetch(`/api/management/tasks/${taskId}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }); if (!res.ok) throw new Error((await res.json()).error); setNewItemTitle((prev) => ({ ...prev, [taskId]: "" })); refetch(); } catch (e) { showAlert("error", e instanceof Error ? e.message : "Gagal"); } finally { setIsSaving(false); }
  };
  const handleCycleStatus = async (itemId: string, currentStatus: string | null) => {
    const nextStatus = currentStatus === "selesai" ? "pending" : currentStatus === "proses" ? "selesai" : "proses";
    try { await fetch(`/api/management/tasks/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) }); queryClient.invalidateQueries({ queryKey: ["management-tasks"] }); } catch {}
  };
  const handleSaveItemNote = async (itemId: string, field: "notes" | "kendala", value: string) => {
    try { await fetch(`/api/management/tasks/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value || null }) }); queryClient.invalidateQueries({ queryKey: ["management-tasks"] }); } catch {}
  };
  const handleDeleteItem = async () => { if (!deleteTarget || deleteTarget.type !== "item") return; try { await fetch(`/api/management/tasks/items/${deleteTarget.id}`, { method: "DELETE" }); setDeleteTarget(null); refetch(); } catch {} };
  const handleClearDone = async () => {
    setIsClearing(true);
    try { const res = await fetch("/api/management/tasks", { method: "DELETE" }); const json = await res.json(); if (!res.ok) throw new Error(json.error); showAlert("success", `${json.deleted} item selesai dihapus`); setShowClearDone(false); refetch(); } catch (e) { showAlert("error", e instanceof Error ? e.message : "Gagal"); } finally { setIsClearing(false); }
  };
  const toggleExpand = (taskId: string) => setExpandedTasks((prev) => { const n = new Set(prev); if (n.has(taskId)) n.delete(taskId); else n.add(taskId); return n; });
  const toggleNotes = (itemId: string) => setExpandedNotes((prev) => { const n = new Set(prev); if (n.has(itemId)) n.delete(itemId); else n.add(itemId); return n; });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="management" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="management" />
        <div className="flex items-center gap-4 px-6 py-2" style={{ background: C.card, borderBottom: `0.5px solid ${C.goldDim}` }}>
          {[{ icon: <AlertTriangle className="h-3.5 w-3.5" style={{ color: C.terra }} />, label: "Overdue", value: taskStats.overdue, color: C.terra },
            { icon: <CalendarClock className="h-3.5 w-3.5" style={{ color: C.amber }} />, label: "Hari Ini", value: taskStats.dueToday, color: C.amber },
            { icon: <ClipboardList className="h-3.5 w-3.5" style={{ color: C.ghost }} />, label: "Total", value: taskStats.total, color: C.ink }]
            .map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs"><span style={{ color: C.faded }}>{label}</span><span className="font-semibold tabular-nums" style={{ color }}>{value}</span></div>
            ))}
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div><h1 className="text-2xl leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: C.ink }}>Tugas</h1><p className="text-sm" style={{ color: C.faded }}>Kelola checklist tugas harian Anda</p></div>
            {doneCount > 0 && <button onClick={() => setShowClearDone(true)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition" style={{ background: C.card, borderColor: C.border, color: C.faded }}><Trash2 className="h-3.5 w-3.5" />Hapus {doneCount} Selesai</button>}
          </div>

          <div className="mb-6 flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><Input label="Task" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Judul task baru..." disabled={isSaving} /></div>
            <Input label="Deadline (Opsional)" type="date" fullWidth={false} value={newTaskDeadline} onChange={(e) => setNewTaskDeadline(e.target.value)} disabled={isSaving} />
            <Button variant="primary" onClick={handleAddTask} disabled={isSaving || !newTaskTitle.trim()} leftIcon={<Plus className="w-4 h-4" />} className="ml-auto sm:ml-0">Tambah</Button>
          </div>

          {tasks.length > 0 && (
            <div className="flex gap-1 mb-4">
              {(["all", "pending", "done"] as const).map((key) => (
                <button key={key} onClick={() => setFilter(key)} className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors" style={{ background: filter === key ? C.gold : C.card, color: filter === key ? "#fff" : C.faded, border: filter === key ? "1px solid transparent" : `1px solid ${C.border}` }}>
                  {key === "all" ? "Semua" : key === "pending" ? "Belum" : "Selesai"}
                </button>
              ))}
            </div>
          )}

          {isLoading ? <Loading variant="skeleton" text="Memuat tasks..." /> : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}><ClipboardList className="w-12 h-12 mb-3" style={{ color: C.ghost }} /><p className="text-sm font-medium" style={{ color: C.faded }}>{tasks.length === 0 ? "Belum ada task" : filter === "done" ? "Belum ada task selesai" : "Semua task selesai"}</p></div>
          ) : (
            <div className="space-y-3">{filteredTasks.map((task) => {
              const items = task.items ?? []; const done = items.filter((i) => i.progress?.[0]?.is_completed).length; const allDone = items.length > 0 && done === items.length;
              const someProgress = items.length > 0 && done > 0 && !allDone; const untouched = items.length === 0;
              const deadlineUrgency = getDeadlineUrgency(task.deadline ?? null); const isExpanded = expandedTasks.has(task.id);
              const cardBorderStyle = allDone ? { borderLeft: `2px solid ${C.sage}` } : deadlineUrgency === "overdue" ? { borderLeft: `2px solid ${C.terra}` } : deadlineUrgency === "today" ? { borderLeft: `2px solid ${C.amber}` } : {};
              const progressBg = allDone ? C.sage : someProgress ? C.gold : C.border;
              return (
                <div key={task.id} className="group rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}`, opacity: untouched ? 0.75 : 1, ...cardBorderStyle }}>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => toggleExpand(task.id)} style={{ color: C.ghost }} className="shrink-0">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                    <div className="flex-1 min-w-0"><p className="font-semibold" style={{ color: C.ink }}>{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {items.length > 0 && !untouched && <div className="flex items-center gap-2"><div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${(done / items.length) * 100}%`, background: progressBg }} /></div><span className="text-[10px] tabular-nums" style={{ color: C.faded }}>{done}/{items.length}</span></div>}
                        {task.deadline && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: deadlineUrgency === "overdue" ? C.terra : deadlineUrgency === "today" ? C.amber : C.ghost }}><Calendar className="h-3 w-3" />{deadlineUrgency === "overdue" ? `Terlambat \u2014 ${formatDate(task.deadline)}` : formatDate(task.deadline)}</span>}
                      </div>
                    </div>
                    <button onClick={() => setDeleteTarget({ type: "task", id: task.id, title: task.title })} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: C.ghost }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {isExpanded && (
                    <div className="px-5 py-3 space-y-2" style={{ borderTop: `0.5px solid ${C.goldDim}` }}>
                      {items.map((item) => {
                        const notesOpen = expandedNotes.has(item.id);
                        return (
                          <div key={item.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleCycleStatus(item.id, item.progress?.[0]?.status ?? null)} className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${getStatusStyle(item.progress?.[0]?.status ?? null)}`}>{item.progress?.[0]?.status === "selesai" ? <Check className="w-3 h-3" /> : item.progress?.[0]?.status === "proses" ? "…" : ""}</button>
                              <div className="flex-1 min-w-0 flex items-center gap-2"><span className="text-sm" style={{ color: item.progress?.[0]?.status === "selesai" ? C.faded : C.sepia, textDecoration: item.progress?.[0]?.status === "selesai" ? "line-through" : "none" }}>{item.title}</span><span className="text-[10px] font-medium shrink-0" style={{ color: item.progress?.[0]?.status === "selesai" ? C.sage : item.progress?.[0]?.status === "proses" ? C.amber : C.terra }}>{getStatusLabel(item.progress?.[0]?.status ?? null)}</span></div>
                              <button onClick={() => toggleNotes(item.id)} className="p-1 rounded transition-colors shrink-0" style={{ color: notesOpen ? C.gold : C.ghost, background: notesOpen ? C.raised : "transparent" }}><StickyNote className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteTarget({ type: "item", id: item.id, title: item.title })} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: C.ghost }}><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            {notesOpen && (
                              <div className="flex gap-2 ml-0 sm:ml-7 flex-wrap sm:flex-nowrap">
                                <input type="text" value={itemNotes[item.id] !== undefined ? itemNotes[item.id] : (item.progress?.[0]?.notes ?? "")} onChange={(e) => setItemNotes((p) => ({ ...p, [item.id]: e.target.value }))} onBlur={() => handleSaveItemNote(item.id, "notes", itemNotes[item.id] ?? item.progress?.[0]?.notes ?? "")} placeholder="Catatan..." disabled={isSaving} className="flex-1 min-w-0 rounded-md border px-2 py-1 text-[11px] bg-white focus:outline-none" style={{ borderColor: C.border, color: C.sepia }} />
                                <input type="text" value={itemKendala[item.id] !== undefined ? itemKendala[item.id] : (item.progress?.[0]?.kendala ?? "")} onChange={(e) => setItemKendala((p) => ({ ...p, [item.id]: e.target.value }))} onBlur={() => handleSaveItemNote(item.id, "kendala", itemKendala[item.id] ?? item.progress?.[0]?.kendala ?? "")} placeholder="Kendala..." className="flex-1 min-w-0 rounded-md border px-2 py-1 text-[11px] bg-white focus:outline-none" style={{ borderColor: C.border, color: C.terra }} disabled={isSaving} />
                              </div>
                            )}
                            {item.progress?.[0]?.admin_notes && <p className="text-xs ml-0 sm:ml-7 mt-1 flex items-center gap-1" style={{ color: C.faded }}><MessageSquare className="w-3 h-3 shrink-0" />Admin: {item.progress[0].admin_notes}</p>}
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-2"><Input value={newItemTitle[task.id] || ""} onChange={(e) => setNewItemTitle((p) => ({ ...p, [task.id]: e.target.value }))} placeholder="Item baru..." disabled={isSaving} /><Button variant="outline" size="sm" onClick={() => handleAddItem(task.id)} disabled={isSaving || !newItemTitle[task.id]?.trim()} leftIcon={<Plus className="w-3 h-3" />}>Tambah</Button></div>
                    </div>
                  )}
                </div>
              );
            })}</div>
          )}
        </main>
      </div>
      <ConfirmDialog isOpen={!!deleteTarget} variant="danger" title={deleteTarget?.type === "task" ? "Hapus Task" : "Hapus Item"} message={deleteTarget ? `Yakin ingin menghapus "${deleteTarget.title}"?` : ""} confirmText="Hapus" cancelText="Batal" onConfirm={deleteTarget?.type === "task" ? handleDeleteTask : handleDeleteItem} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog isOpen={showClearDone} variant="danger" title="Hapus Semua Item Selesai?" message={`${doneCount} item selesai akan dihapus permanen.`} confirmText="Hapus Semua" cancelText="Batal" isLoading={isClearing} onConfirm={handleClearDone} onCancel={() => setShowClearDone(false)} />
    </div>
  );
}
