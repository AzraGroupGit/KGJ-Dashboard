"use client";

import { STAGE_SEQUENCE, STAGE_LABELS, getStageIndex } from "@/services/integrated-system/tracking.service";
import { Check, Clock } from "lucide-react";

interface StageProgressBarProps {
  currentStage: string;
  stageStatus: string;
}

export default function StageProgressBar({ currentStage, stageStatus }: StageProgressBarProps) {
  const currentIdx = getStageIndex(currentStage);
  const completed = stageStatus === "completed";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STAGE_SEQUENCE.map((stage, idx) => {
          const isCompleted = idx < currentIdx || (idx === currentIdx && completed);
          const isCurrent = idx === currentIdx;
          const label = STAGE_LABELS[stage];

          return (
            <div key={stage} className="flex flex-col items-center flex-1 min-w-0">
              <div className="relative flex items-center w-full">
                {idx > 0 && (
                  <div
                    className={`absolute right-1/2 w-full h-0.5 -translate-y-1/2 ${
                      idx <= currentIdx ? "bg-[#c9a227]" : "bg-[#332d29]"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    isCompleted
                      ? "bg-[#c9a227] text-white"
                      : isCurrent
                        ? "bg-indigo-100 text-[#c9a227] ring-2 ring-[#c9a227]"
                        : "bg-[#332d29] text-white/40"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
              </div>
              <span
                className={`mt-1.5 text-center text-[10px] leading-tight ${
                  isCurrent ? "font-semibold text-[#c9a227]" : "text-white/30"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
