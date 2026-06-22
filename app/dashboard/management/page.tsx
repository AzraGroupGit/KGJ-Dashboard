// app/dashboard/management/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Calendar } from "lucide-react";
import { C } from "@/app/dashboard/superadmin/management/_shared/constants";

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

function getDeadlineUrgency(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(deadline); const now = new Date();
  now.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  if (d.getTime() < now.getTime()) return "overdue" as const;
  if (d.getTime() === now.getTime()) return "today" as const;
  return "future" as const;
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

  const tasks = useMemo(() => data?.data ?? [], [data]);

  const allItems = useMemo(() => tasks.flatMap((t) => t.items ?? []), [tasks]);
  const completed = allItems.filter((i) => i.progress?.[0]?.status === "selesai").length;
  const inProgress = allItems.filter((i) => i.progress?.[0]?.status === "proses").length;
  const pending = allItems.filter((i) => !i.progress?.[0]?.status || i.progress?.[0]?.status === "pending").length;
  const total = allItems.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const kpiCards = [
    { label: "Total Tasks", value: tasks.length, icon: ClipboardList, color: C.gold, bg: "#FFF5DC" },
    { label: "Selesai", value: completed, icon: CheckCircle2, color: C.sage, bg: "var(--color-sage-bg)" },
    { label: "Proses", value: inProgress, icon: Clock, color: C.amber, bg: "var(--color-amber-bg)" },
    { label: "Belum", value: pending, icon: AlertTriangle, color: C.terra, bg: "var(--color-terra-bg)" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="management" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="management" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Masthead */}
            <div className="mb-8">
              <h2 className="text-[40px] leading-[0.95]" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: C.ink, letterSpacing: "-0.02em" }}>
                Dashboard <i style={{ color: C.gold, fontWeight: 400 }}>Management</i>
              </h2>
              <p className="text-sm mt-1" style={{ color: C.faded }}>Ringkasan progress dan checklist tugas</p>
              <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
            </div>

            {isLoading ? (
              <Loading variant="skeleton" text="Memuat data..." />
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="rounded-lg border p-5" style={{ background: C.card, borderColor: C.border }}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3" style={{ background: bg }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                      <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{value}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.faded }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Overall Progress */}
                <div className="rounded-lg border p-5 mb-8" style={{ background: C.card, borderColor: C.border }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: C.sepia }}>Progress Keseluruhan</p>
                    <p className="text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{progress}%</p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(total || 1)].map((_, i) => {
                      const item = allItems[i];
                      const st = item?.progress?.[0]?.status ?? "belum";
                      const fill = st === "selesai" ? C.sage : st === "proses" ? C.gold : C.border;
                      return <div key={i} className="flex-1 h-2" style={{ background: fill }} />;
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px]" style={{ color: C.ghost }}>{completed} selesai · {inProgress} proses · {pending} belum</span>
                  </div>
                </div>

                {/* Task Cards */}
                {tasks.length === 0 ? (
                  <div className="text-center py-12 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <ClipboardList className="mx-auto mb-3 h-10 w-10" style={{ color: C.ghost }} />
                    <p style={{ color: C.faded }}>Belum ada task. Tambahkan dari menu Tugas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const items = task.items ?? [];
                      const done = items.filter((i) => i.progress?.[0]?.status === "selesai").length;
                      const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                      const urgency = getDeadlineUrgency(task.deadline);
                      const borderStyle = urgency === "overdue" ? { borderLeft: `3px solid ${C.terra}` } : urgency === "today" ? { borderLeft: `3px solid ${C.amber}` } : {};
                      return (
                        <div key={task.id} className="rounded-lg border p-4" style={{ background: C.card, borderColor: C.border, ...borderStyle }}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{task.title}</p>
                              {task.deadline && (
                                <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: urgency === "overdue" ? C.terra : urgency === "today" ? C.amber : C.ghost }}>
                                  <Calendar className="h-3 w-3" />
                                  {urgency === "overdue" ? "Terlambat — " : ""}
                                  {new Date(task.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{done}/{items.length}</p>
                              <p className="text-[10px]" style={{ color: C.faded }}>{pct}%</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {items.map((item, i) => {
                              const st = item.progress?.[0]?.status ?? "belum";
                              const fill = st === "selesai" ? C.sage : st === "proses" ? C.gold : C.border;
                              return <div key={i} className="flex-1 h-1.5" style={{ background: fill }} />;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
