// app/dashboard/superadmin/management/history/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CheckCircle2, Clock, User, MessageSquare } from "lucide-react";

interface ProgressRow { completed_at: string | null; status: string | null; admin_notes: string | null; notes: string | null; kendala: string | null; }
interface TaskItem { title: string; progress: ProgressRow[] | null; }
interface Task { title: string; items: TaskItem[] | null; }
interface ManagerData { id: string; full_name: string; role_name: string; tasks: Task[]; }

interface HistoryEntry { manager: string; role: string; item: string; task: string; status: string; completed_at: string; notes: string | null; kendala: string | null; admin_notes: string | null; }

export default function ManagementHistoryPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  useEffect(() => { setClientUser(getClientUser()); }, []);

  const { data, isLoading } = useQuery<{ success: boolean; data: ManagerData[] }>({
    queryKey: ["superadmin", "management-tasks"],
    queryFn: () => fetcher("/api/superadmin/management-tasks"),
  });

  const managers = data?.data ?? [];

  const history: HistoryEntry[] = managers.flatMap((m) =>
    m.tasks.flatMap((task) =>
      (task.items ?? [])
        .filter((item) => item.progress?.[0]?.completed_at)
        .map((item) => ({
          manager: m.full_name, role: m.role_name,
          item: item.title, task: task.title,
          status: item.progress![0].status ?? "pending",
          completed_at: item.progress![0].completed_at!,
          notes: item.progress![0].notes ?? null,
          kendala: item.progress![0].kendala ?? null,
          admin_notes: item.progress![0].admin_notes ?? null,
        })),
    ),
  ).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Riwayat Management</h2>
            <p className="text-sm text-slate-400 mt-0.5">Rekapitulasi penyelesaian tugas seluruh manager</p>
          </div>

          {isLoading ? <Loading variant="skeleton" text="Memuat data..." /> : history.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-200" /><p>Belum ada riwayat penyelesaian tugas.</p></div>
          ) : (
            <div className="space-y-2">
              {history.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600"><User className="h-3 w-3" />{entry.manager}</span>
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{entry.role}</span>
                      <span className="text-sm text-slate-700">{entry.item}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${entry.status === "selesai" ? "bg-emerald-50 text-emerald-700" : entry.status === "proses" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700"}`}>
                        {entry.status === "selesai" ? "Selesai" : entry.status === "proses" ? "Proses" : "Belum"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{entry.task}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(entry.completed_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {entry.notes && <span className="text-slate-500">📝 {entry.notes}</span>}
                      {entry.kendala && <span className="text-rose-500">⚠ {entry.kendala}</span>}
                      {entry.admin_notes && <span className="flex items-center gap-1 text-indigo-500"><MessageSquare className="h-3 w-3" />{entry.admin_notes}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
