// lib/format.ts — shared formatting utilities

export function formatRelativeDeadline(
  deadline: string | null,
  status: string | null,
): { label: string; isUrgent: boolean } {
  if (!deadline || status === "selesai" || status === "approved")
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
