// app/dashboard/superadmin/management/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CheckCircle2, Clock, Users, TrendingUp } from "lucide-react";

interface ManagerData { id: string; full_name: string; role_name: string; tasks: Array<{ items: Array<{ progress: Array<{ is_completed: boolean; completed_at: string | null }> | null }> | null }>; }

export default function ManagementDashboardPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  useEffect(() => { setClientUser(getClientUser()); }, []);

  const { data, isLoading } = useQuery<{ success: boolean; data: ManagerData[] }>({
    queryKey: ["superadmin", "management-tasks"],
    queryFn: () => fetcher("/api/superadmin/management-tasks"),
  });

  const managers = data?.data ?? [];

  const allItems = managers.flatMap((m) => m.tasks.flatMap((t) => t.items ?? []));
  const totalTasks = managers.flatMap((m) => m.tasks).length;
  const done = allItems.filter((i) => i.progress?.[0]?.is_completed).length;
  const total = allItems.length;
  const overallRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const thisWeekDone = allItems.filter((i) => {
    const d = i.progress?.[0]?.completed_at;
    if (!d) return false;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return new Date(d) >= weekAgo;
  }).length;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Dashboard Management</h2>
            <p className="text-sm text-slate-400 mt-0.5">Analisis statistik kinerja management</p>
          </div>

          {isLoading ? <Loading variant="skeleton" text="Memuat data..." /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Manager", value: managers.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Total Tasks", value: totalTasks, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Selesai (7 hari)", value: thisWeekDone, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Completion Rate", value: `${overallRate}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-3`}><Icon className={`h-5 w-5 ${color}`} /></div>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-700 mb-4">Completion Rate Keseluruhan</p>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${overallRate}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-10 text-right">{overallRate}%</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100"><p className="font-semibold text-slate-800">Leaderboard Manager</p></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 bg-slate-50 text-xs"><th className="px-6 py-2.5 text-left font-medium text-slate-500">Manager</th><th className="px-4 py-2.5 text-left font-medium text-slate-500">Role</th><th className="px-4 py-2.5 text-center font-medium text-slate-500">Selesai</th><th className="px-4 py-2.5 text-center font-medium text-slate-500">Progress</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...managers].sort((a, b) => {
                      const aItems = a.tasks.flatMap((t) => t.items ?? []);
                      const bItems = b.tasks.flatMap((t) => t.items ?? []);
                      const aDone = aItems.filter((i) => i.progress?.[0]?.is_completed).length;
                      const bDone = bItems.filter((i) => i.progress?.[0]?.is_completed).length;
                      return bDone - aDone;
                    }).map((m) => {
                      const items = m.tasks.flatMap((t) => t.items ?? []);
                      const mDone = items.filter((i) => i.progress?.[0]?.is_completed).length;
                      const mTotal = items.length;
                      const mRate = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-800">{m.full_name}</td>
                          <td className="px-4 py-3 text-slate-500">{m.role_name}</td>
                          <td className="px-4 py-3 text-center text-slate-700">{mDone}/{mTotal}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${mRate >= 80 ? "bg-emerald-500" : mRate >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${mRate}%` }} /></div>
                              <span className="text-xs text-slate-500 w-8 text-right">{mRate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
