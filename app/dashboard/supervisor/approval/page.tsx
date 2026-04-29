// app/dashboard/supervisor/approval/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/MobileSidebar";
import Header from "@/components/layout/MobileHeader";
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

// ── Stage Verification Guidelines + Real Data Display ────────────────────────

function StageInfoPopup({
  stage,
  orderData,
  stageData,
  onClose,
}: {
  stage: string;
  orderData: {
    order_number: string;
    product_name: string;
    customer_name: string;
  };
  stageData: Record<string, unknown> | null;
  onClose: () => void;
}) {
  // Define what to check per stage based on what the worker actually submitted
  const getStageGuidelines = (): {
    label: string;
    detail: string;
    dataKey?: string;
    dataValue?: unknown;
  }[] => {
    const d = stageData ?? {};

    switch (stage) {
      case "approval_penerimaan_order":
        // For penerimaan_order, data comes from the orders table, not stage_results
        return [
          {
            label: "Nama Produk",
            detail: "Pastikan nama produk sudah jelas dan spesifik.",
            dataKey: "product_name",
            dataValue: orderData.product_name,
          },
          {
            label: "Nama Pelanggan",
            detail:
              "Pastikan data pelanggan sudah lengkap (nama, telepon, alamat).",
            dataKey: "customer_name",
            dataValue: orderData.customer_name,
          },
          {
            label: "Target Berat",
            detail:
              "Target berat dalam gram harus realistis untuk jenis produk.",
            dataKey: "target_weight",
            dataValue: d.target_weight,
          },
          {
            label: "Target Karat",
            detail: "Target karat (0-24K) sesuai permintaan customer.",
            dataKey: "target_karat",
            dataValue: d.target_karat,
          },
          {
            label: "Ukuran Cincin",
            detail: "Ukuran cincin sudah dicatat dengan benar (jika ada).",
            dataKey: "ring_size",
            dataValue: d.ring_size,
          },
          {
            label: "Deskripsi Model",
            detail: "Deskripsi cukup detail untuk tim produksi memahami.",
            dataKey: "model_description",
            dataValue: d.model_description,
          },
          {
            label: "Teks Ukiran",
            detail: "Pastikan tidak ada typo pada teks ukiran (jika ada).",
            dataKey: "engraved_text",
            dataValue: d.engraved_text,
          },
          {
            label: "Metode Pengambilan",
            detail: "Metode delivery sudah ditentukan dengan benar.",
            dataKey: "delivery_method",
            dataValue: d.delivery_method,
          },
          {
            label: "Total Harga & DP",
            detail: "Total harga dan DP masuk akal. DP harus sudah dibayar.",
            dataKey: "total_price",
            dataValue: d.total_price
              ? `Rp ${Number(d.total_price).toLocaleString("id-ID")}`
              : null,
          },
          {
            label: "Batu Permata",
            detail:
              "Jika ada batu, spesifikasi harus lengkap (jenis, berat, clarity, dll).",
            dataKey: "gemstone_list",
            dataValue: Array.isArray(d.gemstone_list)
              ? `${(d.gemstone_list as any[]).length} batu`
              : null,
          },
        ];

      case "approval_qc_1":
        return [
          {
            label: "Inspeksi Fisik Berlian/Batu",
            detail: "Semua batu harus lolos inspeksi fisik.",
            dataKey: "physical_diamond_inspection",
            dataValue: getChecklistValue(d, "physical_diamond_inspection"),
          },
          {
            label: "Kesesuaian Sertifikat",
            detail: "Sertifikat harus sesuai dengan batu yang dipasang.",
            dataKey: "certificate_match",
            dataValue: getChecklistValue(d, "certificate_match"),
          },
          {
            label: "Kesesuaian Desain",
            detail: "Desain akhir harus sesuai dengan order awal.",
            dataKey: "design_match",
            dataValue: getChecklistValue(d, "design_match"),
          },
          {
            label: "Berat Minimum",
            detail: "Berat harus ≥ 0.2g dari target.",
            dataKey: "minimum_weight_requirement",
            dataValue: getChecklistValue(d, "minimum_weight_requirement"),
          },
          {
            label: "Selisih Berat OK",
            detail: "Weight variance dalam batas toleransi.",
            dataKey: "weight_variance_met",
            dataValue: d.weight_variance_met,
          },
          {
            label: "Foto QC 1",
            detail: "4 foto wajib: depan, samping, atas, dengan penggaris.",
            dataKey: "attachments",
            dataValue: Array.isArray(d.attachments)
              ? `${(d.attachments as any[]).length} foto`
              : null,
          },
          {
            label: "Sertifikat Batu",
            detail: "Semua sertifikat batu sudah dicatat.",
            dataKey: "certificate_logs",
            dataValue: Array.isArray(d.certificate_logs)
              ? `${(d.certificate_logs as any[]).length} sertifikat`
              : null,
          },
        ];

      case "approval_qc_2":
        return [
          {
            label: "Kualitas Laser/Ukiran",
            detail: "Hasil laser harus bersih dan terbaca.",
            dataKey: "laser_quality",
            dataValue: getChecklistValue(d, "laser_quality"),
          },
          {
            label: "Kualitas Finishing",
            detail: "Rhodium rata, tidak ada bercak.",
            dataKey: "finishing_quality",
            dataValue: getChecklistValue(d, "finishing_quality"),
          },
          {
            label: "Verifikasi Teks Ukiran",
            detail: "Teks ukiran sesuai order (cek ejaan!).",
            dataKey: "engraving_verified",
            dataValue: getChecklistValue(d, "engraving_verified"),
          },
          {
            label: "Nomor Identitas Cincin",
            detail: "Ring identity number terverifikasi.",
            dataKey: "identity_number_verified",
            dataValue: getChecklistValue(d, "identity_number_verified"),
          },
          {
            label: "Kesesuaian Bentuk",
            detail: "Bentuk akhir sesuai order.",
            dataKey: "shape_match",
            dataValue: getChecklistValue(d, "shape_match"),
          },
          {
            label: "Label Berat Final",
            detail: "Label berat final sudah terpasang.",
            dataKey: "final_weight_label",
            dataValue: getChecklistValue(d, "final_weight_label"),
          },
          {
            label: "Penyesuaian Berat Batu",
            detail: "Berat batu disesuaikan jika > 200mg.",
            dataKey: "stone_weight_adjusted",
            dataValue: getChecklistValue(d, "stone_weight_adjusted"),
          },
          {
            label: "Nilai Penyesuaian Berat",
            detail: "Nilai adjustment jika ada.",
            dataKey: "weight_adjustment",
            dataValue: d.weight_adjustment ? `${d.weight_adjustment}g` : null,
          },
          {
            label: "Label Berat Final Dicetak",
            detail: "Konfirmasi label sudah dicetak.",
            dataKey: "final_weight_label_printed",
            dataValue: d.final_weight_label_printed,
          },
          {
            label: "Foto QC 2",
            detail: "Foto final dan custom (jika ada).",
            dataKey: "attachments",
            dataValue: Array.isArray(d.attachments)
              ? `${(d.attachments as any[]).length} foto`
              : null,
          },
        ];

      case "approval_qc_3":
        return [
          {
            label: "Kualitas Produk Final",
            detail: "Produk akhir harus sempurna.",
            dataKey: "final_product_quality",
            dataValue: getChecklistValue(d, "final_product_quality"),
          },
          {
            label: "Kelengkapan Dokumen",
            detail: "Semua dokumen harus lengkap.",
            dataKey: "kelengkapan_complete",
            dataValue: getChecklistValue(d, "kelengkapan_complete"),
          },
          {
            label: "Foto Produk Jadi",
            detail: "Foto final harus jelas.",
            dataKey: "attachments",
            dataValue: Array.isArray(d.attachments)
              ? `${(d.attachments as any[]).length} foto`
              : null,
          },
        ];

      case "approval_pelunasan":
        return [
          {
            label: "Total Harga Final",
            detail: "Pastikan total harga sudah benar.",
            dataKey: "update_total_price",
            dataValue: d.update_total_price
              ? `Rp ${Number(d.update_total_price).toLocaleString("id-ID")}`
              : null,
          },
          {
            label: "DP Sebelumnya",
            detail: "DP yang sudah dibayar sebelumnya.",
            dataKey: "update_dp_amount",
            dataValue: d.update_dp_amount
              ? `Rp ${Number(d.update_dp_amount).toLocaleString("id-ID")}`
              : null,
          },
          {
            label: "Pembayaran",
            detail: "Bukti pembayaran harus jelas dan valid.",
            dataKey: "payments",
            dataValue: Array.isArray(d.payments)
              ? `${(d.payments as any[]).length} pembayaran`
              : null,
          },
          {
            label: "Bukti Pembayaran",
            detail: "File bukti pembayaran sudah diupload.",
            dataKey: "attachments",
            dataValue: Array.isArray(d.attachments)
              ? `${(d.attachments as any[]).length} file`
              : null,
          },
        ];

      default:
        return [];
    }
  };

  const guidelines = getStageGuidelines();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <XCircle className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4 pr-8">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            #{orderData.order_number}
          </p>
          <h3 className="text-sm font-semibold text-slate-800 mt-0.5">
            {orderData.product_name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {orderData.customer_name}
          </p>
        </div>

        {/* Guidelines with real data */}
        <ul className="space-y-3">
          {guidelines.map((item, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 mt-0.5">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-700">
                  {item.label}
                </p>
                <p className="text-[12px] text-slate-500">{item.detail}</p>
                {item.dataValue !== undefined && item.dataValue !== null && (
                  <div className="mt-1 rounded bg-slate-50 border border-slate-100 px-2 py-1">
                    <span className="text-[10px] text-slate-400 uppercase">
                      Data disubmit:{" "}
                    </span>
                    <span className="text-[12px] font-medium text-slate-700">
                      {typeof item.dataValue === "boolean"
                        ? item.dataValue
                          ? "Lolos"
                          : "Gagal"
                        : String(item.dataValue)}
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Dismiss button */}
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-900 transition-colors"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}

// Helper: extract checklist value from quality_checklist array
function getChecklistValue(
  data: Record<string, unknown>,
  key: string,
): boolean | null {
  const checklist = data.quality_checklist as
    | Array<{ check_key: string; passed: boolean }>
    | undefined;
  if (!checklist) return null;
  const item = checklist.find((c) => c.check_key === key);
  return item?.passed ?? null;
}

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
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    // Summarise array of objects (e.g. material_transactions)
    if (typeof value[0] === "object" && value[0] !== null) {
      return value
        .map((item: any) => {
          const parts: string[] = [];
          if (item.transaction_type) parts.push(item.transaction_type);
          if (item.material_type) parts.push(item.material_type);
          if (item.weight_grams) parts.push(`${item.weight_grams}g`);
          if (item.karat) parts.push(`${item.karat}K`);
          return parts.length ? parts.join(" ") : JSON.stringify(item);
        })
        .join(" | ");
    }
    return value.join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(
        ([k, v]) =>
          `${humanizeKey(k)}: ${typeof v === "boolean" ? (v ? "Ya" : "Tidak") : String(v)}`,
      );
    return entries.length ? entries.join(", ") : "—";
  }
  return String(value);
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3"
          >
            <dt className="text-[11px] text-slate-400 shrink-0">
              {humanizeKey(key)}
            </dt>
            <dd className="text-[12px] font-medium text-slate-700 sm:text-right break-words">
              {formatDataValue(val)}
            </dd>
          </div>
        ))}
      </dl>
      {hasMore && (
        <button
          onClick={onToggle}
          className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors min-h-[28px]"
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
  onApprove: (
    stageResultId: string | null,
    orderId: string,
    stage: string,
  ) => Promise<void>;
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
  const [showInfo, setShowInfo] = useState(false);

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
    if (!rejectNotes.trim()) return;
    setState({ type: "loading" });
    try {
      await onReject(
        item.stage_result_id,
        item.order_id,
        item.stage,
        rejectNotes,
      );
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
        className={`rounded-lg border p-3 sm:p-4 transition-all ${
          state.result === "approved"
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-slate-200 bg-slate-50/60"
        }`}
      >
        <div className="flex items-center gap-2">
          {state.result === "approved" ? (
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-700 truncate">
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

      <div className="p-3 sm:p-5">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-slate-800">
                {item.order_number}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium ${
                  isProduction
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }`}
              >
                {item.stage_label}
              </span>
              <button
                onClick={() => setShowInfo(true)}
                className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                title="Lihat data verifikasi"
              >
                <AlertTriangle className="h-3 w-3" />
                Verifikasi
              </button>
              {(item.attempt_number ?? 0) > 1 && (
                <span className="rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-rose-700">
                  Percobaan ke-{item.attempt_number}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.product_name}</p>
          </div>
          <div className="sm:text-right shrink-0 flex sm:block items-center gap-2">
            <p className="text-xs font-medium text-slate-700">
              {item.worker_name}
            </p>
            <p className="text-[11px] text-slate-400 sm:mt-0.5">
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
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleApprove}
              className="flex-1 rounded-lg bg-emerald-600 py-3 sm:py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-700 active:scale-[0.98] min-h-[44px]"
            >
              Setujui
            </button>
            <button
              onClick={() => setState({ type: "confirming_reject" })}
              className="flex-1 rounded-lg border border-rose-200 bg-white py-3 sm:py-2.5 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50 active:scale-[0.98] min-h-[44px]"
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
              rows={3}
              autoFocus
              className="w-full rounded-lg border border-rose-200 bg-rose-50/40 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectNotes.trim()}
                className="flex-1 rounded-lg bg-rose-600 py-3 sm:py-2.5 text-sm font-medium text-white transition-all hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                Konfirmasi Tolak
              </button>
              <button
                onClick={() => {
                  setState({ type: "idle" });
                  setRejectNotes("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 sm:py-2 text-sm text-slate-600 hover:bg-slate-50 min-h-[44px]"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {state.type === "loading" && (
          <div className="flex items-center justify-center py-3">
            <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Memproses...</span>
          </div>
        )}

        {showInfo && (
          <StageInfoPopup
            stage={item.stage}
            orderData={{
              order_number: item.order_number,
              product_name: item.product_name,
              customer_name: item.customer_name,
            }}
            stageData={item.data}
            onClose={() => setShowInfo(false)}
          />
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verify supervisor identity
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (!res.ok) {
        router.push("/workshop/login");
        return;
      }
      const json = await res.json();
      const u = json.data;
      if (u.role.name !== "superadmin" && u.role.role_group !== "management") {
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
          remarks: notes,
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

  const productionCount = items.filter(
    (i) => i.stage_group === "production",
  ).length;
  const operationalCount = items.filter(
    (i) => i.stage_group === "operational",
  ).length;

  const tabs: {
    key: FilterTab;
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    { key: "all", label: "Semua", icon: Clock, count: items.length },
    {
      key: "production",
      label: "Produksi",
      icon: Hammer,
      count: productionCount,
    },
    {
      key: "operational",
      label: "Operasional",
      icon: Settings,
      count: operationalCount,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        role="supervisor"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          role="supervisor"
          logoutPath="/workshop/login"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {/* Page header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Persetujuan Tahap
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Review dan setujui hasil kerja tim
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {lastUpdated && (
                <span className="text-[10px] sm:text-xs text-slate-400">
                  {lastUpdated.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <button
                onClick={() => fetchPending(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 min-h-[36px] sm:min-h-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <ApprovalSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <button
                onClick={() => fetchPending(true)}
                className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {/* Filter tabs - Horizontal scroll di mobile */}
              <div className="border-b border-slate-200 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <div className="flex items-center gap-1 min-w-max">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                          filter === tab.key
                            ? "border-slate-800 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{tab.label}</span>
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
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                  <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Semua submission sudah diproses
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Tidak ada yang menunggu persetujuan di kategori ini
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((item) => (
                    <PendingCard
                      key={`${item.order_id}_${item.stage}`}
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
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-48 sm:h-56 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}
