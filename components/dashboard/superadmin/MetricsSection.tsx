"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, Clock } from "lucide-react";

interface MetricsSectionProps {
  completionRate: number;
  totalItems: number;
  doneItems: number;
  atRiskCount: number;
  overdueCount: number;
  dueSoonCount: number;
}

function useAnimatedValue(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const start = performance.now();
    const from = 0;
    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function MetricsSection({
  completionRate,
  totalItems,
  doneItems,
  atRiskCount,
  overdueCount,
  dueSoonCount,
}: MetricsSectionProps) {
  const animatedRate = useAnimatedValue(completionRate);
  const avgTrend = completionRate >= 50;
  const rateColor =
    completionRate >= 80
      ? "var(--color-sage)"
      : completionRate >= 50
        ? "var(--color-gold)"
        : "var(--color-terra)";

  return (
    <section
      className="rounded-lg p-6 mb-6"
      style={{
        background: "var(--color-parch-card)",
        border: "0.5px solid var(--color-gold-dim)",
      }}
    >
      {/* Eyebrow */}
      <p
        className="text-[9px] uppercase tracking-[0.22em] mb-4"
        style={{ color: "var(--color-gold)" }}
      >
        At-a-Glance
      </p>

      {/* Primary metric — completion rate, special treatment */}
      <div
        className="flex items-end justify-between pb-5 mb-5"
        style={{ borderBottom: "0.5px solid var(--color-gold-dim)" }}
      >
        <div>
          <p
            className="text-xs uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-faded)" }}
          >
            Completion Rate
          </p>
          <p
            className="text-[42px] leading-none"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: rateColor,
            }}
          >
            {animatedRate}
            <span className="text-lg">%</span>
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-ghost)" }}
          >
            {doneItems} dari {totalItems} item selesai
          </p>
        </div>
        <div
          className="hidden sm:flex items-center justify-center rounded"
          style={{
            width: 56,
            height: 56,
            background: "var(--color-parch-raised)",
          }}
        >
          <TrendingUp
            className="h-6 w-6"
            style={{
              color: avgTrend ? "var(--color-sage)" : "var(--color-terra)",
            }}
          />
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-2 gap-4">
        {/* At-Risk / Overdue */}
        <div
          className="rounded p-4"
          style={{ background: "var(--color-parch-raised)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              className="h-4 w-4"
              style={{
                color:
                  overdueCount > 0
                    ? "var(--color-terra)"
                    : "var(--color-amber-warn)",
              }}
            />
            <p
              className="text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: "var(--color-text-faded)" }}
            >
              At-Risk / Overdue
            </p>
          </div>
          <p
            className="text-2xl leading-none"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color:
                overdueCount > 0
                  ? "var(--color-terra)"
                  : "var(--color-amber-warn)",
            }}
          >
            {atRiskCount + overdueCount}
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--color-text-ghost)" }}
          >
            {overdueCount > 0
              ? `${overdueCount} overdue · ${atRiskCount} at-risk`
              : `${atRiskCount} at-risk`}
          </p>
        </div>

        {/* Due Soon */}
        <div
          className="rounded p-4"
          style={{ background: "var(--color-parch-raised)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock
              className="h-4 w-4"
              style={{ color: "var(--color-gold)" }}
            />
            <p
              className="text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: "var(--color-text-faded)" }}
            >
              Due in 2 Days
            </p>
          </div>
          <p
            className="text-2xl leading-none"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color:
                dueSoonCount > 0
                  ? "var(--color-amber-warn)"
                  : "var(--color-sage)",
            }}
          >
            {dueSoonCount}
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--color-text-ghost)" }}
          >
            {dueSoonCount > 0
              ? `${dueSoonCount} tasks due soon`
              : "All clear"}
          </p>
        </div>
      </div>
    </section>
  );
}
