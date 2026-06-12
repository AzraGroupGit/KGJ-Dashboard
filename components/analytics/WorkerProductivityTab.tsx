"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import {
  Users,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface WorkerData {
  userId: string;
  fullName: string;
  roleName: string;
  roleGroup: string;
  totalScans: number;
  totalCompleted: number;
  totalOrders: number;
  avgDuration: number | null;
  avgSusut: number | null;
  topStages: Array<{ stage: string; label: string; count: number }>;
}

const ROLE_COLORS: Record<string, string> = {
  jewelry_expert_lebur_bahan: "bg-orange-100 text-orange-700",
  jewelry_expert_pembentukan_awal: "bg-amber-100 text-amber-700",
  jewelry_expert_finishing: "bg-emerald-100 text-emerald-700",
  micro_setting: "bg-violet-100 text-violet-700",
  laser: "bg-sky-100 text-sky-700",
};

function fmtHours(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} mnt`;
  if (h < 24) return `${h.toFixed(1)} jam`;
  const d = Math.floor(h / 24);
  return `${d}h`;
}

export default function WorkerProductivityTab() {
  const { data, isLoading, error } = useQuery<{ workers: WorkerData[] }>({
    queryKey: ["analytics", "worker-productivity"],
    queryFn: () => fetcher<{ workers: WorkerData[] }>("/api/analytics/worker-productivity"),
  });
  const [sortBy, setSortBy] = useState<"scans" | "completed" | "orders" | "duration">("scans");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const workers = useMemo(() => data?.workers ?? [], [data]);

  const sorted = useMemo(() => {
    const arr = [...workers].filter(
      (w) => roleFilter === "all" || w.roleName === roleFilter,
    );
    arr.sort((a, b) => {
      switch (sortBy) {
        case "completed":
          return b.totalCompleted - a.totalCompleted;
        case "orders":
          return b.totalOrders - a.totalOrders;
        case "duration":
          return (a.avgDuration ?? Infinity) - (b.avgDuration ?? Infinity);
        default:
          return b.totalScans - a.totalScans;
      }
    });
    return arr;
  }, [workers, sortBy, roleFilter]);

  const roles = useMemo(() => {
    const set = new Set(workers.map((w) => w.roleName).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [workers]);

  const summary = useMemo(() => {
    return {
      totalWorkers: sorted.length,
      totalScans: sorted.reduce((s, w) => s + w.totalScans, 0),
      totalCompleted: sorted.reduce((s, w) => s + w.totalCompleted, 0),
      totalOrders: sorted.reduce((s, w) => s + w.totalOrders, 0),
    };
  }, [sorted]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-slate-100" />
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

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Staff Aktif
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {summary.totalWorkers}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Total Scan
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {summary.totalScans.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Tahap Selesai
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {summary.totalCompleted.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Order Dikerjakan
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {summary.totalOrders.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* Table */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">
              Produktivitas per Staff
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 focus:outline-none"
            >
              <option value="all">Semua Role</option>
              {roles
                .filter((r) => r !== "all")
                .map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
            </select>
          </div>
        </header>

        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <BarChart3 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Belum ada data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs">
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">
                    Nama
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">
                    Role
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                    onClick={() => setSortBy("scans")}
                  >
                    Scan {sortBy === "scans" && "↓"}
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                    onClick={() => setSortBy("completed")}
                  >
                    Selesai {sortBy === "completed" && "↓"}
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                    onClick={() => setSortBy("orders")}
                  >
                    Order {sortBy === "orders" && "↓"}
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                    onClick={() => setSortBy("duration")}
                  >
                    Rata Waktu {sortBy === "duration" && "↓"}
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium text-slate-500">
                    Susut
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((w, _i) => {
                  const maxVal = sorted.reduce((m, x) => Math.max(m, x.totalCompleted), 1);
                  const barWidth = (w.totalCompleted / maxVal) * 100;
                  const roleColor = ROLE_COLORS[w.roleName] || "bg-slate-100 text-slate-600";
                  const susutOk = w.avgSusut == null || w.avgSusut <= 5;
                  return (
                    <tr
                      key={w.userId}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {w.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColor}`}
                        >
                          {ROLE_COLORS[w.roleName]
                            ? w.roleName.replace(/^jewelry_expert_/, "").replace(/_/g, " ")
                            : w.roleName.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-900">
                        {w.totalScans.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {w.totalCompleted.toLocaleString("id-ID")}
                          </span>
                          <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                        {w.totalOrders.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                        {fmtHours(w.avgDuration)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {w.avgSusut != null ? (
                          <span
                            className={`text-xs font-semibold inline-flex items-center gap-1 ${
                              susutOk ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {w.avgSusut.toFixed(1)}%
                            {susutOk ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <TrendingUp className="h-3 w-3" />
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
