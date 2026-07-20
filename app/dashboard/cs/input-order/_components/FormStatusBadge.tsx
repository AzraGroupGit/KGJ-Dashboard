"use client";

import type { CsOrder } from "@/types/cs-orders";

export function FormStatusBadge({ status }: { status: CsOrder["form_status"] }) {
  const map: Record<
    CsOrder["form_status"],
    { label: string; bg: string; dot: string; text: string }
  > = {
    pending: {
      label: "Menunggu",
      bg: "bg-amber-500/10",
      dot: "bg-amber-500/100",
      text: "text-amber-300",
    },
    submitted: {
      label: "Perlu Direview",
      bg: "bg-orange-500/10",
      dot: "bg-orange-500/100",
      text: "text-orange-300",
    },
    reviewed: {
      label: "Sudah Direview",
      bg: "bg-emerald-500/10",
      dot: "bg-emerald-500/100",
      text: "text-emerald-300",
    },
    converted: {
      label: "Dibuat Order",
      bg: "bg-indigo-100",
      dot: "bg-indigo-500",
      text: "text-indigo-700",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
