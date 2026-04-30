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
  product_name: string;
  current_stage: string;
  status: string;
  target_weight: number | null;
  target_karat: number | null;
  deadline: string | null;
  updated_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
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

interface FormConfig {
  stage: string;
  stage_label: string;
  fields: StageField[];
  permissions: { can_submit: boolean; can_edit: boolean };
  current_data?: Record<string, unknown>;
}

type Phase = "loading" | "list" | "create" | "form" | "success";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_STAGE_MAP: Record<string, string[]> = {
  // Production roles
  racik: ["racik_bahan"],
  jewelry_expert_lebur_bahan: ["lebur_bahan"],
  jewelry_expert_pembentukan_awal: ["pembentukan_cincin"],
  micro_setting: ["pemasangan_permata"],
  jewelry_expert_finishing: ["pemolesan", "finishing"],
  laser: ["laser"],

  // QC roles
  qc_1: ["qc_1"],
  qc_2: ["qc_2"],
  qc_3: ["qc_3"],

  // Support roles
  kelengkapan: ["kelengkapan"],
  packing: ["packing", "pengiriman"],
  after_sales: ["pelunasan"],

  // Customer-facing roles
  customer_care: ["penerimaan_order"],

  // Supervisor / Management (approval gates)
  supervisor: [
    "approval_penerimaan_order",
    "approval_qc_1",
    "approval_qc_2",
    "approval_qc_3",
    "approval_pelunasan",
  ],
};

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan Order",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "Quality Control 1",
  approval_qc_1: "Approval QC 1",
  finishing: "Finishing",
  laser: "Laser Engraving",
  qc_2: "Quality Control 2",
  approval_qc_2: "Approval QC 2",
  kelengkapan: "Kelengkapan",
  qc_3: "Quality Control 3 (Final)",
  approval_qc_3: "Approval QC 3",
  packing: "Packing",
  pelunasan: "Pelunasan & Pembayaran",
  approval_pelunasan: "Approval Pelunasan",
  pengiriman: "Pengiriman & Handover",
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

                        {/* Product name */}
                        <p className="text-[14px] font-semibold text-stone-800 truncate leading-snug">
                          {order.product_name}
                        </p>

                        {/* Customer + weight */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {order.customer_name && (
                            <span className="text-[12px] text-stone-400">
                              {order.customer_name}
                            </span>
                          )}
                          {order.target_weight && (
                            <span className="text-[12px] text-stone-400">
                              {order.target_weight} g
                            </span>
                          )}
                          {order.target_karat && (
                            <span className="text-[12px] text-stone-400">
                              {order.target_karat}K
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

// ── Phase: Create (penerimaan_order) ─────────────────────────────────────────

function formatNumber(value: string): string {
  // Remove non-digit characters
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  // Format with dots
  return Number(digits).toLocaleString("id-ID");
}

function PhaseCreate({
  user,
  theme,
  onCreate,
  onLogout,
}: {
  user: UserProfile;
  theme: Theme;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
  onLogout: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_wa: "",
    product_name: "",
    target_weight: "",
    target_karat: "",
    ring_size: "",
    model_description: "",
    delivery_method: "pickup_store",
    deadline: "",
    total_price: "",
    dp_amount: "",
    engraved_text: "",
    special_notes: "",
  });

  const set =
    (name: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.product_name.trim()) {
      setError("Nama pelanggan dan nama produk wajib diisi");
      return;
    }
    if (!form.target_weight || Number(form.target_weight) <= 0) {
      setError("Target berat harus lebih dari 0");
      return;
    }
    if (form.target_karat === "") {
      setError("Target karat wajib diisi");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate({
        new_customer: {
          name: form.customer_name.trim(),
          phone: form.customer_phone.trim() || null,
          wa_contact: form.customer_wa.trim() || null,
        },
        product_name: form.product_name.trim(),
        target_weight: Number(form.target_weight),
        target_karat: Number(form.target_karat),
        ring_size: form.ring_size.trim() || null,
        model_description: form.model_description.trim() || null,
        engraved_text: form.engraved_text.trim() || null,
        delivery_method: form.delivery_method || "pickup_store",
        deadline: form.deadline || null,
        total_price: form.total_price ? Number(form.total_price) : null,
        dp_amount: form.dp_amount ? Number(form.dp_amount) : null,
        special_notes: form.special_notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <BrandHeader subtitle="Penerimaan Order" />

      <div className={`mb-5 rounded-xl border px-4 py-3 ${theme.card}`}>
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
            Customer Service
          </span>
          <button
            onClick={onLogout}
            className="text-[11px] text-stone-400 hover:text-red-500 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm p-5 shadow-sm space-y-5"
      >
        {/* Customer */}
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${theme.label}`}
          >
            Data Pelanggan
          </p>
          <div className="space-y-3">
            <FieldRow label="Nama Pelanggan *" theme={theme}>
              <input
                type="text"
                value={form.customer_name}
                onChange={set("customer_name")}
                placeholder="Nama lengkap"
                required
                className={inputCls(theme)}
              />
            </FieldRow>
            <FieldRow label="No HP" theme={theme}>
              <input
                type="tel"
                value={form.customer_wa}
                onChange={set("customer_wa")}
                placeholder="08xx-xxxx-xxxx"
                className={inputCls(theme)}
              />
            </FieldRow>
          </div>
        </div>

        {/* Order detail */}
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${theme.label}`}
          >
            Detail Pesanan
          </p>
          <div className="space-y-3">
            <FieldRow label="Nama Produk *" theme={theme}>
              <input
                type="text"
                value={form.product_name}
                onChange={set("product_name")}
                placeholder="Contoh: Cincin Berlian 18K"
                required
                className={inputCls(theme)}
              />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Target Berat * (g)" theme={theme}>
                <input
                  type="number"
                  value={form.target_weight}
                  onChange={set("target_weight")}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                  className={inputCls(theme)}
                />
              </FieldRow>
              <FieldRow label="Target Karat * (K)" theme={theme}>
                <input
                  type="number"
                  value={form.target_karat}
                  onChange={set("target_karat")}
                  placeholder="18"
                  step="0.5"
                  min="0"
                  max="24"
                  required
                  className={inputCls(theme)}
                />
              </FieldRow>
            </div>
            <FieldRow label="Ukuran" theme={theme}>
              <input
                type="text"
                value={form.ring_size}
                onChange={set("ring_size")}
                placeholder="Contoh: 12"
                className={inputCls(theme)}
              />
            </FieldRow>
            <FieldRow label="Teks Ukiran (Laser)" theme={theme}>
              <input
                type="text"
                value={form.engraved_text}
                onChange={set("engraved_text")}
                placeholder="Teks yang akan diukir"
                className={inputCls(theme)}
              />
            </FieldRow>
            <FieldRow label="Deskripsi Model" theme={theme}>
              <textarea
                value={form.model_description}
                onChange={set("model_description")}
                placeholder="Detail bentuk, desain, model..."
                rows={2}
                className={`${inputCls(theme)} resize-none`}
              />
            </FieldRow>
            <FieldRow label="Metode Pengambilan" theme={theme}>
              <select
                value={form.delivery_method}
                onChange={set("delivery_method")}
                className={inputCls(theme)}
              >
                <option value="pickup_store">Ambil di Toko</option>
                <option value="courier_local">Kurir Lokal</option>
                <option value="courier_intercity">Kurir Antar Kota</option>
                <option value="in_house_delivery">Antar ke Rumah</option>
                <option value="other">Lainnya</option>
              </select>
            </FieldRow>
            <FieldRow label="Target Selesai" theme={theme}>
              <input
                type="date"
                value={form.deadline}
                onChange={set("deadline")}
                className={inputCls(theme)}
              />
            </FieldRow>
          </div>
        </div>

        {/* Harga */}
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${theme.label}`}
          >
            Harga & DP
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Total Harga (IDR)" theme={theme}>
              <input
                type="text"
                inputMode="numeric"
                value={form.total_price ? formatNumber(form.total_price) : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm((prev) => ({ ...prev, total_price: raw }));
                }}
                placeholder="0"
                className={inputCls(theme)}
              />
            </FieldRow>
            <FieldRow label="Jumlah DP (IDR)" theme={theme}>
              <input
                type="text"
                inputMode="numeric"
                value={form.dp_amount ? formatNumber(form.dp_amount) : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm((prev) => ({ ...prev, dp_amount: raw }));
                }}
                placeholder="0"
                className={inputCls(theme)}
              />
            </FieldRow>
          </div>
        </div>

        <FieldRow label="Catatan Khusus" theme={theme}>
          <textarea
            value={form.special_notes}
            onChange={set("special_notes")}
            placeholder="Keinginan khusus, detail tambahan..."
            rows={2}
            className={`${inputCls(theme)} resize-none`}
          />
        </FieldRow>

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full rounded-xl py-3 text-[14px] font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${theme.btn}`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <SpinIcon /> Menyimpan...
            </span>
          ) : (
            "Buat Order"
          )}
        </button>
      </form>
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

      <div className={`mb-5 rounded-xl border px-4 py-3.5 ${theme.card}`}>
        <p
          className={`text-[10px] font-medium uppercase tracking-wider ${theme.label}`}
        >
          Produk
        </p>
        <p className="mt-1 text-[15px] font-semibold text-stone-800">
          {order.product_name}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {order.customer_name && (
            <p className="text-[12px] text-stone-500">
              Customer:{" "}
              <span className="font-medium text-stone-700">
                {order.customer_name}
              </span>
            </p>
          )}
          {order.target_weight && (
            <p className="text-[12px] text-stone-500">
              Berat:{" "}
              <span className="font-medium text-stone-700">
                {order.target_weight} g
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

      <StageInputForm
        fields={config.fields as any}
        permissions={config.permissions as any}
        initialData={config.current_data}
        onSubmit={onSubmit}
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
  const isCreate = stage === "penerimaan_order";
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
        {isCreate ? "Order Berhasil Dibuat" : "Data Tersimpan"}
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
        {isCreate ? "Buat Order Baru" : "Kembali ke Daftar"}
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
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(
    null,
  );

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

        const dbStages: string[] = profile.role.allowed_stages ?? [];
        const roleStages = ROLE_STAGE_MAP[profile.role.name] ?? [];
        const stages = dbStages.length > 0 ? dbStages : roleStages;
        setPhase(stages.includes("penerimaan_order") ? "create" : "list");
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

  const handleCreate = useCallback(
    async (formData: Record<string, unknown>) => {
      const res = await fetch("/api/stages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "penerimaan_order", data: formData }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Gagal membuat order");
      setCreatedOrderNumber(result.data.order_number);
      setPhase("success");
    },
    [],
  );

  const handleSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!order || !config) return;
      const res = await fetch("/api/stages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          stage: config.stage,
          data: formData,
        }),
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

  const handleNextCreate = useCallback(() => {
    setCreatedOrderNumber(null);
    setPhase("create");
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

  if (phase === "create" && user) {
    return (
      <PhaseCreate
        user={user}
        theme={theme}
        onCreate={handleCreate}
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
    const fromCreate = !!createdOrderNumber;
    return (
      <PhaseSuccess
        orderNumber={fromCreate ? createdOrderNumber! : order!.order_number}
        stage={fromCreate ? "penerimaan_order" : config!.stage}
        theme={theme}
        onNext={fromCreate ? handleNextCreate : handleBackToList}
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
