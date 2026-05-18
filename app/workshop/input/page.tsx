// app/workshop/input/page.tsx

"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/qr/BrandHeader";
import StageInputForm from "@/components/qr/StageInputForm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  role: {
    name: string;
    role_group: string;
    permissions: Record<string, boolean>;
    allowed_stages: string[];
  };
}

interface OrderInfo {
  id: string;
  order_number: string;
  current_stage: string;
  status: string;
  deadline: string | null;
  updated_at: string | null;
  customer_name: string | null;
  customer_wa: string | null;
}

interface StageField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
}

interface WorkOrder {
  deadline: string | null;
  customer_name: string | null;
  customer_wa: string | null;
  customer_email: string | null;
  acara: string | null;
  kebutuhan_acara: string | null;
  alat_ukur: string | null;
  harga: number | null;
  dp_amount: number | null;
  pengiriman: string | null;
  alamat_pengiriman: string | null;
  box: string | null;
  font: string | null;
  laser_position: string | null;
  pria: {
    ukuran: string | null;
    ukiran: string | null;
    jenis_cincin: string | null;
    keterangan: string[] | string | null;
    reference_image_url: string | null;
  } | null;
  wanita: {
    ukuran: string | null;
    ukiran: string | null;
    jenis_cincin: string | null;
    keterangan: string[] | string | null;
    reference_image_url: string | null;
  } | null;
}

interface FormConfig {
  stage: string;
  stage_type?: string;
  stage_label: string;
  fields: StageField[];
  permissions: { can_submit: boolean; can_edit: boolean };
  current_data?: Record<string, unknown>;
  work_order?: WorkOrder;
}

type Phase = "loading" | "list" | "form" | "success";

// ── Constants ─────────────────────────────────────────────────────────────────

// Fallback only — authoritative stages come from DB via allowed_stages
const ROLE_STAGE_MAP: Record<string, string[]> = {
  customer_care: ["konfirmasi"],
};

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan Order",
  racik_bahan: "Persiapan Bahan",
  approval_racik_bahan: "Approval Persiapan Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  cek_kadar: "Cek Kadar",
  pemasangan_permata: "Micro Setting",
  pemolesan: "Pemolesan Awal",
  qc_1: "Quality Control Awal",
  approval_qc_1: "Approval QC Awal",
  laser: "Laser Engraving",
  finishing: "Finishing",
  approval_produksi: "Approval Produksi",
  qc_2: "Quality Control Akhir",
  approval_qc_2: "Approval QC Akhir",
  konfirmasi: "Konfirmasi Customer Care",
  packing: "Packing & Persiapan Kirim",
  pengiriman: "Pengiriman",
  selesai: "Selesai",
};

// ── Theming ───────────────────────────────────────────────────────────────────

const GROUP_THEME = {
  production: {
    card: "border-amber-200 bg-amber-50/70",
    label: "text-amber-600/70",
    badge: "bg-amber-100 text-amber-800",
    btn: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800",
    ring: "focus:ring-amber-100 focus:border-amber-400",
    spinner: "border-t-amber-500",
    rework: "bg-orange-50 border-orange-200",
  },
  operational: {
    card: "border-blue-200 bg-blue-50/70",
    label: "text-blue-600/70",
    badge: "bg-blue-100 text-blue-800",
    btn: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
    ring: "focus:ring-blue-100 focus:border-blue-400",
    spinner: "border-t-blue-500",
    rework: "bg-orange-50 border-orange-200",
  },
  default: {
    card: "border-stone-200 bg-stone-50/70",
    label: "text-stone-500",
    badge: "bg-stone-100 text-stone-700",
    btn: "bg-stone-700 hover:bg-stone-800 active:bg-stone-900",
    ring: "focus:ring-stone-100 focus:border-stone-400",
    spinner: "border-t-stone-500",
    rework: "bg-orange-50 border-orange-200",
  },
} as const;

type Theme = (typeof GROUP_THEME)[keyof typeof GROUP_THEME];

function getTheme(roleGroup: string): Theme {
  if (roleGroup === "production") return GROUP_THEME.production;
  if (roleGroup === "operational") return GROUP_THEME.operational;
  return GROUP_THEME.default;
}

function inputCls(theme: Theme) {
  return `w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-3.5 text-[14px] text-stone-700 placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-2 transition-all ${theme.ring}`;
}

