"use client";

import Link from "next/link";
import { Calendar, User, Hash } from "lucide-react";
import { STAGE_LABELS } from "@/services/integrated-system/tracking.service";

interface OrderCardProps {
  id: string;
  kode_order: string;
  nama: string;
  tgl_order: string | null;
  current_stage: string;
  stage_status: string;
}

export default function OrderCard({
  id,
  kode_order,
  nama,
  tgl_order,
  current_stage,
  stage_status,
}: OrderCardProps) {
  const stageLabel = STAGE_LABELS[current_stage as keyof typeof STAGE_LABELS] ?? current_stage;
  const statusColor =
    stage_status === "completed"
      ? "bg-emerald-100 text-emerald-300"
      : stage_status === "rework"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-[#e8e2d4]";

  return (
    <Link
      href={`/integrated-system/tracking/${id}`}
      className="block rounded-xl border border-[#c9a227]/10 bg-[#2a2522] p-4 shadow-sm transition-all hover:border-[#c9a227]/20 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Hash className="h-3 w-3" />
          <span className="font-mono">{kode_order}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
          {stageLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-sm font-medium text-[#f0f4ff] mb-1">
        <User className="h-3.5 w-3.5 text-white/30" />
        {nama}
      </div>

      {tgl_order && (
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Calendar className="h-3 w-3" />
          {new Date(tgl_order).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      )}
    </Link>
  );
}
