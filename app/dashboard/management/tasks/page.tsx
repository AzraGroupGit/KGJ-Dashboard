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
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  Calendar,
  MessageSquare,
  ClipboardList,
  StickyNote,
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  sort_order: number;
  progress: Array<{
    id: string;
    is_completed: boolean;
    completed_at: string | null;
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

type FilterTab = "all" | "pending" | "done";

// ── Helpers ──────────────────────────────────────────────────────────

function getDeadlineUrgency(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() < now.getTime()) return "overdue" as const;
  if (d.getTime() === now.getTime()) return "today" as const;
  return "future" as const;
}

function formatDate(deadline: string) {
  return new Date(deadline).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

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
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "task" | "item";
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const u = getClientUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setClientUser(u);
  }, [router]);

  const { data, isLoading, refetch } = useQuery<{
    success: boolean;
    data: Task[];
  }>({
    queryKey: ["management-tasks"],
    queryFn: () => fetcher("/api/management/tasks"),
  });

  const tasks = useMemo(() => data?.data ?? [], [data]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((task) => {
      const items = task.items ?? [];
      const allDone =
        items.length > 0 &&
        items.every((i) => i.progress?.[0]?.is_completed);
      if (filter === "done") return allDone;
      return !allDone || items.length === 0;
    });
  }, [tasks, filter]);

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/management/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          deadline: newTaskDeadline || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewTaskTitle("");
      setNewTaskDeadline("");
      refetch();
      showAlert("success", "Task berhasil ditambahkan");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget || deleteTarget.type !== "task") return;
    try {
      await fetch(`/api/management/tasks/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      refetch();
    } catch {}
  };

  const handleAddItem = async (taskId: string) => {
    const title = newItemTitle[taskId]?.trim();
    if (!title) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/management/tasks/${taskId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewItemTitle((prev) => ({ ...prev, [taskId]: "" }));
      refetch();
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCycleStatus = async (
    itemId: string,
    currentStatus: string | null,
  ) => {
    const nextStatus =
      currentStatus === "selesai"
        ? "pending"
        : currentStatus === "proses"
          ? "selesai"
          : "proses";
    try {
      await fetch(`/api/management/tasks/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      queryClient.invalidateQueries({ queryKey: ["management-tasks"] });
    } catch {}
  };

  const getStatusStyle = (status: string | null) => {
    switch (status) {
      case "selesai":
        return "bg-emerald-500 border-emerald-500 text-white";
      case "proses":
        return "bg-orange-400 border-orange-400 text-white";
      default:
        return "border-rose-300 bg-white";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "selesai":
        return "Selesai";
      case "proses":
        return "Proses";
      default:
        return "Belum";
    }
  };

  const handleSaveItemNote = async (
    itemId: string,
    field: "notes" | "kendala",
    value: string,
  ) => {
    try {
      await fetch(`/api/management/tasks/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      queryClient.invalidateQueries({ queryKey: ["management-tasks"] });
    } catch {}
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return;
    try {
      await fetch(`/api/management/tasks/items/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      refetch();
    } catch {}
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleNotes = (itemId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar role="management" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="management" />
        <main className="flex-1 overflow-y-auto p-6">
          {alert && (
            <div className="mb-4">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            </div>
          )}

          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Tugas</h1>
              <p className="text-sm text-stone-500">
                Kelola checklist tugas harian Anda
              </p>
            </div>
          </div>

          {/* ── Input bar ── */}
          <div className="mb-6 flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Task"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Judul task baru..."
                disabled={isSaving}
              />
            </div>
            <Input
              label="Deadline (Opsional)"
              type="date"
              fullWidth={false}
              value={newTaskDeadline}
              onChange={(e) => setNewTaskDeadline(e.target.value)}
              disabled={isSaving}
            />
            <Button
              variant="primary"
              onClick={handleAddTask}
              disabled={isSaving || !newTaskTitle.trim()}
              leftIcon={<Plus className="w-4 h-4" />}
              className="ml-auto sm:ml-0"
            >
              Tambah
            </Button>
          </div>

          {/* ── Filter tabs ── */}
          {tasks.length > 0 && (
            <div className="flex gap-1 mb-4">
              {(
                [
                  ["all", "Semua"],
                  ["pending", "Belum"],
                  ["done", "Selesai"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    filter === key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Task list ── */}
          {isLoading ? (
            <Loading variant="skeleton" text="Memuat tasks..." />
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <ClipboardList className="w-12 h-12 mb-3 text-stone-300" />
              <p className="text-sm font-medium text-stone-400">
                {tasks.length === 0
                  ? "Belum ada task"
                  : filter === "done"
                    ? "Belum ada task selesai"
                    : "Semua task selesai"}
              </p>
              <p className="text-xs text-stone-300 mt-1">
                {tasks.length === 0
                  ? "Tambahkan task pertama Anda di atas"
                  : filter === "done"
                    ? "Selesaikan task untuk melihatnya di sini"
                    : "Pilih tab \"Semua\" untuk melihat semua task"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const items = task.items ?? [];
                const done = items.filter(
                  (i) => i.progress?.[0]?.is_completed,
                ).length;
                const allDone = items.length > 0 && done === items.length;
                const someProgress = items.length > 0 && done > 0 && !allDone;
                const untouched = items.length === 0;
                const deadlineUrgency = getDeadlineUrgency(task.deadline);
                const isExpanded = expandedTasks.has(task.id);

                const cardBorderClass = allDone
                  ? "border-l-emerald-400 border-l-2"
                  : deadlineUrgency === "overdue"
                    ? "border-l-red-400 border-l-2"
                    : deadlineUrgency === "today"
                      ? "border-l-amber-400 border-l-2"
                      : "";

                return (
                  <div
                    key={task.id}
                    className={`group rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden ${cardBorderClass} ${untouched ? "opacity-75" : ""}`}
                  >
                    {/* ── Card header ── */}
                    <div className="flex items-center gap-3 px-5 py-4">
                      <button
                        onClick={() => toggleExpand(task.id)}
                        className="text-stone-400 shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {/* Progress bar */}
                          {items.length > 0 && !untouched && (
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${(done / items.length) * 100}%`,
                                    background: allDone
                                      ? "#10b981"
                                      : someProgress
                                        ? "#f59e0b"
                                        : "#e5e7eb",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-stone-400 tabular-nums">
                                {done}/{items.length}
                              </span>
                            </div>
                          )}
                          {task.deadline && (
                            <span
                              className={`flex items-center gap-1 text-xs ${
                                deadlineUrgency === "overdue"
                                  ? "text-red-500 font-medium"
                                  : deadlineUrgency === "today"
                                    ? "text-amber-600 font-medium"
                                    : "text-stone-400"
                              }`}
                            >
                              <Calendar className="h-3 w-3" />
                              {deadlineUrgency === "overdue"
                                ? `Terlambat — ${formatDate(task.deadline)}`
                                : formatDate(task.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: "task",
                            id: task.id,
                            title: task.title,
                          })
                        }
                        className="p-1.5 text-stone-300 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* ── Expanded items ── */}
                    {isExpanded && (
                      <div className="border-t border-stone-100 px-5 py-3 space-y-2">
                        {items.map((item) => {
                          const notesOpen = expandedNotes.has(item.id);
                          return (
                            <div key={item.id} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleCycleStatus(
                                      item.id,
                                      item.progress?.[0]?.status ?? null,
                                    )
                                  }
                                  className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${getStatusStyle(item.progress?.[0]?.status ?? null)}`}
                                >
                                  {item.progress?.[0]?.status === "selesai" ? (
                                    <Check className="w-3 h-3" />
                                  ) : item.progress?.[0]?.status === "proses" ? (
                                    "…"
                                  ) : (
                                    ""
                                  )}
                                </button>
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <span
                                    className={`text-sm ${
                                      item.progress?.[0]?.status === "selesai"
                                        ? "text-stone-400 line-through"
                                        : "text-stone-700"
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium shrink-0 ${
                                      item.progress?.[0]?.status === "selesai"
                                        ? "text-emerald-600"
                                        : item.progress?.[0]?.status === "proses"
                                          ? "text-orange-500"
                                          : "text-rose-400"
                                    }`}
                                  >
                                    {getStatusLabel(
                                      item.progress?.[0]?.status ?? null,
                                    )}
                                  </span>
                                </div>
                                <button
                                  onClick={() => toggleNotes(item.id)}
                                  className={`p-1 rounded transition-colors shrink-0 ${
                                    notesOpen
                                      ? "text-indigo-500 bg-indigo-50"
                                      : "text-stone-300 hover:text-stone-500"
                                  }`}
                                  title="Toggle notes"
                                >
                                  <StickyNote className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "item",
                                      id: item.id,
                                      title: item.title,
                                    })
                                  }
                                  className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* ── Collapsible notes ── */}
                              {notesOpen && (
                                <div className="flex gap-2 ml-0 sm:ml-7 flex-wrap sm:flex-nowrap">
                                  <input
                                    type="text"
                                    value={
                                      itemNotes[item.id] !== undefined
                                        ? itemNotes[item.id]
                                        : (item.progress?.[0]?.notes ?? "")
                                    }
                                    onChange={(e) =>
                                      setItemNotes((p) => ({
                                        ...p,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    onBlur={() =>
                                      handleSaveItemNote(
                                        item.id,
                                        "notes",
                                        itemNotes[item.id] ??
                                          item.progress?.[0]?.notes ??
                                          "",
                                      )
                                    }
                                    placeholder="Catatan..."
                                    disabled={isSaving}
                                    className="flex-1 min-w-0 rounded-md border border-stone-200 px-2 py-1 text-[11px] text-stone-600 bg-white focus:border-indigo-400 focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={
                                      itemKendala[item.id] !== undefined
                                        ? itemKendala[item.id]
                                        : (item.progress?.[0]?.kendala ?? "")
                                    }
                                    onChange={(e) =>
                                      setItemKendala((p) => ({
                                        ...p,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    onBlur={() =>
                                      handleSaveItemNote(
                                        item.id,
                                        "kendala",
                                        itemKendala[item.id] ??
                                          item.progress?.[0]?.kendala ??
                                          "",
                                      )
                                    }
                                    placeholder="Kendala..."
                                    className="flex-1 min-w-0 rounded-md border border-rose-200 px-2 py-1 text-[11px] text-rose-600 bg-white focus:border-rose-400 focus:outline-none"
                                    disabled={isSaving}
                                  />
                                </div>
                              )}

                              {/* ── Admin notes ── */}
                              {item.progress?.[0]?.admin_notes && (
                                <p className="text-xs text-indigo-600 ml-0 sm:ml-7 mt-1 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 shrink-0" />
                                  Admin: {item.progress[0].admin_notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex gap-2 pt-2">
                          <Input
                            value={newItemTitle[task.id] || ""}
                            onChange={(e) =>
                              setNewItemTitle((p) => ({
                                ...p,
                                [task.id]: e.target.value,
                              }))
                            }
                            placeholder="Item baru..."
                            disabled={isSaving}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddItem(task.id)}
                            disabled={
                              isSaving || !newItemTitle[task.id]?.trim()
                            }
                            leftIcon={<Plus className="w-3 h-3" />}
                          >
                            Tambah
                          </Button>
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
        title={
          deleteTarget?.type === "task" ? "Hapus Task" : "Hapus Item"
        }
        message={
          deleteTarget
            ? `Yakin ingin menghapus "${deleteTarget.title}"? Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={
          deleteTarget?.type === "task"
            ? handleDeleteTask
            : handleDeleteItem
        }
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
