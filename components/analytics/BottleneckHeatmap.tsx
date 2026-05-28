"use client";

import { useEffect, useState, useMemo } from "react";
import { STAGE_SEQUENCE, getStageLabel } from "@/lib/stages";
import {
  AlertTriangle,
  RefreshCw,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface HeatmapData {
  heatmap: Record<string, Record<string, number>>;
  stageSummary: Array<{
    stage: string;
    label: string;
    totalOrderDays: number;
    avgDailyOrders: number;
    peakDailyOrders: number;
  }>;
  currentCounts: Record<string, number>;
  dateRange: { from: string; to: string };
}

function fmtCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export default function BottleneckHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/analytics/bottleneck-history");
        if (!res.ok) throw new Error("Gagal memuat data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxCount = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    for (const stage of STAGE_SEQUENCE) {
      for (const count of Object.values(data.heatmap[stage] || {})) {
        if (count > max) max = count;
      }
    }
    return max;
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-rose-600" />
        <p className="text-sm text-rose-700">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <BarChart3 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">Belum ada data</p>
      </div>
    );
  }

  const dates = Object.keys(data.heatmap[STAGE_SEQUENCE[0]] || {}).sort();
  const dayLabels = dates.map((d) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  });

  function colorFor(count: number): string {
    if (count === 0) return "bg-slate-50";
    const intensity = maxCount > 0 ? count / maxCount : 0;
    if (intensity < 0.1) return "bg-sky-100";
    if (intensity < 0.25) return "bg-sky-200";
    if (intensity < 0.4) return "bg-amber-200";
    if (intensity < 0.55) return "bg-amber-300";
    if (intensity < 0.7) return "bg-orange-300";
    if (intensity < 0.85) return "bg-orange-400";
    return "bg-rose-500";
  }

  // Week grouping
  const weekGroups: { label: string; startIdx: number; endIdx: number }[] = [];
  let currentWeekStart = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i > 0 && i % 7 === 0) {
      weekGroups.push({
        label: dates[currentWeekStart].slice(5),
        startIdx: currentWeekStart,
        endIdx: i - 1,
      });
      currentWeekStart = i;
    }
  }
  if (currentWeekStart < dates.length) {
    weekGroups.push({
      label: dates[currentWeekStart].slice(5),
      startIdx: currentWeekStart,
      endIdx: dates.length - 1,
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Rentang Data
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {data.dateRange.from} — {data.dateRange.to}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Total Order-Hari
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {fmtCount(
              data.stageSummary.reduce((s, x) => s + x.totalOrderDays, 0),
            )}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Rata-rata Harian
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {data.stageSummary.length > 0
              ? (
                  data.stageSummary.reduce((s, x) => s + x.avgDailyOrders, 0) /
                  data.stageSummary.length
                ).toFixed(1)
              : "0"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Tahap Tersibak
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {data.stageSummary.length > 0
              ? data.stageSummary.reduce((a, b) =>
                  a.avgDailyOrders > b.avgDailyOrders ? a : b,
                ).label
              : "—"}
          </p>
        </div>
      </div>

      {/* Stage summary table */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            Ringkasan per Tahap
          </h2>
          <span className="text-xs text-slate-400 ml-auto">
            90 hari terakhir
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs">
                <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                  Tahap
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                  Order-Hari
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                  Rata-rata/hari
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-slate-500">
                  Puncak
                </th>
                <th className="px-5 py-2.5 text-right font-medium text-slate-500">
                  Saat Ini
                </th>
              </tr>
            </thead>
            <tbody>
              {data.stageSummary.map((s) => {
                const maxDaily =
                  data.stageSummary.length > 0
                    ? Math.max(...data.stageSummary.map((x) => x.avgDailyOrders))
                    : 1;
                const barWidth =
                  maxDaily > 0 ? (s.avgDailyOrders / maxDaily) * 100 : 0;
                return (
                  <tr
                    key={s.stage}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-2.5 text-xs font-medium text-slate-800">
                      {s.label}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                      {fmtCount(s.totalOrderDays)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {s.avgDailyOrders.toFixed(1)}
                        </span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${Math.min(barWidth, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-700">
                      {s.peakDailyOrders}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span
                        className={`text-xs font-semibold ${
                          (data.currentCounts[s.stage] || 0) > s.avgDailyOrders * 1.5
                            ? "text-rose-600"
                            : "text-slate-700"
                        }`}
                      >
                        {data.currentCounts[s.stage] || 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Heatmap */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            Heatmap Kepadatan Order
          </h2>
          <span className="text-xs text-slate-400 ml-auto">
            Semakin pekat = semakin banyak order
          </span>
        </header>
        <div className="p-5 overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header: dates */}
            <div className="flex mb-1">
              <div className="w-36 flex-shrink-0" />
              <div className="flex-1 flex">
                {weekGroups.map((wg, wi) => (
                  <div
                    key={wi}
                    className="text-[9px] text-slate-400 text-center font-medium"
                    style={{
                      flex: `${wg.endIdx - wg.startIdx + 1} 0 auto`,
                    }}
                  >
                    {wg.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows per stage */}
            {STAGE_SEQUENCE.map((stage) => {
              const dayCounts = data.heatmap[stage] || {};
              const counts = dates.map((d) => dayCounts[d] || 0);
              return (
                <div key={stage} className="flex items-center mb-0.5">
                  <div className="w-36 flex-shrink-0 pr-2">
                    <span className="text-[10px] text-slate-600 leading-none block truncate">
                      {getStageLabel(stage)}
                    </span>
                  </div>
                  <div className="flex-1 flex gap-[1px]">
                    {counts.map((c, ci) => (
                      <div
                        key={ci}
                        className={`flex-1 h-4 rounded-[2px] ${colorFor(c)}`}
                        title={`${getStageLabel(stage)} — ${dates[ci]}: ${c} order`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
