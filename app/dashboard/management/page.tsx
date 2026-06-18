// app/dashboard/management/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Calendar } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  progress: Array<{ is_completed: boolean; status: string | null; completed_at: string | null }> | null;
}

interface Task {
  id: string;
  title: string;
  deadline: string | null;
  items: TaskItem[] | null;
}

export default function ManagementOverviewPage() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);

  useEffect(() => {
    const u = getClientUser();
    if (!u) { router.push("/login"); return; }
    setClientUser(u);
  }, [router]);

  const { data, isLoading } = useQuery<{ success: boolean; data: Task[] }>({
    queryKey: ["management-tasks"],
    queryFn: () => fetcher("/api/management/tasks"),
  });

  const tasks = data?.data ?? [];
  const allItems = tasks.flatMap((t) => t.items ?? []);
  const completed = allItems.filter((i) => i.progress?.[0]?.status === "selesai").length;
  const inProgress = allItems.filter((i) => i.progress?.[0]?.status === "proses").length;
  const pending = allItems.filter((i) => !i.progress?.[0]?.status || i.progress?.[0]?.status === "pending").length;
  const total = allItems.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar role="management" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="management" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Dashboard Management</h1>
            <p className="text-sm text-stone-500">Ringkasan progress dan checklist tugas</p>
          </div>

          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data..." />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Tasks", value: tasks.length, icon: ClipboardList, bg: "bg-indigo-50", text: "text-indigo-600" },
                  { label: "Selesai", value: completed, icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600" },
                  { label: "Proses", value: inProgress, icon: Clock, bg: "bg-orange-50", text: "text-orange-600" },
                  { label: "Belum", value: pending, icon: AlertTriangle, bg: "bg-rose-50", text: "text-rose-600" },
                ].map(({ label, value, icon: Icon, bg, text }) => (
                  <div key={label} className="rounded-xl border border-stone-200 bg-white p-5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-3`}>
                      <Icon className={`h-5 w-5 ${text}`} />
                    </div>
                    <p className="text-2xl font-bold text-stone-800">{value}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mb-8 rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-stone-700">Progress Keseluruhan</p>
                  <p className="text-sm font-bold text-stone-800">{progress}%</p>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {tasks.map((task) => {
                const items = task.items ?? [];
                const done = items.filter((i) => i.progress?.[0]?.status === "selesai").length;
                const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                return (
                  <div key={task.id} className="mb-3 rounded-lg border border-stone-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-stone-800">{task.title}</p>
                        {task.deadline && (
                          <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">{done}/{items.length}</p>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-indigo-500" : "bg-stone-200"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
