"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Gem,
  Hammer,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { getStageDeadlineStatus } from "@/lib/stage-deadlines";
import { getStageLabel } from "@/lib/stages";
export { getStageLabel };
import type { StageBottleneck } from "@/types/bottleneck";

// ── Re-exports ─────────────────────────────────────────────────────────────────

export type { StageBottleneck } from "@/types/bottleneck";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GemstoneInfo {
  type?: string;
  gemstone_type?: string;
  pieces?: number;
  carat_total?: number;
}

export interface MicroRow {
  order_id: string;
  order_number: string;
  gemstone_info: GemstoneInfo[] | null;
  current_stage: string;
  staff_name: string | null;
  weight_before: number | null;
  weight_after: number | null;
  status: "waiting" | "in_progress" | "completed";
}

export interface YieldDataRow {
  order_number: string;
  target: number | null;
  actual: number | null;
}

export interface Expert {
  userId: string;
  fullName: string;
  roleName: string;
  stage: string | null;
  totalScans: number;
  ordersHandled: number;
  activeOrder: { orderNumber: string; startedAt: string } | null;
  rataSusut: number | null;
  targetSusut: number | null;
}

export interface ProduksiData {
  experts: Expert[];
  microSetting: MicroRow[];
  yieldData: YieldDataRow[];
}

export interface KonfirmasiOrder {
  order_number: string;
  customer_name: string | null;
  dp_requested_at: string | null;
  dp_amount: number | null;
  hours_elapsed: number;
}

export interface PelunasanOrder {
  order_number: string;
  customer_name: string | null;
  total_price: number | null;
  dp_paid: number | null;
  remaining_amount: number | null;
  payment_status: string | null;
  final_payment_method: string | null;
}

export interface DeliveryOrder {
  order_number: string;
  customer_name: string | null;
  delivery_method: string | null;
  shipped_at: string | null;
  courier_name: string | null;
  tracking_number: string | null;
}

export interface AdminTask {
  order_id: string;
  order_number: string;
  stage: string;
  executed_by: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  is_delayed: boolean;
}

export interface RacikLog {
  order_number: string;
  staff_name: string | null;
  target_weight: number | null;
  total_weight: number | null;
}

export interface LaserResult {
  order_number: string;
  ring_identity_number: string | null;
  font_style: string | null;
}

export interface QCSummaryRow {
  qc_type: string;
  total_checks: number;
  passed: number;
  failed: number;
  pass_rate: number;
}

export interface ReworkData {
  reworkCount: number;
  totalOrders: number;
  reworkRate: number;
  majorCount: number;
  minorCount: number;
  topStageRework: Array<{ flow: string; count: number }>;
  recentRework: Array<{ order_id: string; from_stage: string; to_stage: string; reason: string; severity: string; logged_at: string }>;
}

export interface QCActivity {
  order_number: string;
  stage: string;
  result: string | null;
  executed_by: string | null;
  finished_at: string | null;
  notes: string | null;
}

