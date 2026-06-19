"use client";

import React, { useEffect, useCallback, useState } from "react";
import { X, MessageSquare, AlertCircle, ChevronDown, ChevronRight, Check, Clock } from "lucide-react";
import Input from "@/components/ui/Input";
import { formatRelativeDeadline } from "./ManagerCard";

interface ProgressRow {
  id: string;
  is_completed: boolean;
  completed_at: string | null;
  status: string | null;
  admin_notes: string | null;
  notes: string | null;
  kendala: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  sort_order: number;
  progress: ProgressRow[] | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  items: TaskItem[] | null;
}

interface Manager {
  id: string;
  full_name: string;
  username: string;
  role_name: string;
  tasks: Task[];
}

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

export function TaskDetailModal({
  manager,
  noteInput,
  setNoteInput,
  onSaveNote,
  onClose,
}: {
  manager: Manager;
  noteInput: Record<string, string>;
  setNoteInput: (
    fn: (prev: Record<string, string>) => Record<string, string>,
  ) => void;
  onSaveNote: (progressId: string) => Promise<void>;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const allItems = manager.tasks.flatMap((task) =>
    (task.items ?? []).map((item) => ({ item, task })),
  );

  const itemsByTask = useCallback(() => {
    return manager.tasks.map((task) => ({
      task,
      items: (task.items ?? []).map((item) => ({ item, task })),
    }));
  }, [manager.tasks])();

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => {
    const s = new Set<string>();
    manager.tasks.forEach((t) => s.add(t.id));
    return s;
  });

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(44, 24, 16, 0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          background: "var(--color-parch-sidebar)",
          border: "1px solid var(--color-parch-border)",
        }}
      >
        {/* Header with gold crown border */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0"
          style={{
            background: "var(--color-parch-header)",
            borderTop: "2px solid var(--color-gold)",
            borderBottom: "0.5px solid var(--color-gold-dim)",
          }}
        >
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em]" style={{ color: "var(--color-gold)" }}>
              Task Detail
            </p>
            <p
              className="text-xl leading-tight mt-0.5"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                color: "var(--color-text-ink)",
              }}
            >
              {manager.full_name}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-faded)" }}>
              {ROLE_DISPLAY[manager.role_name] ?? manager.role_name} ·{" "}
              {allItems.length} items
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 transition-colors"
            style={{ color: "var(--color-text-ghost)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-sepia)";
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-parch-card)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-ghost)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {itemsByTask.map(({ task, items }) => {
                const isExpanded = expandedTasks.has(task.id);
                const total = task.items?.length ?? 0;
                return (
                  <React.Fragment key={task.id}>
                    {/* Task header row */}
                    <tr
                      className="cursor-pointer"
                      onClick={() => toggleTask(task.id)}
                      style={{
                        borderBottom: "0.5px solid var(--color-gold-dim)",
                        background: "var(--color-parch-header)",
                      }}
                    >
                      <td className="px-5 py-3" colSpan={2}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
                          )}
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--color-text-ink)" }}
                          >
                            {task.title}
                          </span>
                          <span
                            className="text-[10px] ml-1"
                            style={{ color: "var(--color-text-ghost)" }}
                          >
                            ({total} subtask)
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3" colSpan={3} />
                    </tr>
                    {/* Inline column labels */}
                    {isExpanded && (
                      <tr
                        style={{
                          borderBottom: "0.5px solid var(--color-gold-dim)",
                          background: "var(--color-parch-raised)",
                        }}
                      >
                        <td className="px-5 py-1.5" />
                        <td className="px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: "var(--color-text-faded)" }}>
                          Subtask
                        </td>
                        <td className="px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: "var(--color-text-faded)" }}>
                          Status
                        </td>
                        <td className="px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: "var(--color-text-faded)" }}>
                          Catatan
                        </td>
                        <td className="px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: "var(--color-text-faded)" }}>
                          Kendala
                        </td>
                      </tr>
                    )}
                    {/* Subtask rows */}
                    {isExpanded &&
                      items.map(({ item }, subIdx) => {
                        const pg = item.progress?.[0];
                        const status = pg?.status ?? "belum";
                        const rel = formatRelativeDeadline(
                          task.deadline,
                          status,
                        );
                        return (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom:
                                "0.5px solid var(--color-gold-dim)",
                            }}
                          >
                            <td
                              className="px-5 py-2.5"
                              style={{ color: "var(--color-text-ghost)" }}
                            >
                              {subIdx + 1}
                            </td>
                            <td className="px-4 py-2.5">
                              <div
                                style={{ color: "var(--color-text-sepia)" }}
                              >
                                {item.title}
                              </div>
                              {task.deadline && (
                                <span
                                  className="text-[11px]"
                                  style={{
                                    color: rel.isUrgent
                                      ? "var(--color-terra)"
                                      : "var(--color-text-ghost)",
                                  }}
                                >
                                  {rel.label}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium"
                                style={{
                                  borderRadius: 2,
                                  ...(status === "selesai"
                                    ? { background: "var(--color-sage-bg)", color: "var(--color-sage)" }
                                    : status === "proses"
                                      ? { background: "var(--color-amber-bg)", color: "var(--color-amber-warn)" }
                                      : { background: "var(--color-terra-bg)", color: "var(--color-terra)" }),
                                }}
                              >
                                {status === "selesai" ? (
                                  <Check className="h-3 w-3" />
                                ) : status === "proses" ? (
                                  <Clock className="h-3 w-3" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                {status === "selesai"
                                  ? "Selesai"
                                  : status === "proses"
                                    ? "Proses"
                                    : "Belum"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    value={
                                      noteInput[pg?.id ?? ""] ??
                                      pg?.admin_notes ??
                                      ""
                                    }
                                    onChange={(e) =>
                                      setNoteInput((p) => ({
                                        ...p,
                                        [pg?.id ?? ""]: e.target.value,
                                      }))
                                    }
                                    onBlur={() => {
                                      if (pg?.id) onSaveNote(pg.id);
                                    }}
                                    placeholder="Tambah catatan..."
                                    className="text-xs"
                                  />
                                  {pg?.admin_notes && (
                                    <MessageSquare
                                      className="h-3 w-3 shrink-0"
                                      style={{
                                        color: "var(--color-text-ghost)",
                                      }}
                                    />
                                  )}
                                </div>
                                {pg?.notes && (
                                  <p
                                    className="text-[11px]"
                                    style={{
                                      color: "var(--color-text-ghost)",
                                    }}
                                  >
                                    {pg.notes}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              {pg?.kendala ? (
                                <p
                                  className="text-[11px] flex items-center gap-1"
                                  style={{ color: "var(--color-terra)" }}
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  {pg.kendala}
                                </p>
                              ) : (
                                <span
                                  className="text-[11px]"
                                  style={{ color: "var(--color-text-ghost)" }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end px-6 py-3 shrink-0"
          style={{
            borderTop: "0.5px solid var(--color-gold-dim)",
            background: "var(--color-parch-header)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-xs font-medium transition-colors"
            style={{
              border: "1px solid var(--color-parch-border)",
              color: "var(--color-text-sepia)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--color-gold)";
              el.style.color = "var(--color-gold-text)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--color-parch-border)";
              el.style.color = "var(--color-text-sepia)";
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
