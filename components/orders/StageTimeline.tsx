"use client";

import { useMemo } from "react";
import {
  STAGE_SEQUENCE,
  STAGE_LABELS,
  STAGE_COLORS,
  getStageIndex,
} from "@/lib/stages";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  ScanLine,
  Clock,
  User,
  FileText,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface TransitionEvent {
  type: "transition";
  from_stage: string | null;
  to_stage: string;
  reason: string | null;
  timestamp: string;
  user: string | null;
}

interface SubmissionEvent {
  type: "submission";
  stage: string;
  attempt_number: number;
  notes: string | null;
  timestamp: string;
  user: string | null;
  data?: Record<string, unknown>;
}

interface ScanEvent {
  type: "scan";
  stage: string;
  action: string;
  timestamp: string;
  user: string | null;
}

interface ApprovalEvent {
  type: "approval";
  stage: string;
  decision: string;
  remarks: string | null;
  timestamp: string;
  user: string | null;
}

type TimelineItem =
  | TransitionEvent
  | SubmissionEvent
  | ScanEvent
  | ApprovalEvent;

export interface StageTimelineProps {
  transitions: Array<{
    from_stage: string | null;
    to_stage: string;
    reason: string | null;
    transitioned_at: string;
    users?: { full_name: string } | null;
  }>;
  stageResults: Array<{
    id: string;
    stage: string;
    attempt_number: number;
    notes: string | null;
    finished_at: string;
    data?: Record<string, unknown>;
    users?: { full_name: string } | null;
  }>;
  scanEvents?: Array<{
    id: string;
    stage: string;
    action: string;
    scanned_at: string;
    users?: { full_name: string } | null;
  }>;
  approvals: Array<{
    id: string;
    stage: string;
    decision: string;
    remarks: string | null;
    decided_at: string;
    users?: { full_name: string } | null;
  }>;
  currentStage: string;
}

// ── Helpers ────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  open: "Membuka",
  submit: "Submit",
  edit: "Edit",
  read: "Baca",
  delete: "Hapus",
  reject: "Tolak",
};

const SCAN_ACTION_COLORS: Record<string, string> = {
  open: "text-blue-500 bg-blue-50",
  submit: "text-emerald-500 bg-emerald-50",
  edit: "text-amber-500 bg-amber-50",
  read: "text-slate-500 bg-slate-50",
  reject: "text-rose-500 bg-rose-50",
};

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserName(item: {
  users?: { full_name: string } | null;
  user?: string | null;
}): string {
  if (item.users?.full_name) return item.users.full_name;
  if (item.user) return item.user;
  return "—";
}

const MOTIF_LABELS: Record<string, string> = {
  "kawung_nj001": "Kawung NJ001",
  "kawung_nj002": "Kawung NJ002",
  "mega_mendung_nj003": "Mega Mendung NJ003",
  "kawung_nj004": "Kawung NJ004",
  "kawung_nj005": "Kawung NJ005",
  "sidomukti_nj007": "Sidomukti NJ007",
  "truntum_nj008": "Truntum NJ008",
  "dayak_perisai_nk001": "Dayak Perisai NK001",
  "tengkawak_ampiek_nk002": "Tengkawak Ampiek NK002",
  "dayak_perisai_nk003": "Dayak Perisai NK003",
  "tidayu_nk004": "Tidayu NK004",
  "jagatan_pisang_nb001": "Jagatan Pisang NB001",
  "sabuk_prada_nb002": "Sabuk Prada NB002",
  "batik_bunga_bali_nb003": "Batik Bunga Bali NB003",
  "kamoro_np001": "Kamoro NP001",
  "batik_asmat_np002": "Batik Asmat NP002",
  "motif_cendrawasih_np003": "Motif Cendrawasih NP003",
  "motif_sentani_np004": "Motif Sentani NP004",
  "biak_np005": "Biak NP005",
  "bunga_melur_ns001": "Bunga Melur NS001",
  "pucuak_labuar_ns002": "Pucuak Labuar NS002",
  "naga_besaung_ns003": "Naga Besaung NS003",
  "ulos_ragi_hotang_ns004": "Ulos Ragi Hotang NS004",
  "tapis_lampung_ns005": "Tapis Lampung NS005",
};

