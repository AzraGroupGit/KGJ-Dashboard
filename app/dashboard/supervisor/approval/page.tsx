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

interface WorkOrder {
  cs_order_id: string;
  cs_order_number: string;
  customer_name: string;
  customer_wa: string | null;
  customer_email: string | null;
  ukuran_pria: string | null;
  ukiran_pria: string | null;
  jenis_cincin_pria: string | null;
  keterangan_pria: string[] | string | null;
  ukuran_wanita: string | null;
  ukiran_wanita: string | null;
  jenis_cincin_wanita: string | null;
  keterangan_wanita: string[] | string | null;
  font: string | null;
  laser_position: string | null;
  acara: string | null;
  alat_ukur: string | null;
  harga: number | null;
  dp_amount: number | null;
  deadline: string | null;
  pengiriman: string | null;
  alamat_pengiriman: string | null;
  reference_image_pria_url: string | null;
  reference_image_wanita_url: string | null;
}

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
  work_order: WorkOrder | null;
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
        // Data comes from cs_orders (via promoted_to_order_id), not stage_results
        return [
          {
            label: "Nama Customer",
            detail: "Nama customer harus jelas dan sesuai identitas.",
            dataKey: "customer_name",
            dataValue: d.customer_name as string | null ?? orderData.customer_name,
          },
          {
            label: "No WhatsApp",
            detail: "Nomor WA harus valid untuk koordinasi dan konfirmasi.",
            dataKey: "customer_wa",
            dataValue: d.customer_wa as string | null ?? null,
          },
          {
            label: "Ukuran Cincin Pria",
            detail: "Ukuran cincin pria sudah dicatat dengan benar.",
            dataKey: "ukuran_pria",
            dataValue: d.ukuran_pria as string | null ?? null,
          },
          {
            label: "Jenis Cincin Pria",
            detail: "Jenis cincin pria (model/tipe) sudah ditentukan.",
            dataKey: "jenis_cincin_pria",
            dataValue: d.jenis_cincin_pria as string | null ?? null,
          },
          {
            label: "Ukiran Pria",
            detail: "Pastikan tidak ada typo pada teks ukiran pria.",
            dataKey: "ukiran_pria",
            dataValue: d.ukiran_pria as string | null ?? null,
          },
          {
            label: "Ukuran Cincin Wanita",
            detail: "Ukuran cincin wanita sudah dicatat dengan benar.",
            dataKey: "ukuran_wanita",
            dataValue: d.ukuran_wanita as string | null ?? null,
          },
          {
            label: "Jenis Cincin Wanita",
            detail: "Jenis cincin wanita (model/tipe) sudah ditentukan.",
            dataKey: "jenis_cincin_wanita",
            dataValue: d.jenis_cincin_wanita as string | null ?? null,
          },
          {
            label: "Ukiran Wanita",
            detail: "Pastikan tidak ada typo pada teks ukiran wanita.",
            dataKey: "ukiran_wanita",
            dataValue: d.ukiran_wanita as string | null ?? null,
          },
          {
            label: "Font & Posisi Laser",
            detail: "Font dan posisi laser harus sesuai permintaan customer.",
            dataKey: "font",
            dataValue: d.font
              ? `${d.font}${d.laser_position ? ` — ${d.laser_position}` : ""}`
              : null,
          },
          {
            label: "Harga & DP",
            detail: "Harga total dan DP masuk akal. DP harus sudah dibayar.",
            dataKey: "harga",
            dataValue: d.harga
              ? `Rp ${Number(d.harga).toLocaleString("id-ID")} / DP Rp ${Number(d.dp_amount ?? 0).toLocaleString("id-ID")}`
              : null,
          },
          {
            label: "Deadline",
            detail: "Deadline acara / pengiriman harus realistis.",
            dataKey: "deadline",
            dataValue: d.deadline as string | null ?? null,
          },
          {
            label: "Metode Pengiriman",
            detail: "Metode pengiriman dan alamat sudah sesuai.",
            dataKey: "pengiriman",
            dataValue: d.pengiriman as string | null ?? null,
          },
        ];

      case "approval_racik_bahan":
        return [
          {
            label: "Bahan Tersedia",
            detail: "Konfirmasi semua bahan baku yang diperlukan sudah disiapkan.",
            dataKey: "notes",
            dataValue: d.notes as string | null ?? null,
          },
          {
            label: "Jenis & Karat Bahan",
            detail: "Pastikan jenis dan karat bahan sesuai dengan spesifikasi order.",
          },
          {
            label: "Kuantitas Bahan",
            detail: "Jumlah bahan yang disiapkan cukup untuk target berat produk.",
          },
          {
            label: "Kualitas Bahan",
            detail: "Tidak ada cacat atau kontaminasi pada bahan baku.",
          },
        ];

      case "approval_qc_1":
        return [
          {
            label: "Bentuk Sesuai Order",
            detail: "Bentuk cincin harus sesuai dengan deskripsi model order.",
            dataKey: "bentuk_sesuai",
            dataValue: getChecklistValue(d, "bentuk_sesuai"),
          },
          {
            label: "Ukuran Cincin Sesuai",
            detail: "Ukuran cincin harus tepat sesuai order.",
            dataKey: "ukuran_sesuai",
            dataValue: getChecklistValue(d, "ukuran_sesuai"),
          },
          {
            label: "Berat Memenuhi Syarat",
            detail: "Berat cincin harus memenuhi syarat minimum.",
            dataKey: "berat_minimum",
            dataValue: getChecklistValue(d, "berat_minimum"),
          },
          {
            label: "Permukaan Bersih",
            detail: "Permukaan harus bersih, tidak ada cacat, penyok, atau goresan.",
            dataKey: "permukaan_bersih",
            dataValue: getChecklistValue(d, "permukaan_bersih"),
          },
          {
            label: "Sambungan Rapi",
            detail: "Sambungan / patri harus rapi, kuat, dan tidak terlihat kasar.",
            dataKey: "solder_rapi",
            dataValue: getChecklistValue(d, "solder_rapi"),
          },
          {
            label: "Catatan QC",
            detail: "Temuan QC atau catatan perbaikan dari petugas.",
            dataKey: "notes",
            dataValue: d.notes as string | null ?? null,
          },
        ];

      case "approval_produksi":
        return [
          {
            label: "Kualitas Hasil Laser",
            detail: "Ukiran laser harus bersih, terbaca, dan sesuai teks order.",
            dataKey: "notes",
            dataValue: d.notes as string | null ?? null,
          },
          {
            label: "Finishing Merata",
            detail: "Finishing permukaan merata di seluruh bagian cincin.",
          },
          {
            label: "Tidak Ada Cacat Visual",
            detail: "Tidak ada goresan, bercak, atau cacat lain setelah finishing.",
          },
          {
            label: "Produk Siap QC Akhir",
            detail: "Produk layak dan siap memasuki tahap QC akhir.",
          },
        ];

      case "approval_qc_2":
        return [
          {
            label: "Kualitas Laser/Ukiran",
            detail: "Hasil laser harus bersih dan terbaca.",
            dataKey: "kualitas_laser",
            dataValue: getChecklistValue(d, "kualitas_laser"),
          },
          {
            label: "Kualitas Finishing",
            detail: "Finishing merata, tidak ada bercak.",
            dataKey: "kualitas_finishing",
            dataValue: getChecklistValue(d, "kualitas_finishing"),
          },
          {
            label: "Teks Ukiran Benar",
            detail: "Teks ukiran sesuai order — cek ejaan dengan teliti!",
            dataKey: "teks_ukiran_benar",
            dataValue: getChecklistValue(d, "teks_ukiran_benar"),
          },
          {
            label: "Bentuk Final Sesuai",
            detail: "Bentuk cincin final sesuai spesifikasi order.",
            dataKey: "bentuk_final_sesuai",
            dataValue: getChecklistValue(d, "bentuk_final_sesuai"),
          },
          {
            label: "Produk Bersih",
            detail: "Produk bersih dan siap untuk serah terima ke customer.",
            dataKey: "produk_bersih",
            dataValue: getChecklistValue(d, "produk_bersih"),
          },
          {
            label: "Catatan QC Akhir",
            detail: "Temuan QC akhir dari petugas.",
            dataKey: "notes",
            dataValue: d.notes as string | null ?? null,
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
            #{orderData.order_number} · {orderData.customer_name}
          </p>
          <h3 className="text-sm font-semibold text-slate-800 mt-0.5">
            {orderData.product_name}
          </h3>
          {(() => {
            const failCount = guidelines.filter(
              (g) => g.dataValue === false,
            ).length;
            const passCount = guidelines.filter(
              (g) => g.dataValue === true,
            ).length;
            if (passCount === 0 && failCount === 0) return null;
            return (
              <div className="mt-2 flex items-center gap-2">
                {passCount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {passCount} lolos
                  </span>
                )}
                {failCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                    {failCount} tidak lolos
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Guidelines with real data */}
        {guidelines.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-4">
            Tidak ada panduan verifikasi tersedia untuk tahap ini.
          </p>
        ) : (
          <ul className="space-y-3">
            {guidelines.map((item, idx) => {
              const isBoolean = typeof item.dataValue === "boolean";
              const hasData = item.dataValue !== undefined && item.dataValue !== null;
              const passed = isBoolean ? (item.dataValue as boolean) : null;

              return (
                <li key={idx} className="flex gap-3">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${
                    passed === true
                      ? "bg-emerald-100 text-emerald-700"
                      : passed === false
                        ? "bg-rose-100 text-rose-600"
                        : "bg-slate-100 text-slate-500"
                  }`}>
                    {passed === true ? "✓" : passed === false ? "✗" : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-medium ${
                      passed === false ? "text-rose-700" : "text-slate-700"
                    }`}>
                      {item.label}
                    </p>
                    <p className="text-[12px] text-slate-500">{item.detail}</p>
                    {hasData && (
                      <div className={`mt-1 rounded px-2 py-1 border ${
                        passed === true
                          ? "bg-emerald-50 border-emerald-100"
                          : passed === false
                            ? "bg-rose-50 border-rose-100"
                            : "bg-slate-50 border-slate-100"
                      }`}>
                        <span className="text-[10px] text-slate-400 uppercase">Data: </span>
                        <span className={`text-[12px] font-semibold ${
                          passed === true ? "text-emerald-700" : passed === false ? "text-rose-600" : "text-slate-700"
                        }`}>
                          {isBoolean
                            ? (passed ? "Lolos ✓" : "Tidak Lolos ✗")
                            : String(item.dataValue)}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

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
    | Array<{ key?: string; check_key?: string; passed: boolean }>
    | undefined;
  if (!checklist) return null;
  const item = checklist.find((c) => (c.key ?? c.check_key) === key);
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

const KEY_LABELS: Record<string, string> = {
  craftsman_type: "Pengerjaan oleh",
  result: "Hasil",
  delivery_method: "Metode pengiriman",
  recipient_name: "Nama penerima",
  recipient_phone: "No HP penerima",
  delivery_address: "Alamat pengiriman",
  is_delivered: "Status pengiriman",
  courier_name: "Nama kurir",
  tracking_number: "Nomor resi",
};

const VALUE_LABELS: Record<string, string> = {
  internal: "Tukang Internal",
  external: "Tukang Eksternal",
  lolos: "Lolos",
  tidak_lolos: "Tidak Lolos",
  pickup_store: "Ambil di Toko",
  courier_local: "Kurir Lokal",
  courier_intercity: "Kurir Antar Kota",
  in_house_delivery: "Antar ke Rumah",
  delivered: "Sudah Sampai",
  dispatched: "Dalam Perjalanan",
  failed: "Gagal Dikirim",
};

function humanizeKey(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeValue(val: string): string {
  return VALUE_LABELS[val] ?? val;
}

// ── QC Checklist renderer ─────────────────────────────────────────────────────

const CHECKLIST_LABELS: Record<string, string> = {
  bentuk_sesuai: "Bentuk cincin sesuai order",
  ukuran_sesuai: "Ukuran cincin sesuai",
  berat_minimum: "Berat memenuhi syarat minimum",
  permukaan_bersih: "Permukaan bersih, tidak ada cacat",
  solder_rapi: "Sambungan / patri rapi dan kuat",
  kualitas_laser: "Hasil laser / ukiran bersih dan terbaca",
  kualitas_finishing: "Finishing merata, tidak ada bercak",
  teks_ukiran_benar: "Teks ukiran sesuai order",
  bentuk_final_sesuai: "Bentuk final sesuai order",
  produk_bersih: "Produk bersih, siap serah terima",
};

function QcChecklistDisplay({ items }: { items: Array<{ key?: string; check_key?: string; passed: boolean }> }) {
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const key = item.key ?? item.check_key ?? "";
        const label = CHECKLIST_LABELS[key] ?? humanizeKey(key);
        return (
          <div key={i} className="flex items-center gap-2">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
              item.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
            }`}>
              {item.passed ? "✓" : "✗"}
            </span>
            <span className={`text-[12px] ${item.passed ? "text-slate-700" : "text-rose-600 font-medium"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
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
  const checklist = Array.isArray(data.quality_checklist)
    ? (data.quality_checklist as Array<{ key?: string; check_key?: string; passed: boolean }>)
    : null;

  const notes = typeof data.notes === "string" && data.notes.trim() ? data.notes.trim() : null;

  const entries = Object.entries(data).filter(
    ([k]) => !k.startsWith("_sv_") && k !== "notes" && k !== "quality_checklist",
  );

  const hasContent = checklist || notes || entries.length > 0;
  if (!hasContent) {
    return <p className="text-xs text-slate-400 italic">Tidak ada data tersimpan</p>;
  }

  const preview = entries.slice(0, 3);
  const hasMore = entries.length > 3;

  return (
    <div className="space-y-2.5">
      {/* Key-value fields */}
      {entries.length > 0 && (
        <dl className="space-y-1.5">
          {(expanded ? entries : preview).map(([key, val]) => (
            <div key={key} className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] text-slate-400 shrink-0">{humanizeKey(key)}</dt>
              <dd className="text-[12px] font-medium text-slate-700 text-right break-words">
                {typeof val === "string" ? humanizeValue(val) : formatDataValue(val)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {hasMore && (
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors min-h-[28px]"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> Sembunyikan</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> +{entries.length - 3} lainnya</>
          )}
        </button>
      )}

      {/* QC Checklist */}
      {checklist && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
            Checklist QC
          </p>
          <QcChecklistDisplay items={checklist} />
          {checklist.some((i) => !i.passed) && (
            <p className="mt-1.5 text-[11px] font-medium text-rose-600">
              {checklist.filter((i) => !i.passed).length} item tidak lolos
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="rounded-md border border-amber-100 bg-amber-50/60 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Catatan</p>
          <p className="text-[12px] text-slate-700">{notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Sub: Work order ring specs ────────────────────────────────────────────────

function WorkOrderCard({ wo }: { wo: WorkOrder }) {
  const [open, setOpen] = useState(false);

  const hasPria = wo.ukuran_pria || wo.jenis_cincin_pria || wo.ukiran_pria;
  const hasWanita = wo.ukuran_wanita || wo.jenis_cincin_wanita || wo.ukiran_wanita;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-100 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Spesifikasi Cincin · {wo.cs_order_number}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-slate-200 pt-2.5">
          {hasPria && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Pria</p>
              <dl className="space-y-1">
                {wo.ukuran_pria && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Ukuran</dt>
                    <dd className="text-[11px] font-semibold text-slate-700">{wo.ukuran_pria}</dd>
                  </div>
                )}
                {wo.jenis_cincin_pria && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Jenis</dt>
                    <dd className="text-[11px] font-semibold text-slate-700">{wo.jenis_cincin_pria}</dd>
                  </div>
                )}
                {wo.ukiran_pria && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Ukiran</dt>
                    <dd className="text-[11px] font-semibold text-slate-700 text-right max-w-[55%]">{wo.ukiran_pria}</dd>
                  </div>
                )}
                {wo.keterangan_pria && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Ket.</dt>
                    <dd className="text-[11px] text-slate-600 text-right max-w-[60%]">
                      {Array.isArray(wo.keterangan_pria) ? wo.keterangan_pria.join(", ") : wo.keterangan_pria}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {hasWanita && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Wanita</p>
              <dl className="space-y-1">
                {wo.ukuran_wanita && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Ukuran</dt>
                    <dd className="text-[11px] font-semibold text-slate-700">{wo.ukuran_wanita}</dd>
                  </div>
                )}
                {wo.jenis_cincin_wanita && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Jenis</dt>
                    <dd className="text-[11px] font-semibold text-slate-700">{wo.jenis_cincin_wanita}</dd>
                  </div>
                )}
                {wo.ukiran_wanita && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Ukiran</dt>
                    <dd className="text-[11px] font-semibold text-slate-700 text-right max-w-[55%]">{wo.ukiran_wanita}</dd>
                  </div>
                )}
                {wo.keterangan_wanita && (
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Ket.</dt>
                    <dd className="text-[11px] text-slate-600 text-right max-w-[60%]">
                      {Array.isArray(wo.keterangan_wanita) ? wo.keterangan_wanita.join(", ") : wo.keterangan_wanita}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {(wo.font || wo.laser_position) && (
            <div className="flex gap-3">
              {wo.font && (
                <div>
                  <p className="text-[10px] text-slate-400">Font</p>
                  <p className="text-[11px] font-semibold text-slate-700">{wo.font}</p>
                </div>
              )}
              {wo.laser_position && (
                <div>
                  <p className="text-[10px] text-slate-400">Posisi Laser</p>
                  <p className="text-[11px] font-semibold text-slate-700">{wo.laser_position}</p>
                </div>
              )}
            </div>
          )}

          {(wo.reference_image_pria_url || wo.reference_image_wanita_url) && (
            <div className="flex gap-2">
              {wo.reference_image_pria_url && (
                <a
                  href={wo.reference_image_pria_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Referensi Pria ↗
                </a>
              )}
              {wo.reference_image_wanita_url && (
                <a
                  href={wo.reference_image_wanita_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Referensi Wanita ↗
                </a>
              )}
            </div>
          )}
        </div>
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-mono text-[13px] font-semibold text-slate-500">
                #{item.order_number}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  isProduction
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }`}
              >
                {item.stage_label}
              </span>
              {(item.attempt_number ?? 0) > 1 && (
                <span className="rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  Attempt #{item.attempt_number}
                </span>
              )}
            </div>
            <p className="text-[15px] font-semibold text-slate-800 leading-snug">
              {item.product_name}
            </p>
            <p className="text-[12px] text-slate-400 mt-0.5">{item.customer_name}</p>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-[12px] font-medium text-slate-700">{item.worker_name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{formatRelative(item.submitted_at)}</p>
          </div>
        </div>

        {/* Ring specs from cs_order */}
        {item.work_order && <WorkOrderCard wo={item.work_order} />}

        {/* Submitted data */}
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Data disubmit
            </p>
            <button
              onClick={() => setShowInfo(true)}
              className="flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <AlertTriangle className="h-3 w-3" />
              Panduan Verifikasi
            </button>
          </div>
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
type SupervisorGroup = "all" | "production" | "operational";

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
  const [supervisorGroup, setSupervisorGroup] = useState<SupervisorGroup>("all");

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
      const allowedStages: string[] = u.role?.allowed_stages ?? [];
      const canAccess =
        u.role?.name === "superadmin" ||
        u.role?.role_group === "management" ||
        allowedStages.some((s: string) => s.startsWith("approval_"));
      if (!canAccess) {
        router.push("/workshop/login");
        return;
      }
      setUserEmail(u.username || u.full_name || "");
      if (u.role?.name === "production_supervisor") {
        setSupervisorGroup("production");
        setFilter("production");
      } else if (u.role?.name === "operational_supervisor") {
        setSupervisorGroup("operational");
        setFilter("operational");
      } else {
        setSupervisorGroup("all");
      }
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

  const allTabs: {
    key: FilterTab;
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    { key: "all", label: "Semua", icon: Clock, count: items.length },
    { key: "production", label: "Produksi", icon: Hammer, count: productionCount },
    { key: "operational", label: "Operasional", icon: Settings, count: operationalCount },
  ];

  const tabs = supervisorGroup === "all"
    ? allTabs
    : allTabs.filter((t) => t.key === "all" || t.key === supervisorGroup);

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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Persetujuan Tahap
                </h2>
                {supervisorGroup === "production" && (
                  <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Supervisor Produksi
                  </span>
                )}
                {supervisorGroup === "operational" && (
                  <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    Supervisor Operasional
                  </span>
                )}
              </div>
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
