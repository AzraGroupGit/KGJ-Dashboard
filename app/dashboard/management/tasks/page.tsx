// app/dashboard/management/tasks/page.tsx

"use client";

import { useState, useEffect } from "react";
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
import { Plus, Trash2, Check, ChevronDown, ChevronRight, Calendar, MessageSquare } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  sort_order: number;
  progress: Array<{
    id: string;
    is_completed: boolean; completed_at: string | null;
    status: string | null;
    admin_notes: string | null;
    notes: string | null;
    kendala: string | null;
  }> | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  items: TaskItem[] | null;
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
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "task" | "item"; id: string; title: string } | null>(null);

  useEffect(() => {
    const u = getClientUser();
    if (!u) { router.push("/login"); return; }
    setClientUser(u);
  }, [router]);

  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: Task[] }>({
    queryKey: ["management-tasks"],
    queryFn: () => fetcher("/api/management/tasks"),
  });

  const tasks = data?.data ?? [];

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/management/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle, deadline: newTaskDeadline || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewTaskTitle("");
      setNewTaskDeadline("");
      refetch();
      showAlert("success", "Task berhasil ditambahkan");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Gagal");
    } finally { setIsSaving(false); }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget || deleteTarget.type !== "task") return;
    try {
      await fetch(`/api/management/tasks/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      refetch();
    } catch (_) {}
  };

  const handleAddItem = async (taskId: string) => {
    const title = newItemTitle[taskId]?.trim();
    if (!title) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/management/tasks/${taskId}/items`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewItemTitle((prev) => ({ ...prev, [taskId]: "" }));
      refetch();
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Gagal");
    } finally { setIsSaving(false); }
  };

  const handleCycleStatus = async (itemId: string, currentStatus: string | null) => {
    const nextStatus = currentStatus === "selesai" ? "pending" : currentStatus === "proses" ? "selesai" : "proses";
    try {
      await fetch(`/api/management/tasks/items/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      queryClient.invalidateQueries({ queryKey: ["management-tasks"] });
    } catch (_) {}
  };

  const getStatusStyle = (status: string | null) => {
    switch (status) {
      case "selesai": return "bg-emerald-500 border-emerald-500 text-white";
      case "proses": return "bg-orange-400 border-orange-400 text-white";
      default: return "border-rose-300 bg-white";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "selesai": return "Selesai";
      case "proses": return "Proses";
      default: return "Belum";
    }
  };

  const handleSaveItemNote = async (itemId: string, field: "notes" | "kendala", value: string) => {
    try {
      await fetch(`/api/management/tasks/items/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      queryClient.invalidateQueries({ queryKey: ["management-tasks"] });
    } catch (_) {}
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return;
    try {
      await fetch(`/api/management/tasks/items/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      refetch();
    } catch (_) {}
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar role="management" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="management" />
        <main className="flex-1 overflow-y-auto p-6">
          {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Tugas</h1>
              <p className="text-sm text-stone-500">Kelola checklist tugas harian Anda</p>
            </div>
          </div>

          <div className="mb-6 flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input label="Task" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Judul task baru..." disabled={isSaving} />
            </div>
            <Input label="Deadline (Opsional)" type="date" fullWidth={false} value={newTaskDeadline} onChange={(e) => setNewTaskDeadline(e.target.value)} disabled={isSaving} />
            <Button variant="primary" onClick={handleAddTask} disabled={isSaving || !newTaskTitle.trim()} leftIcon={<Plus className="w-4 h-4" />} className="ml-auto sm:ml-0">
              Tambah
            </Button>
          </div>

          {isLoading ? (
            <Loading variant="skeleton" text="Memuat tasks..." />
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-stone-400">Belum ada task.</div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const items = task.items ?? [];
                const done = items.filter((i) => i.progress?.[0]?.is_completed).length;
                const isExpanded = expandedTasks.has(task.id);
                return (
                  <div key={task.id} className="rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 px-5 py-4">
                      <button onClick={() => toggleExpand(task.id)} className="text-stone-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          {items.length > 0 && <span>{done}/{items.length} selesai</span>}
                          {task.deadline && (
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(task.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setDeleteTarget({ type: "task", id: task.id, title: task.title })} className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-stone-100 px-5 py-3 space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCycleStatus(item.id, item.progress?.[0]?.status ?? null)}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${getStatusStyle(item.progress?.[0]?.status ?? null)}`}>
                                {item.progress?.[0]?.status === "selesai" ? <Check className="w-3 h-3" /> : item.progress?.[0]?.status === "proses" ? "…" : ""}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${item.progress?.[0]?.status === "selesai" ? "text-stone-400 line-through" : "text-stone-700"}`}>{item.title}</span>
                                <span className={`ml-2 text-[10px] font-medium ${item.progress?.[0]?.status === "selesai" ? "text-emerald-600" : item.progress?.[0]?.status === "proses" ? "text-orange-500" : "text-rose-400"}`}>
                                  {getStatusLabel(item.progress?.[0]?.status ?? null)}
                                </span>
                              </div>
                              <button onClick={() => setDeleteTarget({ type: "item", id: item.id, title: item.title })} className="text-stone-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex gap-2 ml-0 sm:ml-7 flex-wrap sm:flex-nowrap">
                              <input type="text"
                                value={itemNotes[item.id] !== undefined ? itemNotes[item.id] : (item.progress?.[0]?.notes ?? "")}
                                onChange={(e) => setItemNotes((p) => ({ ...p, [item.id]: e.target.value }))}
                                onBlur={() => handleSaveItemNote(item.id, "notes", itemNotes[item.id] ?? item.progress?.[0]?.notes ?? "")}
                                placeholder="Catatan..." disabled={isSaving}
                                className="flex-1 min-w-0 rounded-md border border-stone-200 px-2 py-1 text-[11px] text-stone-600 bg-white focus:border-indigo-400 focus:outline-none" />
                              <input type="text"
                                value={itemKendala[item.id] !== undefined ? itemKendala[item.id] : (item.progress?.[0]?.kendala ?? "")}
                                onChange={(e) => setItemKendala((p) => ({ ...p, [item.id]: e.target.value }))}
                                onBlur={() => handleSaveItemNote(item.id, "kendala", itemKendala[item.id] ?? item.progress?.[0]?.kendala ?? "")}
                                placeholder="Kendala..."
                                className="flex-1 min-w-0 rounded-md border border-rose-200 px-2 py-1 text-[11px] text-rose-600 bg-white focus:border-rose-400 focus:outline-none"
                                disabled={isSaving} />
                            </div>
                            {item.progress?.[0]?.admin_notes && (
                              <p className="text-[10px] text-indigo-600 ml-0 sm:ml-7 mt-1 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 shrink-0" />Admin: {item.progress[0].admin_notes}
                              </p>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <Input value={newItemTitle[task.id] || ""} onChange={(e) => setNewItemTitle((p) => ({ ...p, [task.id]: e.target.value }))}
                            placeholder="Item baru..." disabled={isSaving} />
                          <Button variant="outline" size="sm" onClick={() => handleAddItem(task.id)} disabled={isSaving || !newItemTitle[task.id]?.trim()} leftIcon={<Plus className="w-3 h-3" />}>Tambah</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        variant="danger"
        title={deleteTarget?.type === "task" ? "Hapus Task" : "Hapus Item"}
        message={deleteTarget ? `Yakin ingin menghapus "${deleteTarget.title}"? Tindakan ini tidak dapat dibatalkan.` : ""}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={deleteTarget?.type === "task" ? handleDeleteTask : handleDeleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
