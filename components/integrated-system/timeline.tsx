"use client";

import { Check, Clock, AlertTriangle, User } from "lucide-react";
import { STAGE_LABELS } from "@/services/integrated-system/tracking.service";

interface HistoryEntry {
  id: string;
  stage: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
  changed_by_user?: {
    id: string;
    full_name: string;
  } | null;
}

interface TimelineProps {
  history: HistoryEntry[];
}

export default function Timeline({ history }: TimelineProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-[#c9a227]/10 bg-[#1C1917] px-4 py-8 text-center text-sm text-white/40">
        Belum ada riwayat stage
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {history.map((entry, idx) => {
        const stageLabel = STAGE_LABELS[entry.stage as keyof typeof STAGE_LABELS] ?? entry.stage;
        const isLast = idx === history.length - 1;
        const isCompleted = entry.status === "completed";
        const statusIcon = isCompleted ? (
          <Check className="h-3.5 w-3.5" />
        ) : entry.status === "rework" ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Clock className="h-3.5 w-3.5" />
        );

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
                  isCompleted ? "bg-emerald-500/[0.08]0" : entry.status === "rework" ? "bg-[#c9a227]/100" : "bg-[#c9a227]/100"
                }`}
              >
                {statusIcon}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-[#332d29]" />}
            </div>
            <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#f0f4ff]">{stageLabel}</span>
                <span className="rounded bg-[#332d29] px-1.5 py-0.5 text-[10px] text-[#e8e2d4] capitalize">
                  {entry.status}
                </span>
              </div>
              {entry.note && (
                <p className="mt-0.5 text-xs text-white/40">{entry.note}</p>
              )}
              <div className="mt-1 flex items-center gap-2 text-[11px] text-white/30">
                <span>
                  {new Date(entry.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {entry.changed_by_user && (
                  <>
                    <User className="h-3 w-3" />
                    <span>{entry.changed_by_user.full_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
