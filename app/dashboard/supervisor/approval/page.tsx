// app/dashboard/supervisor/approval/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Hammer,
  RefreshCw,
  Settings,
  XCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingItem {
  order_id: string;
  order_number: string;
  product_name: string;
  customer_name: string;
  stage: string;
  stage_label: string;
  stage_group: "production" | "operational";
  waiting_since: string;
  stage_result_id: string | null;
  attempt_number: number | null;
  worker_name: string;
  worker_role: string;
  submitted_at: string | null;
  data: Record<string, unknown> | null;
}

type ActionState =
  | { type: "idle" }
  | { type: "confirming_reject" }
  | { type: "loading" }
  | { type: "done"; result: "approved" | "rejected"; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function formatDataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return value.toLocaleString("id-ID");
  return String(value);
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Sub: Data viewer ──────────────────────────────────────────────────────────

function DataViewer({
  data,
  expanded,
  onToggle,
}: {
  data: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const entries = Object.entries(data).filter(
    ([k]) => !k.startsWith("_sv_") && k !== "notes",
  );

  if (entries.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">Tidak ada data tersimpan</p>
    );
  }

  const preview = entries.slice(0, 3);
  const hasMore = entries.length > 3;

  return (
    <div>
      <dl className="space-y-1.5">
        {(expanded ? entries : preview).map(([key, val]) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt className="text-[11px] text-slate-400 shrink-0">
              {humanizeKey(key)}
            </dt>
            <dd className="text-[12px] font-medium text-slate-700 text-right">
              {formatDataValue(val)}
            </dd>
          </div>
        ))}
      </dl>
      {hasMore && (
        <button
          onClick={onToggle}
          className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Sembunyikan
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> +{entries.length - 3} lainnya
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Sub: Pending card ─────────────────────────────────────────────────────────

function PendingCard({
  item,
  onApprove,
  onReject,
}: {
  item: PendingItem;
  onApprove: (stageResultId: string | null, orderId: string, stage: string) => Promise<void>;
  onReject: (
    stageResultId: string | null,
    orderId: string,
    stage: string,
    notes: string,
  ) => Promise<void>;
}) {
  const [state, setState] = useState<ActionState>({ type: "idle" });
  const [rejectNotes, setRejectNotes] = useState("");
  const [dataExpanded, setDataExpanded] = useState(false);

  const isProduction = item.stage_group === "production";

  const handleApprove = async () => {
    setState({ type: "loading" });
    try {
      await onApprove(item.stage_result_id, item.order_id, item.stage);
      setState({
        type: "done",
        result: "approved",
        message: "Disetujui — order maju ke tahap berikutnya",
      });
    } catch (err) {
      setState({ type: "idle" });
      alert(err instanceof Error ? err.message : "Gagal menyetujui");
    }
  };

  const handleRejectConfirm = async () => {
    setState({ type: "loading" });
    try {
      await onReject(item.stage_result_id, item.order_id, item.stage, rejectNotes);
      setState({
        type: "done",
        result: "rejected",
        message: "Ditolak — worker perlu submit ulang",
      });
    } catch (err) {
      setState({ type: "idle" });
      alert(err instanceof Error ? err.message : "Gagal menolak");
    }
  };

  if (state.type === "done") {
    return (
      <div
        className={`rounded-lg border p-4 transition-all ${
          state.result === "approved"
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-slate-200 bg-slate-50/60"
        }`}
      >
        <div className="flex items-center gap-2">
          {state.result === "approved" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-slate-500" />
          )}
          <span className="text-sm font-medium text-slate-700">
            {item.order_number} — {item.stage_label}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Stage group accent bar */}
      <div
        className={`h-1 w-full ${
          isProduction ? "bg-amber-400" : "bg-blue-400"
        }`}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-slate-800">
                {item.order_number}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  isProduction
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }`}
              >
                {item.stage_label}
              </span>
              {(item.attempt_number ?? 0) > 1 && (
                <span className="rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                  Percobaan ke-{item.attempt_number}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.product_name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-medium text-slate-700">
              {item.worker_name}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {formatRelative(item.submitted_at)}
            </p>
          </div>
        </div>

        {/* Submitted data */}
        <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2.5 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Data yang disubmit
          </p>
          <DataViewer
            data={item.data ?? {}}
            expanded={dataExpanded}
            onToggle={() => setDataExpanded((v) => !v)}
          />
        </div>

        {/* Actions */}
        {state.type === "idle" && (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
            >
              Setujui
            </button>
            <button
              onClick={() => setState({ type: "confirming_reject" })}
              className="flex-1 rounded-lg border border-rose-200 bg-white py-2.5 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50 active:scale-[0.98]"
            >
              Tolak
            </button>
          </div>
        )}

        {state.type === "confirming_reject" && (
          <div className="space-y-2">
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Alasan penolakan (wajib diisi)..."
              rows={2}
              autoFocus
              className="w-full rounded-lg border border-rose-200 bg-rose-50/40 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectNotes.trim()}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Konfirmasi Tolak
              </button>
              <button
                onClick={() => setState({ type: "idle" })}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {state.type === "loading" && (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Memproses...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "production" | "operational";

export default function SupervisorApprovalPage() {
  const router = useRouter();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Verify supervisor identity
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (!res.ok) { router.push("/workshop/login"); return; }
      const json = await res.json();
      const u = json.data;
      if (u.role.name !== "supervisor" && u.role.name !== "superadmin") {
        router.push("/workshop/login");
        return;
      }
      setUserEmail(u.username || u.full_name || "");
    })();
  }, [router]);

  const fetchPending = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/pending");
      if (!res.ok) throw new Error("Gagal memuat data persetujuan");
      const json = await res.json();
      setItems(json.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(() => fetchPending(false), 30_000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleApprove = useCallback(
    async (stageResultId: string | null, orderId: string, stage: string) => {
      const res = await fetch("/api/supervisor/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_result_id: stageResultId,
          order_id: orderId,
          stage,
          action: "approve",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyetujui");
    },
    [],
  );

  const handleReject = useCallback(
    async (
      stageResultId: string | null,
      orderId: string,
      stage: string,
      notes: string,
    ) => {
      const res = await fetch("/api/supervisor/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_result_id: stageResultId,
          order_id: orderId,
          stage,
          action: "reject",
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menolak");
    },
    [],
  );

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.stage_group === filter;
  });

  const productionCount = items.filter((i) => i.stage_group === "production").length;
  const operationalCount = items.filter((i) => i.stage_group === "operational").length;

  const tabs: { key: FilterTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "all", label: "Semua", icon: Clock, count: items.length },
    { key: "production", label: "Produksi", icon: Hammer, count: productionCount },
    { key: "operational", label: "Operasional", icon: Settings, count: operationalCount },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="supervisor" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          role="supervisor"
          logoutPath="/workshop/login"
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Page header */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-y-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Persetujuan Tahap
              </h2>
              <p className="text-sm text-slate-500">
                Review dan setujui hasil kerja tim
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-slate-400">
                  {lastUpdated.toLocaleTimeString("id-ID")}
                </span>
              )}
              <button
                onClick={() => fetchPending(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <ApprovalSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <button
                onClick={() => fetchPending(true)}
                className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Filter tabs */}
              <div className="border-b border-slate-200 overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                          filter === tab.key
                            ? "border-slate-800 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            filter === tab.key
                              ? "bg-slate-800 text-white"
                              : tab.count > 0
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cards */}
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Semua submission sudah diproses
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Tidak ada yang menunggu persetujuan di kategori ini
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((item) => (
                    <PendingCard
                      key={item.order_id}
                      item={item}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ApprovalSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}
