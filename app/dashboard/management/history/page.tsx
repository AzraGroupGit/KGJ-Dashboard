// app/dashboard/management/history/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { Diamond } from "@/components/dashboard/superadmin/Diamond";
import { C } from "@/app/dashboard/superadmin/management/_shared/constants";

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
  const [expandedIdxs, setExpandedIdxs] = useState<Set<number>>(new Set());

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
  const history = useMemo(() => {
    return tasks.flatMap((task) =>
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
        })),
    ).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [tasks]);

  const monthGroups = useMemo(() => {
    const groups: { label: string; entries: HistoryEntry[] }[] = [];
    for (const entry of history) {
      const d = new Date(entry.completed_at);
      const label = `${d.toLocaleDateString("id-ID", { month: "long" })} ${d.getFullYear()}`;
      let group = groups.find((g) => g.label === label);
      if (!group) { group = { label, entries: [] }; groups.push(group); }
      group.entries.push(entry);
    }
    return groups;
  }, [history]);

  const toggleExpand = (idx: number) => setExpandedIdxs((prev) => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  const statusColor = (status: string) => status === "selesai" ? C.sage : status === "proses" ? C.amber : C.terra;
  const statusLabel = (status: string) => status === "selesai" ? "Selesai" : status === "proses" ? "Proses" : "Belum";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="management" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="management" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Masthead */}
            <div className="mb-6">
              <h2 className="text-3xl leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: C.ink }}>
                Riwayat <i style={{ color: C.gold, fontWeight: 400 }}>Tugas</i>
              </h2>
              <p className="text-sm mt-0.5" style={{ color: C.faded }}>Log penyelesaian tugas yang sudah dikerjakan</p>
              <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
            </div>

            {isLoading ? (
              <Loading variant="skeleton" text="Memuat data..." />
            ) : history.length === 0 ? (
              <div className="text-center py-16 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10" style={{ color: C.ghost }} />
                <p style={{ color: C.faded }}>Belum ada riwayat penyelesaian tugas.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {monthGroups.map((month) => (
                  <div key={month.label}>
                    <div className="flex items-center gap-4 mb-5 sticky top-0 z-10 py-2" style={{ background: "#F9FAFB" }}>
                      <div className="shrink-0 flex flex-col items-center">
                        <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: C.gold }}>{month.label.slice(0, 3)}</span>
                        <span className="text-lg" style={{ fontFamily: "var(--font-display)", color: C.ink, lineHeight: 1 }}>{month.label.split(" ")[1]}</span>
                      </div>
                      <div className="flex-1 h-px" style={{ background: C.goldDim }} />
                      <span className="text-[10px]" style={{ color: C.ghost }}>{month.entries.length}</span>
                    </div>

                    <div className="relative pl-8">
                      <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: C.goldDim }} />
                      {month.entries.map((entry) => {
                        const globalIdx = history.indexOf(entry);
                        const isExpanded = expandedIdxs.has(globalIdx);
                        const clr = statusColor(entry.status);
                        return (
                          <div key={globalIdx} className="relative pb-3 last:pb-0">
                            <div className="absolute left-[-28px] top-1.5 rounded-full border-2" style={{ width: 10, height: 10, borderColor: clr, background: "#F9FAFB" }} />
                            <div className="rounded-lg border p-3 cursor-pointer" style={{ background: C.card, borderColor: C.border }} onClick={() => toggleExpand(globalIdx)}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Diamond size={4} />
                                  <span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-display)", color: C.ink }}>{entry.item}</span>
                                </div>
                                <span className="text-[10px] font-mono shrink-0" style={{ color: C.ghost }}>
                                  {new Date(entry.completed_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium shrink-0" style={{ background: `color-mix(in srgb, ${clr} 12%, transparent)`, color: clr }}>
                                  <Diamond size={3} />{statusLabel(entry.status)}
                                </span>
                                <span className="text-[10px]" style={{ color: C.ghost }}>{entry.task}</span>
                                {isExpanded && <ChevronDown className="h-3 w-3 shrink-0 ml-auto" style={{ color: C.gold }} />}
                              </div>
                              {isExpanded && (
                                <div className="mt-2 pt-2 space-y-2 text-[11px]" style={{ borderTop: `0.5px solid ${C.goldDim}` }}>
                                  <div className="flex items-start gap-2">
                                    <span className="shrink-0 font-medium" style={{ color: C.ghost, width: 80 }}>Catatan</span>
                                    <span style={{ color: entry.notes ? C.faded : C.ghost }}>{entry.notes || "—"}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="shrink-0 font-medium flex items-center gap-1" style={{ color: entry.kendala ? C.terra : C.ghost, width: 80 }}>
                                      <AlertCircle className="h-3 w-3" /> Kendala
                                    </span>
                                    <span style={{ color: entry.kendala ? C.terra : C.ghost }}>{entry.kendala || "—"}</span>
                                  </div>
                                  {entry.admin_notes && (
                                    <div className="flex items-start gap-2">
                                      <span className="shrink-0 font-medium" style={{ color: C.gold, width: 80 }}>◆ Admin</span>
                                      <span style={{ color: C.gold }}>{entry.admin_notes}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
