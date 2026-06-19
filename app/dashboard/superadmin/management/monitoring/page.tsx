// app/dashboard/superadmin/management/monitoring/page.tsx

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { LayoutGrid, List, Calendar, X } from "lucide-react";
import { MetricsSection } from "@/components/dashboard/superadmin/MetricsSection";
import { ManagerCard } from "@/components/dashboard/superadmin/ManagerCard";
import { TaskDetailModal } from "@/components/dashboard/superadmin/TaskDetailModal";
import { Diamond } from "@/components/dashboard/superadmin/Diamond";

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

type SortKey = "completion" | "overdue" | "name";

const PAGE_SIZE = 8;

function isOverdue(deadline: string | null, status: string | null): boolean {
  if (!deadline || status === "selesai") return false;
  return new Date(deadline) < new Date();
}

function getManagerStats(m: ManagerData) {
  const allItems = m.tasks.flatMap((t) =>
    (t.items ?? []).map((item) => ({ item, deadline: t.deadline })),
  );
  const total = allItems.length || 1;
  const done = allItems.filter(
    (i) => i.item.progress?.[0]?.status === "selesai",
  ).length;
  const overdue = allItems.filter((i) =>
    isOverdue(i.deadline, i.item.progress?.[0]?.status ?? null),
  ).length;
  const doneRate = Math.round((done / total) * 100);
  return { done, total, overdue, doneRate };
}