function FieldRow({
  label,
  theme,
  children,
}: {
  label: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={`block text-[11px] font-medium mb-1 ${theme.label}`}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SpinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        fill="currentColor"
        className="opacity-75"
      />
    </svg>
  );
}

// ── Phase: Loading ────────────────────────────────────────────────────────────

function PhaseLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="h-10 w-10 rounded-full border-2 border-stone-200 border-t-amber-500 animate-spin" />
      <p className="text-[13px] text-stone-400">Memuat profil...</p>
    </div>
  );
}

// ── Phase: Order List ─────────────────────────────────────────────────────────

function PhaseOrderList({
  user,
  theme,
  onSelect,
  onLogout,
}: {
  user: UserProfile;
  theme: Theme;
  onSelect: (order: OrderInfo) => Promise<void>;
  onLogout: () => void;
}) {
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const roleStages = (
    user.role.allowed_stages.length > 0
      ? user.role.allowed_stages
      : (ROLE_STAGE_MAP[user.role.name] ?? [])
  ).filter((s) => s !== "penerimaan_order" && !s.startsWith("approval_"));

  const roleLabel =
    roleStages.map((s) => STAGE_LABELS[s] ?? s).join(", ") || user.role.name;

  // Only show orders that are at this worker's stage(s); exclude terminal/approval-pending states.
  const displayOrders = orders.filter(
    (o) =>
      (roleStages.length === 0 || roleStages.includes(o.current_stage)) &&
      o.status !== "completed" &&
      o.status !== "cancelled" &&
      o.status !== "waiting_approval",
  );

  const fetchOrders = useCallback(async (q: string) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const url = `/api/workshop/orders${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat daftar order");
      setOrders(json.data ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOrders("");
  }, [fetchOrders]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchOrders(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchOrders]);

  const handleSelect = async (order: OrderInfo) => {
    setSelectingId(order.id);
    setSelectError(null);
    try {
      await onSelect(order);
    } catch (err) {
      setSelectError(
        err instanceof Error ? err.message : "Gagal membuka order",
      );
      setSelectingId(null);
    }
  };

  function formatDeadline(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  }

  function isOverdue(d: string | null) {
    if (!d) return false;
    return new Date(d) < new Date();
  }

  return (
    <div className="w-full max-w-[420px]">
      <BrandHeader subtitle="Workshop Input" />

      {/* User badge */}
      <div className={`mb-4 rounded-xl border px-4 py-3 ${theme.card}`}>
        <p
          className={`text-[10px] font-medium uppercase tracking-wider ${theme.label}`}
        >
          Masuk sebagai
        </p>
        <p className="mt-1 text-[15px] font-semibold text-stone-800">
          {user.full_name}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${theme.badge}`}
          >
            {roleLabel}
          </span>
          <button
            onClick={onLogout}
            className="text-[11px] text-stone-400 hover:text-red-500 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor order atau nama produk..."
          className={`w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-[14px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 transition-all ${theme.ring}`}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error from select */}
      {selectError && (
        <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-[12px] text-red-600">
          {selectError}
        </div>
      )}

      {/* Order list */}
      <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <div
              className={`h-8 w-8 rounded-full border-2 border-stone-100 animate-spin ${theme.spinner}`}
            />
            <p className="text-[13px] text-stone-400">Memuat order...</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
            <p className="text-[13px] text-red-500">{fetchError}</p>
            <button
              onClick={() => fetchOrders(search)}
              className={`rounded-lg px-4 py-2 text-[13px] font-medium text-white ${theme.btn}`}
            >
              Coba lagi
            </button>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 px-6 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-10 w-10 text-stone-200"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-[14px] font-medium text-stone-400">
              {search
                ? "Order tidak ditemukan"
                : "Tidak ada order yang perlu ditangani saat ini"}
            </p>
            {search && (
              <p className="text-[12px] text-stone-300">Coba kata kunci lain</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {displayOrders.map((order) => {
              const isSelecting = selectingId === order.id;
              const isRework = order.status === "rework";
              const overdue = isOverdue(order.deadline);

              return (
                <li key={order.id}>
                  <button
                    onClick={() => handleSelect(order)}
                    disabled={!!selectingId}
                    className="w-full text-left px-4 py-3.5 hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Order number + stage badge */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[12px] font-semibold text-stone-500">
                            #{order.order_number}
                          </span>
                          {roleStages.length > 1 && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${theme.badge}`}
                            >
                              {STAGE_LABELS[order.current_stage] ??
                                order.current_stage}
                            </span>
                          )}
                          {isRework && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                              Rework
                            </span>
                          )}
                        </div>

                        {/* Customer name */}
                        <p className="text-[14px] font-semibold text-stone-800 truncate leading-snug">
                          {order.customer_name ?? "—"}
                        </p>

                        {/* WA */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {order.customer_wa && (
                            <span className="text-[12px] text-stone-400">
                              {order.customer_wa}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: deadline + chevron */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {order.deadline ? (
                          <span
                            className={`text-[11px] font-medium ${overdue ? "text-red-500" : "text-stone-400"}`}
                          >
                            {overdue ? "⚠ " : ""}
                            {formatDeadline(order.deadline)}
                          </span>
                        ) : null}
                        {isSelecting ? (
                          <SpinIcon className={`h-4 w-4 text-stone-400`} />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-4 w-4 text-stone-300"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Refresh hint */}
      {!isFetching && !fetchError && displayOrders.length > 0 && (
        <button
          onClick={() => fetchOrders(search)}
          className="mt-3 w-full text-center text-[12px] text-stone-300 hover:text-stone-500 transition-colors py-1"
        >
          Refresh daftar
        </button>
      )}
    </div>
  );
}

// ── Work Order Card ───────────────────────────────────────────────────────────

function WorkOrderCard({ wo, theme }: { wo: WorkOrder; theme: Theme }) {
  const hasPria =
    wo.pria &&
    (wo.pria.ukuran ||
      wo.pria.ukiran ||
      wo.pria.jenis_cincin ||
      wo.pria.keterangan);
  const hasWanita =
    wo.wanita &&
    (wo.wanita.ukuran ||
      wo.wanita.ukiran ||
      wo.wanita.jenis_cincin ||
      wo.wanita.keterangan);
  const hasLaser = wo.font || wo.laser_position;

  const Row = ({
    label,
    value,
  }: {
    label: string;
    value: string | number | null | undefined;
  }) =>
    value !== null && value !== undefined && value !== "" ? (
      <div className="flex gap-2 text-[12px]">
        <span className="shrink-0 text-stone-400 w-28">{label}</span>
        <span className="text-stone-700 font-medium">{String(value)}</span>
      </div>
    ) : null;

  const formatKet = (v: string[] | string | null | undefined) => {
    if (!v) return null;
    return Array.isArray(v) ? v.join(", ") : v;
  };

  return (
    <div
      className={`mb-5 rounded-xl border px-4 py-3.5 space-y-3 ${theme.card}`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-wider ${theme.label}`}
      >
        Spesifikasi Order
      </p>

      {/* Customer */}
      {(wo.customer_name || wo.customer_wa) && (
        <div className="space-y-1">
          <Row label="Customer" value={wo.customer_name} />
          <Row label="WhatsApp" value={wo.customer_wa} />
          <Row label="Email" value={wo.customer_email} />
          <Row
            label="Deadline"
            value={
              wo.deadline
                ? new Date(wo.deadline).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null
            }
          />
        </div>
      )}

      {/* Acara */}
      {(wo.acara || wo.kebutuhan_acara) && (
        <div className="space-y-1">
          <Row label="Acara" value={wo.acara} />
          <Row label="Kebutuhan" value={wo.kebutuhan_acara} />
        </div>
      )}

      {/* Ring specs — Pria */}
      {hasPria && (
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${theme.label}`}
          >
            Pria
          </p>
          <div className="space-y-1">
            <Row label="Ukuran" value={wo.pria!.ukuran} />
            <Row label="Jenis cincin" value={wo.pria!.jenis_cincin} />
            <Row label="Ukiran" value={wo.pria!.ukiran} />
            <Row label="Keterangan" value={formatKet(wo.pria!.keterangan)} />
          </div>
          {wo.pria!.reference_image_url && (
            <a
              href={wo.pria!.reference_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[11px] font-medium text-blue-600 underline"
            >
              Lihat referensi pria ↗
            </a>
          )}
        </div>
      )}

      {/* Ring specs — Wanita */}
      {hasWanita && (
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${theme.label}`}
          >
            Wanita
          </p>
          <div className="space-y-1">
            <Row label="Ukuran" value={wo.wanita!.ukuran} />
            <Row label="Jenis cincin" value={wo.wanita!.jenis_cincin} />
            <Row label="Ukiran" value={wo.wanita!.ukiran} />
            <Row label="Keterangan" value={formatKet(wo.wanita!.keterangan)} />
          </div>
          {wo.wanita!.reference_image_url && (
            <a
              href={wo.wanita!.reference_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[11px] font-medium text-blue-600 underline"
            >
              Lihat referensi wanita ↗
            </a>
          )}
        </div>
      )}

      {/* Laser */}
      {hasLaser && (
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${theme.label}`}
          >
            Laser
          </p>
          <div className="space-y-1">
            <Row label="Font" value={wo.font} />
            <Row label="Posisi" value={wo.laser_position} />
          </div>
        </div>
      )}

      {/* Alat ukur & box */}
      {(wo.alat_ukur || wo.box) && (
        <div className="space-y-1">
          <Row label="Alat ukur" value={wo.alat_ukur} />
          <Row label="Box" value={wo.box} />
        </div>
      )}

      {/* Price */}
      {(wo.harga || wo.dp_amount) && (
        <div className="space-y-1">
          <Row
            label="Harga"
            value={wo.harga ? `Rp ${wo.harga.toLocaleString("id-ID")}` : null}
          />
          <Row
            label="DP"
            value={
              wo.dp_amount ? `Rp ${wo.dp_amount.toLocaleString("id-ID")}` : null
            }
          />
        </div>
      )}

      {/* Delivery */}
      {(wo.pengiriman || wo.alamat_pengiriman) && (
        <div className="space-y-1">
          <Row label="Pengiriman" value={wo.pengiriman} />
          <Row label="Alamat" value={wo.alamat_pengiriman} />
        </div>
      )}
    </div>
  );
}

// ── Phase: Form ───────────────────────────────────────────────────────────────

function PhaseForm({
  user,
  order,
  config,
  theme,
  onSubmit,
  onBack,
}: {
  user: UserProfile;
  order: OrderInfo;
  config: FormConfig;
  theme: Theme;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}) {
  const stageLabel = STAGE_LABELS[config.stage] ?? config.stage;

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-stone-400 hover:text-stone-600 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Daftar order
        </button>
        <p className="text-[13px] font-medium text-stone-700">
          {user.full_name}
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${theme.badge}`}
        >
          {stageLabel}
        </span>
        <span className="text-[12px] text-stone-400">
          #{order.order_number}
        </span>
        {order.status === "rework" && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            Rework
          </span>
        )}
      </div>

      <div className={`mb-4 rounded-xl border px-4 py-3 ${theme.card}`}>
        <p
          className={`text-[10px] font-medium uppercase tracking-wider ${theme.label}`}
        >
          Customer
        </p>
        <p className="mt-1 text-[15px] font-semibold text-stone-800">
          {order.customer_name ?? "—"}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
          {order.customer_wa && (
            <p className="text-[12px] text-stone-500">
              WA:{" "}
              <span className="font-medium text-stone-700">
                {order.customer_wa}
              </span>
            </p>
          )}
          {order.deadline && (
            <p className="text-[12px] text-stone-500">
              Deadline:{" "}
              <span className="font-medium text-stone-700">
                {new Date(order.deadline).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </p>
          )}
        </div>
      </div>

      {config.work_order && (
        <WorkOrderCard wo={config.work_order} theme={theme} />
      )}

      <StageInputForm
        fields={config.fields as any}
        permissions={config.permissions as any}
        initialData={config.current_data}
        onSubmit={onSubmit}
        stageType={config.stage_type}
      />
    </div>
  );
}

// ── Phase: Success ────────────────────────────────────────────────────────────

function PhaseSuccess({
  orderNumber,
  stage,
  theme,
  onNext,
}: {
  orderNumber: string;
  stage: string;
  theme: Theme;
  onNext: () => void;
}) {
  return (
    <div className="w-full max-w-[380px] text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border border-green-200">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-8 w-8 text-green-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-[18px] font-semibold text-stone-800 mb-1">
        Data Tersimpan
      </h2>
      <p className="text-[13px] text-stone-500 mb-1">
        Tahap{" "}
        <span className="font-medium text-stone-700">
          {STAGE_LABELS[stage] ?? stage}
        </span>
      </p>
      <p className="text-[13px] text-stone-400 mb-8">Order #{orderNumber}</p>
      <button
        onClick={onNext}
        className={`w-full rounded-xl py-3 text-[14px] font-medium text-white shadow-sm transition-all active:scale-[0.98] ${theme.btn}`}
      >
        Kembali ke Daftar
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function WorkshopInputContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load user profile on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Sesi tidak valid");
        }
        const json = await res.json();
        const profile: UserProfile = json.data;
        setUser(profile);

        setPhase("list");
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Gagal memuat sesi");
      }
    })();
  }, []);

  const theme = getTheme(user?.role.role_group ?? "");

  // Called when worker taps an order card — fetch form config directly
  const handleSelect = useCallback(
    async (selectedOrder: OrderInfo) => {
      if (!user) return;

      const allowedStages: string[] = user.role.allowed_stages ?? [];
      const roleStageMap = ROLE_STAGE_MAP[user.role.name] ?? [];
      const myStages = allowedStages.length > 0 ? allowedStages : roleStageMap;

      // Only reject if we know the worker's stages AND this stage isn't one of them.
      if (
        myStages.length > 0 &&
        !myStages.includes(selectedOrder.current_stage)
      ) {
        const stageNames = myStages.map((s) => STAGE_LABELS[s] ?? s).join(", ");
        throw new Error(
          `Order di tahap "${STAGE_LABELS[selectedOrder.current_stage] ?? selectedOrder.current_stage}". Anda menangani: ${stageNames}.`,
        );
      }

      const configRes = await fetch(
        `/api/stages/form-config?order_id=${selectedOrder.id}&stage=${selectedOrder.current_stage}`,
      );
      const configJson = await configRes.json();
      if (!configRes.ok)
        throw new Error(configJson.error ?? "Gagal memuat form");

      setOrder(selectedOrder);
      setConfig({
        ...configJson.data.config,
        stage: selectedOrder.current_stage,
      });
      setPhase("form");
    },
    [user],
  );

  const handleSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!order || !config) return;
      const data = { ...formData };
      // StageInputForm uses check_key; API expects key
      if (Array.isArray(data.quality_checklist)) {
        data.quality_checklist = (data.quality_checklist as any[]).map(
          (item) => ({
            key: item.check_key ?? item.key,
            passed: item.passed,
          }),
        );
      }
      const res = await fetch("/api/stages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, stage: config.stage, data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Gagal menyimpan data");
      setPhase("success");
    },
    [order, config],
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/workshop/login");
  }, [router]);

  const handleBackToList = useCallback(() => {
    setOrder(null);
    setConfig(null);
    setPhase("list");
  }, []);

  if (loadError) {
    return (
      <div className="w-full max-w-[380px] text-center">
        <BrandHeader subtitle="Workshop Access Point" />
        <div className="rounded-2xl border border-red-100 bg-white/90 p-7 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-7 w-7 text-red-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-[14px] text-stone-600 mb-5">{loadError}</p>
          <button
            onClick={() => router.push("/workshop/login")}
            className="text-[14px] font-medium text-amber-600 hover:text-amber-700"
          >
            Login ulang
          </button>
        </div>
      </div>
    );
  }

  if (phase === "loading") return <PhaseLoading />;

  if (phase === "list" && user) {
    return (
      <PhaseOrderList
        user={user}
        theme={theme}
        onSelect={handleSelect}
        onLogout={handleLogout}
      />
    );
  }

  if (phase === "form" && user && order && config) {
    return (
      <PhaseForm
        user={user}
        order={order}
        config={config}
        theme={theme}
        onSubmit={handleSubmit}
        onBack={handleBackToList}
      />
    );
  }

  if (phase === "success") {
    return (
      <PhaseSuccess
        orderNumber={order!.order_number}
        stage={config!.stage}
        theme={theme}
        onNext={handleBackToList}
      />
    );
  }

  return null;
}

export default function WorkshopInputPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-10 w-10 rounded-full border-2 border-stone-200 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <WorkshopInputContent />
    </Suspense>
  );
}
