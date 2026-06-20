import { useState, useEffect } from "react";
import type { ManagerData, ManagerStats } from "./types";

export function getManagerStats(m: ManagerData): { done: number; total: number; rate: number } {
  const items = m.tasks.flatMap((t) => t.items ?? []);
  const done = items.filter((i) => i.progress?.[0]?.is_completed).length;
  const total = items.length || 1;
  const rate = Math.round((done / total) * 100);
  return { done, total, rate };
}

export function isOverdue(deadline: string | null, status: string | null): boolean {
  if (!deadline || status === "selesai") return false;
  return new Date(deadline) < new Date();
}

export function sortByCompletion(managers: ManagerData[]): ManagerStats[] {
  return managers
    .map((m) => ({ manager: m, ...getManagerStats(m) }))
    .sort((a, b) => b.done - a.done);
}

export function sortByRate(managers: ManagerData[]): ManagerStats[] {
  return managers
    .map((m) => ({ manager: m, ...getManagerStats(m) }))
    .sort((a, b) => b.rate - a.rate);
}

export function computeDashboardStats(managers: ManagerData[]) {
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
}

export function computeStatusSummary(managers: ManagerData[]) {
  let onTrack = 0, atRisk = 0, overdue = 0;
  managers.forEach((m) => {
    m.tasks.forEach((t) => (t.items ?? []).forEach((item) => {
      const pg = item.progress?.[0];
      if (!pg) return;
      if (pg.is_completed) { onTrack++; return; }
      if (isOverdue(t.deadline ?? null, pg.status ?? null)) { overdue++; return; }
      if (pg.status === "proses") { atRisk++; }
    }));
  });
  return { onTrack, atRisk, overdue };
}

export function formatRelativeDeadline(
  deadline: string | null,
  status: string | null,
): { label: string; isUrgent: boolean } {
  if (!deadline || status === "selesai") return { label: "—", isUrgent: false };
  const d = new Date(deadline);
  const now = new Date();
  const diffHours = Math.round((d.getTime() - now.getTime()) / 3600000);
  const diffDays = Math.round(diffHours / 24);
  if (diffHours < 0) {
    const absH = Math.abs(diffHours);
    if (absH < 24) return { label: `${absH}h lalu`, isUrgent: true };
    return { label: `${Math.abs(diffDays)}h lalu`, isUrgent: true };
  }
  if (diffHours < 24) return { label: "Hari ini", isUrgent: true };
  if (diffDays === 1) return { label: "Besok", isUrgent: false };
  if (diffDays <= 3) return { label: `${diffDays}h lagi`, isUrgent: false };
  return {
    label: new Date(deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    isUrgent: false,
  };
}

export function useAnimatedValue(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