function getTukangInfo(stage: string, data?: Record<string, unknown>): string | null {
  if (!data) return null;
  if (stage === "laser") {
    const batik = data.tukang_batik;
    const nama = data.tukang_nama;
    const motifs = data.model_nusantara;
    const parts: string[] = [];
    if (batik) parts.push(`Laser Batik: ${batik}`);
    if (nama) parts.push(`Laser Nama: ${nama}`);
    if (Array.isArray(motifs) && motifs.length > 0) {
      const labels = motifs.map((code: string) => {
        const key = String(code).toLowerCase();
        return MOTIF_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      });
      parts.push(`Motif: ${labels.join(", ")}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  const tukangStages = ["pembentukan_cincin", "pemasangan_permata", "finishing"];
  if (tukangStages.includes(stage)) {
    const tukang = data.tukang;
    if (tukang) return `Tukang: ${tukang}`;
  }
  return null;
}

function getKonfirmasiInfo(stage: string, data?: Record<string, unknown>): string | null {
  if (stage !== "konfirmasi" || !data) return null;
  const parts: string[] = [];
  if (data.tanggal_packing) {
    parts.push(`Tgl Packing: ${new Date(data.tanggal_packing as string).toLocaleDateString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
    })}`);
  }
  if (data.nomor_resi) {
    parts.push(`No Resi: ${data.nomor_resi}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function getKonfirmasiPhotos(stage: string, data?: Record<string, unknown>): React.ReactNode | null {
  if (stage !== "konfirmasi" || !data) return null;
  const pria = data.foto_cincin_pria as string | null;
  const wanita = data.foto_cincin_wanita as string | null;
  if (!pria && !wanita) return null;
  return (
    <div className="flex gap-2 mt-1">
      {pria && (
        <a
          href={pria}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700 hover:bg-violet-100 transition-colors"
        >
          Foto Pria ↗
        </a>
      )}
      {wanita && (
        <a
          href={wanita}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2 py-1 text-[10px] font-medium text-pink-700 hover:bg-pink-100 transition-colors"
        >
          Foto Wanita ↗
        </a>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function StageProgressBar({ currentStage }: { currentStage: string }) {
  const currentIdx = getStageIndex(currentStage);
  const mid = Math.ceil(STAGE_SEQUENCE.length / 2);
  const firstHalf = STAGE_SEQUENCE.slice(0, mid);
  const secondHalf = STAGE_SEQUENCE.slice(mid);

  const renderStage = (stage: string, i: number, globalI: number) => {
    const isCompleted = globalI < currentIdx;
    const isActive = globalI === currentIdx;
    const colors = STAGE_COLORS[stage];
    return (
      <div key={stage} className="flex-1 flex flex-col items-center min-w-0">
        <div className="relative w-full flex items-center">
          {globalI > 0 && (
            <div
              className={`h-0.5 flex-1 ${isCompleted || isActive ? "bg-amber-500" : "bg-stone-200"}`}
            />
          )}
          <div
            className={`h-2.5 w-2.5 rounded-full shrink-0 ring-2 ${
              isActive
                ? "bg-amber-500 ring-amber-200 scale-125"
                : isCompleted
                  ? `${colors?.dot ?? "bg-amber-500"} ring-white`
                  : "bg-stone-200 ring-white"
            } transition-all`}
          />
        </div>
        <span
          className={`text-[7px] leading-tight mt-1 text-center truncate w-full px-0.5 ${
            isActive
              ? "font-semibold text-amber-700"
              : isCompleted
                ? "text-stone-500"
                : "text-stone-300"
          }`}
        >
          {STAGE_LABELS[stage]?.split(" ")[0] ?? stage}
        </span>
      </div>
    );
  };

  return (
    <div className="mb-1">
      {/* First row */}
      <div className="flex items-center gap-0.5">
        {firstHalf.map((stage, i) => renderStage(stage, i, i))}
      </div>

      {/* Vertical connector between rows */}
      <div className="flex justify-center my-0.5">
        <div className="w-px h-1.5 bg-stone-300" />
      </div>

      {/* Second row */}
      <div className="flex items-center gap-0.5">
        {secondHalf.map((stage, i) => renderStage(stage, mid + i, mid + i))}
      </div>
    </div>
  );
}

function TimelineDot({ item }: { item: TimelineItem }) {
  switch (item.type) {
    case "transition": {
      const colors = STAGE_COLORS[item.to_stage];
      return (
        <div
          className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white ${colors?.bg ?? "bg-stone-100"}`}
        >
          <ArrowRight
            className={`h-3 w-3 ${colors?.text ?? "text-stone-600"}`}
          />
        </div>
      );
    }
    case "submission":
      return (
        <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 ring-2 ring-white">
          <FileText className="h-3 w-3 text-amber-600" />
        </div>
      );
    case "scan": {
      const colorClass =
        SCAN_ACTION_COLORS[item.action] ?? "text-slate-500 bg-slate-50";
      return (
        <div
          className={`h-6 w-6 rounded-lg ${colorClass} flex items-center justify-center shrink-0 ring-2 ring-white`}
        >
          <ScanLine className="h-3 w-3" />
        </div>
      );
    }
    case "approval":
      return (
        <div
          className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white ${
            item.decision === "approved" ? "bg-emerald-100" : "bg-rose-100"
          }`}
        >
          {item.decision === "approved" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
          )}
        </div>
      );
  }
}

function TimelineContent({ item }: { item: TimelineItem }) {
  switch (item.type) {
    case "transition": {
      const label = STAGE_LABELS[item.to_stage] ?? item.to_stage;
      return (
        <>
          <p className="text-xs font-medium text-stone-800">
            {item.from_stage
              ? `${STAGE_LABELS[item.from_stage] ?? item.from_stage} → ${label}`
              : `Dimulai: ${label}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <User className="h-3 w-3" />
              {getUserName(item)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Clock className="h-3 w-3" />
              {formatDateTime(item.timestamp)}
            </span>
          </div>
          {item.reason && (
            <p className="text-[11px] text-stone-500 mt-1 italic">
              &ldquo;{item.reason}&rdquo;
            </p>
          )}
        </>
      );
    }
    case "submission": {
      const label = STAGE_LABELS[item.stage] ?? item.stage;
      const tukangInfo = getTukangInfo(item.stage, item.data);
      const konfirmasiInfo = getKonfirmasiInfo(item.stage, item.data);
      return (
        <>
          <p className="text-xs font-medium text-stone-800">
            Submit: {label}
            {item.attempt_number > 1 && (
              <span className="ml-1.5 text-[10px] bg-rose-100 text-rose-700 rounded px-1.5 py-0.5">
                Percobaan {item.attempt_number}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <User className="h-3 w-3" />
              {getUserName(item)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Clock className="h-3 w-3" />
              {formatDateTime(item.timestamp)}
            </span>
          </div>
          {tukangInfo && (
            <p className="text-[11px] text-amber-700 mt-1 font-medium">
              {tukangInfo}
            </p>
          )}
          {konfirmasiInfo && (
            <p className="text-[11px] text-blue-700 mt-1 font-medium">
              {konfirmasiInfo}
            </p>
          )}
          {getKonfirmasiPhotos(item.stage, item.data)}
          {item.notes && (
            <p className="text-[11px] text-stone-600 mt-1">
              <span className="font-semibold">Catatan:</span> {item.notes}
            </p>
          )}
        </>
      );
    }
    case "scan": {
      const label = STAGE_LABELS[item.stage] ?? item.stage;
      const actionLabel = ACTION_LABELS[item.action] ?? item.action;
      return (
        <>
          <p className="text-xs font-medium text-stone-800">
            <span className="text-stone-400">Scan:</span> {label}
            <span className="ml-1.5 text-[10px] text-stone-400">
              ({actionLabel})
            </span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <User className="h-3 w-3" />
              {getUserName(item)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Clock className="h-3 w-3" />
              {formatDateTime(item.timestamp)}
            </span>
          </div>
        </>
      );
    }
    case "approval": {
      const label = STAGE_LABELS[item.stage] ?? item.stage;
      return (
        <>
          <p className="text-xs font-medium text-stone-800">
            {item.decision === "approved" ? "✅ Disetujui" : "❌ Ditolak"}:{" "}
            {label}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <User className="h-3 w-3" />
              {getUserName(item)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Clock className="h-3 w-3" />
              {formatDateTime(item.timestamp)}
            </span>
          </div>
          {item.remarks && (
            <p className="text-[11px] text-stone-500 mt-1 italic">
              &ldquo;{item.remarks}&rdquo;
            </p>
          )}
        </>
      );
    }
  }
}

// ── Main Component ─────────────────────────────────────────────────

export default function StageTimeline({
  transitions,
  stageResults,
  scanEvents,
  approvals,
  currentStage,
}: StageTimelineProps) {
  const items = useMemo<TimelineItem[]>(() => {
    const result: TimelineItem[] = [];

    for (const t of transitions) {
      result.push({
        type: "transition",
        from_stage: t.from_stage,
        to_stage: t.to_stage,
        reason: t.reason,
        timestamp: t.transitioned_at,
        user: t.users?.full_name ?? null,
      });
    }

    for (const sr of stageResults) {
      const notes = sr.notes ?? (sr.data?.notes as string | null);
      result.push({
        type: "submission",
        stage: sr.stage,
        attempt_number: sr.attempt_number,
        notes,
        timestamp: sr.finished_at,
        user: sr.users?.full_name ?? null,
        data: sr.data,
      });
    }

    for (const se of scanEvents ?? []) {
      result.push({
        type: "scan",
        stage: se.stage,
        action: se.action,
        timestamp: se.scanned_at,
        user: se.users?.full_name ?? null,
      });
    }

    for (const a of approvals) {
      // skip duplicate from transition's approval_* to_stage
      const isDupTransition = transitions.some((t) => t.to_stage === a.stage);
      if (isDupTransition) continue;

      result.push({
        type: "approval",
        stage: a.stage,
        decision: a.decision,
        remarks: a.remarks,
        timestamp: a.decided_at,
        user: a.users?.full_name ?? null,
      });
    }

    result.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return result;
  }, [transitions, stageResults, scanEvents, approvals]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-8">
        Belum ada riwayat tahap
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <StageProgressBar currentStage={currentStage} />

      {/* Timeline */}
      <div className="relative overflow-hidden">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-stone-200" />
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 relative">
              <div className="relative">
                <TimelineDot item={item} />
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="rounded-lg border border-stone-100 bg-white p-2.5 shadow-sm">
                  <TimelineContent item={item} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