export default function ManagementMonitoringPage() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchName, setSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [selectedManager, setSelectedManager] = useState<ManagerData | null>(
    null,
  );
  const [sortKey, setSortKey] = useState<SortKey>("completion");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const queryClient = useQueryClient();

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

  useEffect(() => {
    if (!showDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(e.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDatePicker]);

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: ManagerData[];
  }>({
    queryKey: ["superadmin", "management-tasks"],
    queryFn: () => fetcher("/api/superadmin/management-tasks"),
  });

  const managers = useMemo(() => data?.data ?? [], [data]);

  const filteredManagers = useMemo(() => {
    const result = managers
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

    result.sort((a, b) => {
      const sa = getManagerStats(a);
      const sb = getManagerStats(b);
      if (sortKey === "completion") return sa.doneRate - sb.doneRate;
      if (sortKey === "overdue") return sb.overdue - sa.overdue;
      return a.full_name.localeCompare(b.full_name);
    });

    return result;
  }, [managers, searchName, dateFrom, dateTo, sortKey]);

  const visibleManagers = useMemo(
    () => filteredManagers.slice(0, visibleCount),
    [filteredManagers, visibleCount],
  );

  const hasMore = visibleCount < filteredManagers.length;

  const metrics = useMemo(() => {
    const allItems = filteredManagers.flatMap((m) =>
      m.tasks.flatMap((t) =>
        (t.items ?? []).map((item) => ({
          item,
          deadline: t.deadline,
        })),
      ),
    );
    const total = allItems.length;
    const done = allItems.filter(
      (i) => i.item.progress?.[0]?.status === "selesai",
    ).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const overdue = allItems.filter((i) =>
      isOverdue(i.deadline, i.item.progress?.[0]?.status ?? null),
    ).length;
    const atRisk = allItems.filter(
      (i) =>
        i.item.progress?.[0]?.status === "proses" &&
        !isOverdue(i.deadline, i.item.progress?.[0]?.status ?? null),
    ).length;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const twoDaysAhead = new Date(now.getTime() + 2 * 86400000);
    const dueSoon = allItems.filter((i) => {
      if (!i.deadline || i.item.progress?.[0]?.status === "selesai")
        return false;
      const d = new Date(i.deadline);
      return d >= now && d <= twoDaysAhead;
    }).length;

    return { completionRate, total, done, overdue, atRisk, dueSoon };
  }, [filteredManagers]);

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

  const handleEscalate = async (manager: ManagerData) => {
    const allItems = manager.tasks.flatMap((t) =>
      (t.items ?? []).map((item) => ({
        item,
        taskTitle: t.title,
        deadline: t.deadline,
      })),
    );
    const overdueItems = allItems.filter((i) =>
      isOverdue(i.deadline, i.item.progress?.[0]?.status ?? null),
    );
    const atRiskItems = allItems.filter(
      (i) =>
        i.item.progress?.[0]?.status === "proses" &&
        !isOverdue(i.deadline, i.item.progress?.[0]?.status ?? null),
    );
    const taskList = [...overdueItems, ...atRiskItems]
      .map((i) => `\u25C6 ${i.item.title} (${i.taskTitle})`)
      .join("\n");
    const text = `Eskalasi \u2014 ${manager.full_name}\n\nTask perlu perhatian:\n${taskList}`;
    try {
      await navigator.clipboard.writeText(text);
      showAlert("success", "Template eskalasi disalin ke clipboard");
    } catch {
      showAlert("error", "Gagal menyalin ke clipboard");
    }
  };

  const hasFilters = !!(searchName || dateFrom || dateTo);
  const filterHint =
    hasFilters && filteredManagers.length !== managers.length
      ? `${filteredManagers.length} managers dari ${managers.length} total`
      : null;

  const C = {
    card: "var(--color-parch-card)",
    border: "var(--color-parch-border)",
    gold: "var(--color-gold)",
    goldText: "var(--color-gold-text)",
    faded: "var(--color-text-faded)",
    ghost: "var(--color-text-ghost)",
    ink: "var(--color-text-ink)",
  };

  const inputBase =
    "block w-full rounded border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    borderColor: "var(--color-parch-border)",
    color: "var(--color-text-ink)",
    background: "var(--color-parch-sidebar)",
  };
  const inputFocus = (el: HTMLElement) => {
    el.style.borderColor = "var(--color-gold)";
  };
  const inputBlur = (el: HTMLElement) => {
    el.style.borderColor = "var(--color-parch-border)";
  };

  const ROLE_DISPLAY: Record<string, string> = {
    leader_hc: "Leader HC",
    leader_operational: "Leader Operasional",
    leader_production: "Leader Produksi",
    leader_marketing: "Leader Marketing",
    leader_sales: "Leader Sales",
    leader_fat: "Leader FAT",
    leader_rnd: "Leader RND",
    leader_safar: "Leader Safar",
    leader_ga: "Leader GA",
    operational_supervisor: "Spv. Operasional",
    production_supervisor: "Spv. Produksi",
    superadmin: "Super Admin",
  };

  const displayManagers =
    viewMode === "table" ? filteredManagers : visibleManagers;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchName, dateFrom, dateTo, sortKey]);

  return (
    <div className="flex h-screen bg-gray-50">
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

          {/* Page Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h2
                className="text-[28px] leading-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  color: "var(--color-text-ink)",
                }}
              >
                Monitoring{" "}
                <i style={{ color: "var(--color-gold)", fontWeight: 400 }}>
                  Manajemen
                </i>
              </h2>
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--color-text-faded)" }}
              >
                Pantau progress task leaders untuk keseluruhan divisi
              </p>
            </div>

            {/* View toggle */}
            <div
              className="flex rounded overflow-hidden shrink-0"
              style={{ border: "1px solid var(--color-parch-border)" }}
            >
              <button
                onClick={() => setViewMode("cards")}
                className="px-3 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2"
                style={{
                  background:
                    viewMode === "cards"
                      ? "var(--color-gold)"
                      : "var(--color-parch-sidebar)",
                  color:
                    viewMode === "cards"
                      ? "#fff"
                      : "var(--color-text-faded)",
                }}
                title="Tampilan kartu"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className="px-3 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2"
                style={{
                  background:
                    viewMode === "table"
                      ? "var(--color-gold)"
                      : "var(--color-parch-sidebar)",
                  color:
                    viewMode === "table"
                      ? "#fff"
                      : "var(--color-text-faded)",
                }}
                title="Tampilan tabel"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Metrics Section */}
          <MetricsSection
            completionRate={metrics.completionRate}
            totalItems={metrics.total}
            doneItems={metrics.done}
            atRiskCount={metrics.atRisk}
            overdueCount={metrics.overdue}
            dueSoonCount={metrics.dueSoon}
          />

          {/* Controls Row — sticky */}
          <div
            className="sticky top-0 z-10 -mx-6 px-6 pt-3 pb-3 mb-3"
            style={{
              background: "#F9FAFB",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Cari nama atau role..."
                  className={inputBase}
                  style={inputStyle}
                  onFocus={(e) => inputFocus(e.currentTarget)}
                  onBlur={(e) => inputBlur(e.currentTarget)}
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Date filter button + popover */}
                <div className="relative" ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                    style={{
                      borderColor: dateFrom || dateTo ? C.gold : C.border,
                      color: dateFrom || dateTo ? C.goldText : C.faded,
                      background: C.card,
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {dateFrom || dateTo ? (
                      <span>
                        {dateFrom
                          ? new Date(dateFrom).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "…"}
                        {" — "}
                        {dateTo
                          ? new Date(dateTo).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "…"}
                      </span>
                    ) : (
                      "Filter"
                    )}
                  </button>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="absolute -top-1 -right-1 rounded-full p-0.5"
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <X className="h-2.5 w-2.5" style={{ color: C.ghost }} />
                    </button>
                  )}

                  {showDatePicker && (
                    <div
                      className="absolute right-0 top-full mt-1 z-30 rounded-lg border p-3 shadow-lg w-52"
                      style={{
                        background: C.card,
                        borderColor: C.border,
                      }}
                    >
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: C.faded }}>
                            Dari
                          </label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full rounded border px-2 py-1.5 text-xs outline-none transition-colors"
                            style={{
                              borderColor: C.border,
                              color: C.ink,
                              background: "var(--color-parch-sidebar)",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = C.gold;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: C.faded }}>
                            Sampai
                          </label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full rounded border px-2 py-1.5 text-xs outline-none transition-colors"
                            style={{
                              borderColor: C.border,
                              color: C.ink,
                              background: "var(--color-parch-sidebar)",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = C.gold;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                            }}
                          />
                        </div>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="w-full rounded py-1.5 text-[10px] font-medium text-white transition-colors"
                          style={{ background: C.gold }}
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className={inputBase + " w-auto text-xs"}
                  style={inputStyle}
                  onFocus={(e) => inputFocus(e.currentTarget)}
                  onBlur={(e) => inputBlur(e.currentTarget)}
                >
                  <option value="completion">Completion ↑</option>
                  <option value="overdue">Overdue ↓</option>
                  <option value="name">Nama A-Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter result counter */}
          {filterHint && (
            <p
              className="text-[11px] mb-3 italic"
              style={{ color: "var(--color-text-ghost)" }}
            >
              {filterHint}
            </p>
          )}

          {/* Content */}
          {isLoading ? (
            <Loading variant="skeleton" text="Memuat data..." />
          ) : filteredManagers.length === 0 ? (
            <div
              className="text-center py-12 rounded-lg"
              style={{
                background: "var(--color-parch-card)",
                border: "1px solid var(--color-parch-border)",
              }}
            >
              {hasFilters ? (
                <div className="space-y-3">
                  <p
                    className="text-sm"
                    style={{ color: "var(--color-text-faded)" }}
                  >
                    Tidak ada hasil
                    {searchName ? (
                      <>
                        {" "}
                        untuk{" "}
                        <span
                          style={{ color: "var(--color-text-ink)" }}
                        >
                          &quot;{searchName}&quot;
                        </span>
                      </>
                    ) : null}
                    {dateFrom || dateTo ? " pada rentang tanggal tersebut" : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchName("");
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "var(--color-gold-text)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--color-gold)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--color-gold-text)";
                    }}
                  >
                    Reset filter →
                  </button>
                </div>
              ) : (
                <p style={{ color: "var(--color-text-ghost)" }}>
                  Belum ada data manager dengan task.
                </p>
              )}
            </div>
          ) : viewMode === "cards" ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayManagers.map((manager) => (
                  <ManagerCard
                    key={manager.id}
                    manager={manager}
                    onViewAll={setSelectedManager}
                    onEscalate={handleEscalate}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((p) =>
                        Math.min(p + PAGE_SIZE, filteredManagers.length),
                      )
                    }
                    className="rounded px-6 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      border: "1px solid var(--color-parch-border)",
                      color: "var(--color-gold-text)",
                      background: "var(--color-parch-sidebar)",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "var(--color-gold)";
                      el.style.background = "var(--color-parch-card)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "var(--color-parch-border)";
                      el.style.background = "var(--color-parch-sidebar)";
                    }}
                  >
                    Tampilkan{" "}
                    {Math.min(PAGE_SIZE, filteredManagers.length - visibleCount)}{" "}
                    lainnya ·{" "}
                    {filteredManagers.length - visibleCount} tersisa
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Compact Table View */
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: "var(--color-parch-card)",
                border: "1px solid var(--color-parch-border)",
              }}
            >
              <table className="w-full text-sm">
                <thead style={{ background: "var(--color-parch-header)" }}>
                  <tr>
                    {["Manager", "Progress", "Status", "Aksi"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.15em] font-medium"
                        style={{
                          color: "var(--color-text-faded)",
                          borderBottom: "0.5px solid var(--color-gold-dim)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredManagers.map((manager) => {
                    const stats = getManagerStats(manager);
                    const allItems = manager.tasks.flatMap((t) =>
                      (t.items ?? []).map((item) => ({
                        item,
                        deadline: t.deadline,
                      })),
                    );
                    const overdue = allItems.filter((i) =>
                      isOverdue(
                        i.deadline,
                        i.item.progress?.[0]?.status ?? null,
                      ),
                    ).length;
                    return (
                      <tr
                        key={manager.id}
                        style={{
                          borderBottom: "0.5px solid var(--color-gold-dim)",
                        }}
                      >
                        <td className="px-5 py-3">
                          <p
                            className="leading-tight"
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 500,
                              color: "var(--color-text-ink)",
                            }}
                          >
                            {manager.full_name}
                          </p>
                          <p
                            className="text-[11px]"
                            style={{ color: "var(--color-text-faded)" }}
                          >
                            {ROLE_DISPLAY[manager.role_name] ??
                              manager.role_name}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex gap-0.5 max-w-[120px]">
                              {[...Array(stats.total)].map((_, i) => {
                                const item = allItems[i];
                                const st =
                                  item?.item.progress?.[0]?.status ?? "belum";
                                const fill =
                                  st === "selesai"
                                    ? "var(--color-sage)"
                                    : st === "proses"
                                      ? "var(--color-gold)"
                                      : "var(--color-parch-border)";
                                return (
                                  <div
                                    key={i}
                                    className="flex-1 h-1"
                                    style={{ background: fill }}
                                  />
                                );
                              })}
                            </div>
                            <span
                              className="text-xs"
                              style={{
                                color: "var(--color-text-sepia)",
                                fontFamily: "var(--font-display)",
                              }}
                            >
                              {stats.doneRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {stats.done > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  background: "var(--color-sage-bg)",
                                  color: "var(--color-sage)",
                                  border: "1px solid var(--color-sage-border)",
                                  borderRadius: 2,
                                }}
                              >
                                <Diamond size={4} />
                                {stats.done}
                              </span>
                            )}
                            {overdue > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  background: "var(--color-terra-bg)",
                                  color: "var(--color-terra)",
                                  border:
                                    "1px solid var(--color-terra-border)",
                                  borderRadius: 2,
                                }}
                              >
                                <Diamond size={4} />
                                {overdue}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedManager(manager)}
                              className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
                              style={{
                                border: "1px solid var(--color-parch-border)",
                                color: "var(--color-text-sepia)",
                                background: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.borderColor = "var(--color-gold)";
                                el.style.color = "var(--color-gold-text)";
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.borderColor =
                                  "var(--color-parch-border)";
                                el.style.color = "var(--color-text-sepia)";
                              }}
                            >
                              Detail
                            </button>
                            {overdue > 0 && (
                              <button
                                type="button"
                                onClick={() => handleEscalate(manager)}
                                className="rounded px-3 py-1.5 text-xs font-medium text-white transition-colors"
                                style={{ background: "var(--color-gold)" }}
                                onMouseEnter={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.background =
                                    "var(--color-gold-bright)";
                                }}
                                onMouseLeave={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.background = "var(--color-gold)";
                                }}
                              >
                                Eskalasi
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {selectedManager && (
        <TaskDetailModal
          manager={selectedManager}
          noteInput={noteInput}
          setNoteInput={setNoteInput}
          onSaveNote={handleSaveNote}
          onClose={() => setSelectedManager(null)}
        />
      )}
    </div>
  );
}