export interface OperasionalData {
  afterSales: {
    konfirmasi: KonfirmasiOrder[];
    pelunasan: PelunasanOrder[];
    delivery: DeliveryOrder[];
  };
  adminTasks: AdminTask[];
  racik: {
    totalBeratTeoritis: number;
    rataDeviasi: number;
    rataBuffer: number;
    logs: RacikLog[];
  };
  laser: {
    mesinAktif: string[];
    antrianUkir: number;
    rataWaktuPengerjaan: number;
    recentResults: LaserResult[];
  };
  qc: {
    summary: QCSummaryRow[];
    activity: QCActivity[];
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const ROLE_CONFIG: Record<string, { name: string; Icon: LucideIcon }> = {
  jewelry_expert_lebur_bahan: { name: "Lebur Bahan", Icon: Flame },
  jewelry_expert_pembentukan_awal: { name: "Pembentukan Cincin", Icon: Hammer },
  jewelry_expert_pemasangan_permata: { name: "Micro Setting", Icon: Gem },
  jewelry_expert_pemolesan: { name: "Pemolesan", Icon: Sparkles },
  jewelry_expert_finishing: { name: "Finishing", Icon: Sparkles },
  laser_batik: { name: "Laser Batik", Icon: ScanLine },
  laser_nama: { name: "Laser Nama", Icon: ScanLine },
};

export const QC_LABELS: Record<string, string> = { qc_1: "QC Awal", qc_2: "QC Akhir" };

export const DELIVERY_LABELS: Record<string, string> = {
  pickup_store: "Pickup di Toko",
  courier_local: "Kurir Lokal",
  courier_intercity: "Kurir Antar Kota",
  in_house_delivery: "Antar Langsung",
  other: "Lainnya",
};

// ── Formatters ─────────────────────────────────────────────────────────────────

export function fmtTime(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m lalu`;
  if (hrs < 24) return `${hrs}j lalu`;
  if (days < 7) return `${days}h lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function fmtHours(h: number): string {
  return h >= 24 ? `${Math.floor(h / 24)}h ${Math.round(h % 24)}j` : `${h}j`;
}

export function fmtGemstone(info: GemstoneInfo[] | null): string {
  if (!info?.length) return "—";
  const f = info[0];
  const type = f.gemstone_type ?? f.type ?? "permata";
  const parts = [type];
  if (f.pieces && f.pieces > 1) parts.push(`×${f.pieces}`);
  if (f.carat_total != null) parts.push(`${f.carat_total}ct`);
  return parts.join(" ");
}

export function getSLA(hours: number) {
  if (hours > 48)
    return {
      label: "Terlambat",
      cls: "bg-rose-50 text-rose-700 ring-rose-200",
    };
  if (hours > 24)
    return {
      label: "Perhatian",
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  return {
    label: "On Track",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
}

export function buildUrl(base: string, from: string, to: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ── Shared Sub-components ──────────────────────────────────────────────────────

export function KpiChip({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "emerald" | "amber" | "rose" | "violet" | "sky" | "slate";
  sub: string;
}) {
  const aMap = {
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "ring-emerald-100",
      val: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      ring: "ring-amber-100",
      val: "text-amber-700",
    },
    rose: {
      bg: "bg-rose-50",
      text: "text-rose-600",
      ring: "ring-rose-100",
      val: "text-rose-700",
    },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-600",
      ring: "ring-violet-100",
      val: "text-violet-700",
    },
    sky: {
      bg: "bg-sky-50",
      text: "text-sky-600",
      ring: "ring-sky-100",
      val: "text-sky-700",
    },
    slate: {
      bg: "bg-slate-50",
      text: "text-slate-500",
      ring: "ring-slate-100",
      val: "text-slate-800",
    },
  };
  const a = aMap[accent];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset ${a.bg} ${a.ring}`}
        >
          <Icon className={`h-3.5 w-3.5 ${a.text}`} />
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          {sub}
        </span>
      </div>
      <p className={`text-base font-bold tabular-nums ${a.val}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

export function ExpertCard({ expert }: { expert: Expert }) {
  const cfg = ROLE_CONFIG[expert.roleName] ?? {
    name: expert.roleName,
    Icon: Wrench,
  };
  const { Icon } = cfg;
  const isActive = !!expert.activeOrder;
  const hasSusut = expert.rataSusut != null && expert.targetSusut != null;
  const isOverSusut = hasSusut && expert.rataSusut! > expert.targetSusut!;
  const now = Date.now();
  const mins = expert.activeOrder
    ? Math.floor(
        (now - new Date(expert.activeOrder.startedAt).getTime()) /
          60_000,
      )
    : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {cfg.name}
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-slate-900">
            {expert.fullName}
          </p>
        </div>
        {isActive ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Bekerja
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
            Idle
          </span>
        )}
      </div>
      {expert.activeOrder && (
        <div className="mb-3 rounded-md bg-emerald-50/50 p-2 ring-1 ring-inset ring-emerald-100">
          <p className="mb-0.5 text-[10px] uppercase tracking-wide text-emerald-600">
            Sedang dikerjakan
          </p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-emerald-900">
              {expert.activeOrder.orderNumber}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-700">
              <Clock className="h-3 w-3" />
              {mins}m
            </span>
          </div>
        </div>
      )}
      <dl className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Order hari ini</dt>
          <dd className="font-semibold text-slate-900">
            {expert.ordersHandled}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Total scan</dt>
          <dd className="text-slate-700">{expert.totalScans}</dd>
        </div>
        {hasSusut && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
            <dt className="flex items-center gap-1 text-slate-500">
              <Target className="h-3 w-3" />
              Susut
            </dt>
            <dd className="flex items-center gap-1">
              <span
                className={`text-xs font-semibold ${isOverSusut ? "text-rose-600" : "text-emerald-600"}`}
              >
                {expert.rataSusut!.toFixed(2)}%
              </span>
              <span className="text-[11px] text-slate-400">
                / {expert.targetSusut!.toFixed(1)}%
              </span>
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export function BnRow({
  stage,
  onOrderClick,
}: {
  stage: StageBottleneck;
  onOrderClick: (orderId: string, orderNumber: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isProd = stage.stage_group === "production";
  const isSlow = stage.avg_hours && stage.avg_hours > 8;
  const isCritical = stage.avg_hours && stage.avg_hours > 24;
  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isCritical ? "bg-rose-50/40" : isSlow ? "bg-amber-50/30" : ""}`}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            <span
              className={`h-2 w-2 rounded-full ${isProd ? "bg-amber-400" : "bg-blue-400"}`}
            />
            <span className="text-sm font-medium text-slate-800">
              {stage.stage_label}
            </span>
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {stage.order_count}
            {stage.waiting_orders > 0 && (
              <span className="text-rose-500">
                ({stage.waiting_orders} tunggu)
              </span>
            )}
          </span>
        </td>
        <td className="px-3 py-3 text-center">
          {stage.avg_hours ? (
            <span
              className={`text-xs font-semibold ${isCritical ? "text-rose-600" : isSlow ? "text-amber-600" : "text-slate-600"}`}
            >
              {fmtHours(stage.avg_hours)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-center">
          {stage.longest_hours ? (
            <span
              className={`text-xs font-semibold ${stage.longest_hours > 48 ? "text-rose-600" : stage.longest_hours > 24 ? "text-amber-600" : "text-slate-600"}`}
            >
              {fmtHours(stage.longest_hours)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="space-y-0.5">
            {stage.bottlenecks.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              stage.bottlenecks.slice(0, 2).map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOrderClick(item.order_id, item.order_number);
                  }}
                  className="flex items-center gap-1.5 text-xs hover:text-amber-600 transition-colors w-full text-left"
                >
                  <span className="font-mono text-slate-500 truncate">
                    {item.order_number}
                  </span>
                  <span
                    className={`ml-auto shrink-0 font-medium ${(item.hours_waiting || 0) > 48 ? "text-rose-600" : (item.hours_waiting || 0) > 24 ? "text-amber-600" : "text-slate-400"}`}
                  >
                    {item.hours_waiting ? `${item.hours_waiting}j` : "—"}
                  </span>
                </button>
              ))
            )}
          </div>
        </td>
        <td className="px-5 py-3 text-center">
          {isCritical ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
              <AlertTriangle className="h-3 w-3" />
              Kritis
            </span>
          ) : isSlow ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              <Clock className="h-3 w-3" />
              Lambat
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Normal
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={6} className="px-5 py-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">Order</th>
                    <th className="px-3 py-2 text-left font-medium">Customer</th>
                    <th className="px-3 py-2 text-center font-medium">Waktu</th>
                    <th className="px-3 py-2 text-left font-medium">Pekerja</th>
                    <th className="px-3 py-2 text-center font-medium">Deadline</th>
                    <th className="px-3 py-2 text-center font-medium">Approval</th>
                    <th className="px-3 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stage.orders.map((item) => (
                    <tr
                      key={item.order_id}
                      onClick={() => onOrderClick(item.order_id, item.order_number)}
                      className="border-b border-slate-100 hover:bg-white cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                        {item.order_number}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 font-medium">
                        {item.customer_name || "—"}
                      </td>
                      <td className={`px-3 py-2.5 text-center font-medium ${(item.hours_waiting || 0) > 48 ? "text-rose-600" : (item.hours_waiting || 0) > 24 ? "text-amber-600" : "text-slate-500"}`}>
                        {item.hours_waiting ? `${item.hours_waiting}j` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {item.last_worker || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.deadline ? (() => {
                          const dl = getStageDeadlineStatus(item.tgl_order, item.deadline, item.current_stage);
                          if (!dl) return <span className="text-slate-400">—</span>;
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${dl.isOverdue ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
                              {dl.isOverdue ? `⚠ ${Math.abs(dl.daysRemaining)}h` : `✔ H-${Math.max(dl.daysRemaining, 1)}`}
                            </span>
                          );
                        })() : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.approval_decision === "approved" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {item.approved_by || "Disetujui"}
                          </span>
                        ) : item.approval_decision === "rejected" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Ditolak
                          </span>
                        ) : item.status === "waiting_approval" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                            <Clock className="h-2.5 w-2.5" />
                            Menunggu
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.status === "rework" ? "bg-orange-100 text-orange-700" : item.status === "waiting_approval" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.status === "rework" ? "Rework" : item.status === "waiting_approval" ? "Approval" : "Proses"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>);
}

export function MicroStatusBadge({
  status,
}: {
  status: "waiting" | "in_progress" | "completed";
}) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Selesai
      </span>
    );
  if (status === "in_progress")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
        <Loader2 className="h-3 w-3 animate-spin" />
        Proses
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      <Clock className="h-3 w-3" />
      Antri
    </span>
  );
}

export function KanbanCol({
  icon,
  title,
  count,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent: "sky" | "amber" | "emerald";
  children: React.ReactNode;
}) {
  const accentMap = {
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  const items = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];
  return (
    <div className="rounded-lg bg-slate-50/60 p-3.5">
      <header className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          {title}
        </h3>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${accentMap[accent]}`}
        >
          {count}
        </span>
      </header>
      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {count === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white py-6 text-center">
            <p className="text-xs text-slate-400">Tidak ada order menunggu</p>
          </div>
        ) : (
          items
        )}
      </div>
    </div>
  );
}

export function Badge({
  tone,
  icon,
  children,
}: {
  tone: "rose" | "emerald" | "slate";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const map = {
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${map[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-rose-100 p-3">
          <AlertTriangle className="h-6 w-6 text-rose-600" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-rose-900">
          Gagal memuat data
        </h3>
        <p className="mb-5 text-sm text-rose-700">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
