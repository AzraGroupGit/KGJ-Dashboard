"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_SEQUENCE, getStageLabel } from "@/lib/stages";
import {
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from "lucide-react";

interface CycleStageData {
  stage: string;
  label: string;
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
  p95: number | null;
}

interface MonthlyTrend {
  month: string;
  stages: Record<string, number | null>;
}

interface CycleTimeData {
  cycleData: CycleStageData[];
  monthlyTrend: MonthlyTrend[];
}

function fmtHours(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} mnt`;
  if (h < 24) return `${h.toFixed(1)} jam`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${days}h ${rem}j` : `${days}h`;
}

function fmtDurationHours(h: number | null): string {
  if (h == null) return "—";
  return `${h.toFixed(1)}j`;
}

export default function CycleTimeTab() {
  const { data, isLoading, error } = useQuery<CycleTimeData>({
    queryKey: ["analytics", "cycle-time"],
    queryFn: () => fetcher<CycleTimeData>("/api/analytics/cycle-time"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-rose-600" />
        <p className="text-sm text-rose-700">{error instanceof Error ? error.message : "Gagal memuat data"}</p>
      </div>
    );
  }

  if (!data || data.cycleData.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-[#2a2522] p-12 text-center">
        <Clock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm text-white/40">Belum ada data cycle time</p>
      </div>
    );
  }

  const finishedStages = data.cycleData.filter((s) => s.count > 0);
  const totalAvg =
    finishedStages.length > 0
      ? finishedStages.reduce((sum, s) => sum + (s.avg ?? 0), 0)
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-[#2a2522] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Tahap dengan Data
          </p>
          <p className="mt-0.5 text-xl font-bold text-[#f0f4ff]">
            {finishedStages.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#2a2522] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Total Sampel
          </p>
          <p className="mt-0.5 text-xl font-bold text-[#f0f4ff]">
            {finishedStages.reduce((sum, s) => sum + s.count, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#2a2522] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Rata-rata Total
          </p>
          <p className="mt-0.5 text-xl font-bold text-[#f0f4ff]">
            {fmtHours(totalAvg)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-[#2a2522] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Tahap Terlama
          </p>
          <p className="mt-0.5 text-xl font-bold text-[#f0f4ff]">
            {finishedStages.length > 0
              ? (() => {
                  const longest = finishedStages.reduce((a, b) =>
                    (a.avg ?? 0) > (b.avg ?? 0) ? a : b,
                  );
                  return longest.label;
                })()
              : "—"}
          </p>
        </div>
      </div>

      {/* Cycle Time table */}
      <section className="rounded-lg border border-slate-200 bg-[#2a2522] overflow-hidden">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <BarChart3 className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold text-[#f0f4ff]">
            Cycle Time per Tahap
          </h2>
          <span className="text-xs text-white/40 ml-auto">
            Durasi kerja efektif (jam)
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs">
                <th className="px-5 py-2.5 text-left font-medium text-white/40">
                  Tahap
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-white/40">
                  Sampel
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-white/40">
                  Rata-rata
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-white/40">
                  Median
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-white/40">
                  P95
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-white/40">
                  Min
                </th>
                <th className="px-5 py-2.5 text-right font-medium text-white/40">
                  Max
                </th>
              </tr>
            </thead>
            <tbody>
              {data.cycleData.map((s, _i) => {
                const barWidth =
                  totalAvg > 0 ? ((s.avg ?? 0) / totalAvg) * 100 : 0;
                return (
                  <tr
                    key={s.stage}
                    className="border-b border-slate-50 last:border-0 hover:bg-[#1C1917] transition-colors"
                  >
                    <td className="px-5 py-2.5 text-xs font-medium text-[#f0f4ff]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.count > 0
                              ? "bg-slate-400"
                              : "bg-slate-200"
                          }`}
                        />
                        {s.label}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-white/40">
                      {s.count > 0 ? s.count : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {s.avg != null ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-semibold text-[#f0f4ff]">
                            {fmtDurationHours(s.avg)}
                          </span>
                          <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full bg-slate-400"
                              style={{ width: `${Math.min(barWidth, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-white/40">
                      {fmtDurationHours(s.median)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-white/40">
                      {fmtDurationHours(s.p95)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-white/40">
                      {fmtDurationHours(s.min)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-xs text-white/40">
                      {fmtDurationHours(s.max)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Monthly Trend */}
      {data.monthlyTrend.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-[#2a2522] overflow-hidden">
          <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <TrendingUp className="h-4 w-4 text-white/40" />
            <h2 className="text-sm font-semibold text-[#f0f4ff]">
              Tren Bulanan
            </h2>
            <span className="text-xs text-white/40 ml-auto">
              Rata-rata cycle time per bulan (jam)
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs">
                  <th className="px-5 py-2.5 text-left font-medium text-white/40">
                    Bulan
                  </th>
                  {STAGE_SEQUENCE.map((stage) => (
                    <th
                      key={stage}
                      className="px-2 py-2.5 text-right font-medium text-white/40 whitespace-nowrap"
                    >
                      {getStageLabel(stage).length > 12
                        ? getStageLabel(stage).slice(0, 10) + "…"
                        : getStageLabel(stage)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.monthlyTrend.map((m, i) => {
                  const prev = i > 0 ? data.monthlyTrend[i - 1] : null;
                  return (
                    <tr
                      key={m.month}
                      className="border-b border-slate-50 last:border-0 hover:bg-[#1C1917] transition-colors"
                    >
                      <td className="px-5 py-2 text-xs font-medium text-[#f0f4ff] whitespace-nowrap">
                        {new Date(m.month + "-01").toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                        })}
                      </td>
                      {STAGE_SEQUENCE.map((stage) => {
                        const val = m.stages[stage];
                        const prevVal = prev?.stages?.[stage] ?? null;
                        let trend: "up" | "down" | "same" | null = null;
                        if (val != null && prevVal != null) {
                          if (val > prevVal) trend = "up";
                          else if (val < prevVal) trend = "down";
                          else trend = "same";
                        }
                        return (
                          <td
                            key={stage}
                            className="px-2 py-2 text-right text-xs"
                          >
                            {val != null ? (
                              <span className="inline-flex items-center gap-1 text-[#e8e2d4]">
                                {fmtDurationHours(val)}
                                {trend === "up" && (
                                  <TrendingUp className="h-3 w-3 text-rose-500" />
                                )}
                                {trend === "down" && (
                                  <TrendingDown className="h-3 w-3 text-emerald-500" />
                                )}
                                {trend === "same" && (
                                  <Minus className="h-3 w-3 text-white/40" />
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
