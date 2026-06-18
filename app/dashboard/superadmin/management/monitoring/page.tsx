// app/dashboard/superadmin/management/monitoring/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import {
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Search,
} from "lucide-react";

const ROLE_DISPLAY: Record<string, string> = {
  leader_hc: "Leader HC",
  leader_operational: "Leader Operasional",
  leader_production: "Leader Produksi",
  leader_marketing: "Leader Marketing",
  leader_cs: "Leader CS",
  operational_supervisor: "Spv. Operasional",
  production_supervisor: "Spv. Produksi",
  superadmin: "Super Admin",
};

interface ProgressRow {
  id: string;
  is_completed: boolean;
  completed_at: string | null;
  status: string | null;
  admin_notes: string | null;
  notes: string | null;
  kendala: string | null;
}
interface TaskItem {
  id: string;
  title: string;
  sort_order: number;
  progress: ProgressRow[] | null;
}
interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  items: TaskItem[] | null;
}
interface ManagerData {
  id: string;
  full_name: string;
  username: string;
  role_name: string;
  tasks: Task[];
}

export default function ManagementMonitoringPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchName, setSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: ManagerData[];
  }>({
    queryKey: ["superadmin", "management-tasks"],
    queryFn: () => fetcher("/api/superadmin/management-tasks"),
  });

  const managers = data?.data ?? [];

  const filteredManagers = managers
    .filter((m) => {
      if (
        searchName &&
        !m.full_name.toLowerCase().includes(searchName.toLowerCase()) &&
        !m.role_name.toLowerCase().includes(searchName.toLowerCase())
      )
        return false;
      return true;
    })
    .map((m) => {
      const filteredTasks = m.tasks.map((task) => {
        const filteredItems = (task.items ?? []).filter((item) => {
          const pg = item.progress?.[0];
          if (!dateFrom && !dateTo) return true;
          const d = pg?.completed_at ? new Date(pg.completed_at) : null;
          if (dateFrom && (!d || d < new Date(dateFrom))) return false;
          if (dateTo && (!d || d > new Date(dateTo + "T23:59:59")))
            return false;
          return true;
        });
        return { ...task, items: filteredItems };
      });
      return { ...m, tasks: filteredTasks };
    });

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, message: msg });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSaveNote = async (progressId: string) => {
    const note = noteInput[progressId]?.trim();
    if (note === undefined) return;
    try {
      const res = await fetch("/api/superadmin/management-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress_id: progressId,
          admin_notes: note || null,
        }),
      });
      if (!res.ok) throw new Error("Gagal");
      showAlert("success", "Catatan tersimpan");
      queryClient.invalidateQueries({
        queryKey: ["superadmin", "management-tasks"],
      });
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Gagal");
    }
  };

  const toggleManager = (id: string) =>
    setExpandedManagers((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleTask = (id: string) =>
    setExpandedTasks((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {alert && (
            <div className="mb-4">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            </div>
          )}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Monitoring Manajemen
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Pantau progress task leaders untuk keseluruhan divisi
            </p>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Cari nama atau role..."
                className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
              title="Dari tanggal"
            />
            <span className="text-sm text-slate-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
              title="Sampai tanggal"
            />
            {(searchName || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchName("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Reset filter
              </button>
            )}
          </div>
          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data..." />
          ) : filteredManagers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              {searchName || dateFrom || dateTo
                ? "Tidak ada data sesuai filter"
                : "Belum ada data manager dengan task."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredManagers.map((manager) => {
                const isExpanded = expandedManagers.has(manager.id);
                const allItems = manager.tasks.flatMap((t) => t.items ?? []);
                const done = allItems.filter(
                  (i) => i.progress?.[0]?.status === "selesai",
                ).length;
                return (
                  <div
                    key={manager.id}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleManager(manager.id)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {manager.full_name
                          ?.split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800">
                          {manager.full_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ROLE_DISPLAY[manager.role_name] ?? manager.role_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">
                          {done}/{allItems.length}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase">
                          Progress
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        {manager.tasks.length === 0 ? (
                          <div className="px-6 py-8 text-center text-sm text-slate-400">
                            Belum ada task
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50 text-xs">
                                <th className="px-6 py-2.5 text-left font-medium text-slate-500 w-10">No</th>
                                <th className="px-4 py-2.5 text-left font-medium text-slate-500">Task</th>
                                <th className="px-4 py-2.5 text-left font-medium text-slate-500">Subtask</th>
                                <th className="px-4 py-2.5 text-left font-medium text-slate-500">Deadline</th>
                                <th className="px-4 py-2.5 text-center font-medium text-slate-500 w-20">Progress</th>
                                <th className="px-4 py-2.5 text-center font-medium text-slate-500 w-32">Catatan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {manager.tasks.map((task) => {
                                const items = task.items ?? [];
                                const taskExpanded = expandedTasks.has(task.id);
                                const visibleItems = taskExpanded ? items : items.slice(0, 1);
                                return visibleItems.map((item, idx) => {
                                  const pg = item.progress?.[0];
                                  const realIdx = taskExpanded ? idx : 0;
                                  return (
                                    <tr
                                      key={item.id}
                                      className="hover:bg-slate-50/50"
                                    >
                                      <td className="px-6 py-3 text-slate-500">
                                        {realIdx + 1}
                                      </td>
                                      <td className="px-4 py-3">
                                        <button
                                          onClick={() => toggleTask(task.id)}
                                          className="flex items-center gap-1 text-left text-slate-800 font-medium"
                                        >
                                          {taskExpanded ? (
                                            <ChevronDown className="w-3 h-3" />
                                          ) : (
                                            <ChevronRight className="w-3 h-3" />
                                          )}
                                          {task.title}
                                        </button>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600">
                                        {item.title}
                                      </td>
                                      <td className="px-4 py-3 text-slate-500 text-xs">
                                        {task.deadline ? new Date(task.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : <span className="text-slate-300">—</span>}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {pg?.status === "selesai" ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                            <Check className="w-3 h-3" /> Selesai
                                          </span>
                                        ) : pg?.status === "proses" ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                                            Proses
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                            Belum
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={
                                              noteInput[pg?.id ?? ""] ??
                                              pg?.admin_notes ??
                                              ""
                                            }
                                            onChange={(e) =>
                                              setNoteInput((p) => ({
                                                ...p,
                                                [pg?.id ?? ""]: e.target.value,
                                              }))
                                            }
                                            onBlur={() => {
                                              if (pg?.id) handleSaveNote(pg.id);
                                            }}
                                            placeholder="Tambah catatan..."
                                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                                          />
                                          {pg?.admin_notes && (
                                            <MessageSquare className="w-3 h-3 text-indigo-400 shrink-0" />
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }).concat(
                                  !taskExpanded && items.length > 1 ? [
                                    <tr key={`more-${task.id}`} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => toggleTask(task.id)}>
                                      <td className="px-6 py-3 text-slate-400" colSpan={6}>
                                        + {items.length - 1} item lainnya — klik untuk lihat semua
                                      </td>
                                    </tr>
                                  ] : []
                                );
                              })}
                            </tbody>
                          </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
