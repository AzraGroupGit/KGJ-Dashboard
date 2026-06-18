// app/dashboard/management/history/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CheckCircle2, Clock, MessageSquare } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  progress: Array<{
    is_completed: boolean; status: string | null; completed_at: string | null;
    admin_notes: string | null; notes: string | null; kendala: string | null;
  }> | null;
}

interface Task {
  id: string;
  title: string;
  items: TaskItem[] | null;
}

interface HistoryEntry {
  item: string;
  task: string;
  status: string;
  completed_at: string;
  notes: string | null;
  kendala: string | null;
  admin_notes: string | null;
}

export default function ManagementHistoryPage() {
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
  const history: HistoryEntry[] = tasks.flatMap((task) =>
    (task.items ?? [])
      .filter((item) => item.progress?.[0]?.completed_at)
      .map((item) => ({
        item: item.title,
        task: task.title,
        status: item.progress![0].status ?? "pending",
        completed_at: item.progress![0].completed_at!,
        notes: item.progress![0].notes ?? null,
        kendala: item.progress![0].kendala ?? null,
        admin_notes: item.progress![0].admin_notes ?? null,
      }))
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "selesai": return "bg-emerald-50 text-emerald-700";
      case "proses": return "bg-orange-50 text-orange-700";
      default: return "bg-rose-50 text-rose-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "selesai": return "Selesai";
      case "proses": return "Proses";
      default: return "Belum";
    }
  };

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar role="management" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="management" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Riwayat Tugas</h1>
            <p className="text-sm text-stone-500">Log penyelesaian tugas yang sudah dikerjakan</p>
          </div>

          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data..." />
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-stone-200" />
              <p>Belum ada riwayat.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">{entry.task}</span>
                      <span className="text-sm text-stone-700">{entry.item}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadge(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(entry.completed_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {entry.notes && <span className="text-stone-500">📝 {entry.notes}</span>}
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
