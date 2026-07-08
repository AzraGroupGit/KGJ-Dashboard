"use client";

import { useMemo } from "react";
import {
  CUSTOMER_STAGE_SEQUENCE,
  getStageLabel,
  getProgressPercent,
  isStageActive,
} from "@/lib/stages";
import { Check } from "lucide-react";
import type { StageResult, Transition, Delivery } from "@/types/order-timeline";

interface CustomerTimelineProps {
  currentStage: string | null;
  status: string | null;
  stageResults: StageResult[];
  transitions: Transition[];
  deliveries: Delivery[];
  deadline: string | null;
  referenceImagePria: string | null;
  referenceImageWanita: string | null;
}

export default function CustomerTimeline({
  currentStage,
  status,
  stageResults,
  transitions,
  deliveries,
  deadline,
  referenceImagePria,
  referenceImageWanita,
}: CustomerTimelineProps) {
  const completedStages = useMemo(() => {
    const set = new Set<string>();
    for (const sr of stageResults) {
      set.add(sr.stage);
    }
    return set;
  }, [stageResults]);

  const isComplete = status === "completed";
  const progress = currentStage ? getProgressPercent(currentStage) : 0;

  const completedDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const sr of stageResults) {
      if (sr.finished_at && !map.has(sr.stage)) {
        map.set(sr.stage, sr.finished_at);
      }
    }
    return map;
  }, [stageResults]);

  const entryDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of transitions) {
      if (t.to_stage && !map.has(t.to_stage)) {
        map.set(t.to_stage, t.transitioned_at);
      }
    }
    return map;
  }, [transitions]);

  const delivery = deliveries && deliveries.length > 0 ? deliveries[0] : null;

  function fmt(iso: string | null | undefined) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-700">
            {isComplete ? "Pesanan Selesai" : `Progress: ${progress}%`}
          </span>
          {!isComplete && deadline && (
            <span className="text-xs text-stone-500">
              Deadline: {fmt(deadline)}
            </span>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete ? "bg-emerald-500/[0.08]0" : "bg-[#c9a227]/100"
            }`}
            style={{ width: `${isComplete ? 100 : progress}%` }}
          />
        </div>
      </div>

      {/* Status badge */}
      <div className="text-center">
        {isComplete ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800">
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Pesanan Selesai
          </div>
        ) : currentStage ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
            <span className="h-2 w-2 rounded-full bg-[#c9a227]/100 animate-pulse" />
            Sedang: {getStageLabel(currentStage)}
          </span>
        ) : (
          <span className="text-sm text-stone-500">Belum mulai</span>
        )}
      </div>

      {/* Stage list */}
      <div className="space-y-1">
        {CUSTOMER_STAGE_SEQUENCE.map((stage) => {
          const done = isComplete || completedStages.has(stage);
          const active =
            !isComplete && isStageActive(stage, currentStage || "");
          const date = completedDates.get(stage) || entryDates.get(stage);
          return (
            <div
              key={stage}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                done
                  ? "text-stone-500"
                  : active
                    ? "bg-[#c9a227]/10 text-stone-800 font-medium"
                    : "text-stone-400"
              }`}
            >
              <div className="flex-shrink-0">
                {done ? (
                  <Check className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
                ) : active ? (
                  <span className="flex h-5 w-5 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#c9a227]/100 animate-pulse" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-stone-300" />
                  </span>
                )}
              </div>
              <span className="flex-1">{getStageLabel(stage)}</span>
              {date && (
                <span className="text-xs text-stone-400">{fmt(date)}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Reference images */}
      {(referenceImagePria || referenceImageWanita) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Foto Referensi Cincin
          </p>
          <div className="grid grid-cols-2 gap-3">
            {referenceImagePria && (
              <div>
                <p className="text-[11px] text-stone-400 mb-1">Cincin Pria</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImagePria}
                  alt="Referensi Cincin Pria"
                  className="w-full rounded-lg border border-stone-200 object-cover"
                />
              </div>
            )}
            {referenceImageWanita && (
              <div>
                <p className="text-[11px] text-stone-400 mb-1">Cincin Wanita</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImageWanita}
                  alt="Referensi Cincin Wanita"
                  className="w-full rounded-lg border border-stone-200 object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery info */}
      {delivery && delivery.status === "dispatched" && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-medium text-sky-800">Pesanan Dikirim</p>
          {delivery.courier_name && (
            <p className="text-xs text-sky-700 mt-1">
              Kurir: {delivery.courier_name}
            </p>
          )}
          {delivery.tracking_number && (
            <p className="text-xs text-sky-700">
              No. Resi: {delivery.tracking_number}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
