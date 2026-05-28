"use client";

import { useEffect, useState, useMemo } from "react";
import { STAGE_SEQUENCE, getStageLabel, getStageIndex } from "@/lib/stages";
import { Clock, AlertTriangle, CalendarDays } from "lucide-react";

interface StageStat {
  stage: string;
  avg: number | null;
  median: number | null;
  p75: number | null;
  p95: number | null;
  count: number;
}

interface EstimatedCompletionProps {
  currentStage: string;
  deadline?: string | null;
  compact?: boolean;
}

function fmtDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} mnt`;
  if (hours < 24) return `${hours.toFixed(1)} jam`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  if (days < 7) return `${days}h ${Math.round(rem)}j`;
  const weeks = Math.floor(days / 7);
  const remDays = days % 7;
  return remDays > 0 ? `${weeks}mg ${remDays}h` : `${weeks}mg`;
}

export default function EstimatedCompletion({
  currentStage,
  deadline,
  compact = false,
}: EstimatedCompletionProps) {
  const [stageStats, setStageStats] = useState<StageStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/analytics/stage-durations");
        if (!res.ok) return;
        const json = await res.json();
        setStageStats(json.stageStats || []);
      } catch {
        // silent — component is non-critical
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const estimate = useMemo(() => {
    if (stageStats.length === 0)
      return { avgRemaining: null, p75Remaining: null, hasData: false };

    const currentIdx = getStageIndex(currentStage);
    if (currentIdx < 0 || currentIdx >= STAGE_SEQUENCE.length - 1) {
      return { avgRemaining: null, p75Remaining: null, hasData: false };
    }

    const remainingStages = STAGE_SEQUENCE.slice(currentIdx + 1, -1); // exclude "selesai"
    let avgSum = 0;
    let p75Sum = 0;
    let stagesWithData = 0;
    let stagesMissing = 0;

    for (const stage of remainingStages) {
      const stat = stageStats.find((s) => s.stage === stage);
      if (stat && stat.avg != null && stat.p75 != null) {
        avgSum += stat.avg;
        p75Sum += stat.p75;
        stagesWithData++;
      } else {
        stagesMissing++;
      }
    }

    const hasData = stagesWithData > 0;
    return {
      avgRemaining: hasData ? Math.round(avgSum * 100) / 100 : null,
      p75Remaining: hasData ? Math.round(p75Sum * 100) / 100 : null,
      stagesWithData,
      stagesMissing,
      remainingStageCount: remainingStages.length,
      avgDeadline: hasData
        ? new Date(Date.now() + avgSum * 3600000)
        : null,
      p75Deadline: hasData
        ? new Date(Date.now() + p75Sum * 3600000)
        : null,
      hasData,
    };
  }, [stageStats, currentStage]);

  const isOverdue =
    deadline &&
    estimate.avgDeadline &&
    new Date(deadline) < estimate.avgDeadline;

  if (loading) {
    return (
      <div className={`animate-pulse ${compact ? "h-8 w-32 rounded bg-slate-100" : "h-24 rounded-lg bg-slate-100"}`} />
    );
  }

  if (!estimate.hasData) return null;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs">
        <Clock className="h-3 w-3 text-slate-400" />
        <span className="text-slate-600">
          Estimasi:{" "}
          <span className="font-semibold text-slate-800">
            {estimate.avgDeadline
              ? estimate.avgDeadline.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </span>
        </span>
        {isOverdue && (
          <AlertTriangle className="h-3 w-3 text-rose-500" />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">
          Estimasi Selesai
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Rata-rata (sisa {estimate.remainingStageCount} tahap)
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {estimate.avgRemaining != null
              ? fmtDuration(estimate.avgRemaining)
              : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Optimis (P75)
          </span>
          <span className="text-sm font-semibold text-emerald-600">
            {estimate.p75Remaining != null
              ? fmtDuration(estimate.p75Remaining)
              : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Perkiraan selesai
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {estimate.avgDeadline
              ? estimate.avgDeadline.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
        </div>

        {deadline && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">Deadline</span>
            <span
              className={`text-sm font-semibold ${
                isOverdue ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {new Date(deadline).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {isOverdue && (
                <AlertTriangle className="inline ml-1 h-3 w-3" />
              )}
            </span>
          </div>
        )}

        {(estimate.stagesMissing ?? 0) > 0 && (
          <p className="text-[10px] text-slate-400 mt-2">
            *{estimate.stagesMissing} tahap tanpa data historis
          </p>
        )}
      </div>
    </div>
  );
}
