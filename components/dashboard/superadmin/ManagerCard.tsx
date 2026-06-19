"use client";

import { Clock, AlertCircle, Check } from "lucide-react";
import { Diamond } from "./Diamond";

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

export interface Manager {
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

export function formatRelativeDeadline(
  deadline: string | null,
  status: string | null,
): { label: string; isUrgent: boolean } {
  if (!deadline || status === "selesai")
    return { label: "—", isUrgent: false };
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffHours < 0) {
    const absH = Math.abs(diffHours);
    if (absH < 24) return { label: `${absH}h lalu`, isUrgent: true };
    return { label: `${Math.abs(diffDays)}h lalu`, isUrgent: true };
  }
  if (diffHours < 24) return { label: "Hari ini", isUrgent: true };
  if (diffDays === 1) return { label: "Besok", isUrgent: false };
  if (diffDays <= 3) return { label: `${diffDays}h lagi`, isUrgent: false };
  return {
    label: new Date(deadline).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    }),
    isUrgent: false,
  };
}

function isOverdue(deadline: string | null, status: string | null): boolean {
  if (!deadline || status === "selesai") return false;
  return new Date(deadline) < new Date();
}

export function ManagerCard({
  manager,
  onViewAll,
  onEscalate,
}: {
  manager: Manager;
  onViewAll: (manager: Manager) => void;
  onEscalate: (manager: Manager) => void;
}) {
  const allItems = manager.tasks.flatMap((t) =>
    (t.items ?? []).map((item) => ({
      item,
      taskTitle: t.title,
      deadline: t.deadline,
    })),
  );

  const done = allItems.filter(
    (i) => i.item.progress?.[0]?.status === "selesai",
  ).length;
  const total = allItems.length || 1;

  const overdue = allItems.filter((i) =>
    isOverdue(i.deadline, i.item.progress?.[0]?.status ?? null),
  ).length;
  const atRisk = allItems.filter(
    (i) =>
      i.item.progress?.[0]?.status === "proses" &&
      !isOverdue(i.deadline, i.item.progress?.[0]?.status ?? null),
  ).length;

  const hasOverdue = overdue > 0;
  const hasEscalate = hasOverdue || atRisk > 0;

  const statusCounts = {
    selesai: done,
    proses: allItems.filter((i) => i.item.progress?.[0]?.status === "proses")
      .length,
    belum: allItems.filter(
      (i) =>
        !i.item.progress?.[0]?.status ||
        i.item.progress?.[0]?.status === "belum",
    ).length,
  };

  const statusMeta: Record<
    string,
    { label: string; color: string; bg: string; border: string }
  > = {
    selesai: {
      label: "Selesai",
      color: "var(--color-sage)",
      bg: "var(--color-sage-bg)",
      border: "var(--color-sage-border)",
    },
    proses: {
      label: "Proses",
      color: "var(--color-amber-warn)",
      bg: "var(--color-amber-bg)",
      border: "var(--color-gold-muted)",
    },
    belum: {
      label: "Belum",
      color: "var(--color-terra)",
      bg: "var(--color-terra-bg)",
      border: "var(--color-terra-border)",
    },
  };
  return (
    <div
      className="rounded-lg p-5 transition-all duration-200"
      style={{
        background: "var(--color-parch-card)",
        border: `1px solid ${hasOverdue ? "var(--color-terra-border)" : "var(--color-parch-border)"}`,
        boxShadow: "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 8px 24px rgba(44,24,16,0.08)";
        el.style.borderColor = hasOverdue
          ? "var(--color-terra)"
          : "var(--color-gold)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "none";
        el.style.borderColor = hasOverdue
          ? "var(--color-terra-border)"
          : "var(--color-parch-border)";
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 mb-4 pb-4"
        style={{ borderBottom: "0.5px solid var(--color-gold-dim)" }}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded font-semibold text-sm text-white"
          style={{ background: "var(--color-gold)" }}
        >
          {manager.full_name
            ?.split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-base leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              color: "var(--color-text-ink)",
            }}
          >
            {manager.full_name}
          </p>
          <p
            className="text-[11px]"
            style={{ color: "var(--color-text-faded)" }}
          >
            {ROLE_DISPLAY[manager.role_name] ?? manager.role_name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className="text-xl leading-none"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--color-text-ink)",
            }}
          >
            {done}/{total}
          </p>
          <p
            className="text-[9px] uppercase tracking-[0.22em]"
            style={{ color: "var(--color-gold)" }}
          >
            Progress
          </p>
        </div>
      </div>

      {/* Progress indicator — segmented bar */}
      <div className="flex gap-1 mb-4">
        {[...Array(total)].map((_, i) => {
          const item = allItems[i];
          const status = item?.item.progress?.[0]?.status ?? "belum";
          const fill =
            status === "selesai"
              ? "var(--color-sage)"
              : status === "proses"
                ? "var(--color-gold)"
                : "var(--color-parch-border)";
          return (
            <div
              key={i}
              className="flex-1 h-1 transition-colors duration-500"
              style={{ background: fill }}
            />
          );
        })}
      </div>

      {/* Status Pills — sharp corners, diamond prefix */}
      <div className="flex gap-2 flex-wrap mb-4">
        {Object.entries(statusCounts).map(([status, count]) => {
          const meta = statusMeta[status] ?? statusMeta.belum;
          if (!count) return null;
          return (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium"
              style={{
                background: meta.bg,
                color: meta.color,
                border: `1px solid ${meta.border}`,
                borderRadius: 2,
              }}
            >
              <Diamond size={5} />
              {count} {meta.label}
            </span>
          );
        })}
        {overdue === 0 && atRisk === 0 && done > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium ml-1"
            style={{
              background: "var(--color-sage-bg)",
              color: "var(--color-sage)",
              border: "1px solid var(--color-sage-border)",
              borderRadius: 2,
            }}
          >
            <Diamond size={5} />
            On Track
          </span>
        )}
      </div>

      {/* Task Preview — by task with counts */}
      {manager.tasks.length > 0 && (
        <>
          <p
            className="text-[9px] uppercase tracking-[0.22em] mb-2"
            style={{ color: "var(--color-gold)" }}
          >
            Tasks
          </p>
          {manager.tasks.slice(0, 2).map((task) => {
            const items = task.items ?? [];
            const done = items.filter(
              (i) => i.progress?.[0]?.status === "selesai",
            ).length;
            const allDone = items.length > 0 && done === items.length;
            const nearestDeadline = task.deadline
              ? formatRelativeDeadline(task.deadline, null)
              : null;
            const hasOverdue = task.deadline && isOverdue(task.deadline, null);
            return (
              <div
                key={task.id}
                className="flex items-center gap-2.5 py-2"
                style={{
                  borderBottom: "0.5px solid var(--color-gold-dim)",
                }}
              >
                <span className="shrink-0">
                  {allDone ? (
                    <Check className="h-3.5 w-3.5" style={{ color: "var(--color-sage)" }} />
                  ) : hasOverdue ? (
                    <AlertCircle className="h-3.5 w-3.5" style={{ color: "var(--color-terra)" }} />
                  ) : (
                    <Clock className="h-3.5 w-3.5" style={{ color: "var(--color-amber-warn)" }} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--color-text-sepia)" }}>
                    {task.title}
                  </p>
                </div>
                <span className="text-[11px] font-medium shrink-0" style={{ color: "var(--color-text-faded)" }}>
                  {done}/{items.length}
                </span>
                {nearestDeadline && (
                  <span
                    className="text-[11px] shrink-0"
                    style={{
                      color: nearestDeadline.isUrgent
                        ? "var(--color-terra)"
                        : "var(--color-text-ghost)",
                    }}
                  >
                    {nearestDeadline.label}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}

      {manager.tasks.length > 2 && (
        <p
          className="text-[11px] mt-2"
          style={{ color: "var(--color-text-ghost)" }}
        >
          + {manager.tasks.length - 2} task lainnya
        </p>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-2 mt-4 pt-3"
        style={{ borderTop: "0.5px solid var(--color-gold-dim)" }}
      >
        <button
          type="button"
          onClick={() => onViewAll(manager)}
          className="flex-1 rounded px-4 py-2 text-xs font-medium transition-colors"
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
          Lihat detail
        </button>
        {hasEscalate && (
          <button
            type="button"
            onClick={() => onEscalate(manager)}
            className="flex-1 rounded px-4 py-2 text-xs font-medium transition-colors text-white"
            style={{ background: "var(--color-gold)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-gold-bright)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-gold)";
            }}
          >
            Eskalasi
          </button>
        )}
      </div>
    </div>
  );
}
