// app/qr/input/page.tsx

"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/qr/BrandHeader";
import StageInputForm from "@/components/qr/StageInputForm";

// ── Types ────────────────────────────────────────────────────────────────────

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
  deadline: string | null;
  customer_name: string | null;
}

interface StageField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "boolean" | "file";
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
  permissions: { can_submit: boolean; can_edit: boolean; can_reject: boolean };
  current_data?: Record<string, unknown>;
}

type Phase = "loading" | "search" | "form" | "success";

// ── Role → stage map (mirrors server-side ROLE_STAGE_ACCESS) ─────────────────

const ROLE_STAGE_MAP: Record<string, string[]> = {
  jewelry_expert_lebur_bahan: ["lebur_bahan"],
  jewelry_expert_pembentukan_awal: ["pembentukan_cincin", "pemolesan"],
  jewelry_expert_finishing: ["finishing"],
  micro_setting: ["pemasangan_permata"],
  racik: ["racik_bahan"],
  qc_1: ["qc_awal", "qc_1"],
  qc_2: ["qc_2"],
  qc_3: ["qc_3"],
  laser: ["laser"],
  packing: ["packing"],
  kelengkapan: ["kelengkapan"],
  after_sales: ["pengiriman"],
  customer_care: ["pelunasan"],
};

// Stage labels
const STAGE_LABELS: Record<string, string> = {
  qc_awal: "QC Awal",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  finishing: "Finishing",
  laser: "Laser",
  qc_2: "QC 2",
  pelunasan: "Pelunasan",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  packing: "Packing",
  pengiriman: "Pengiriman",
};

// ── Color themes ──────────────────────────────────────────────────────────────

const GROUP_THEME = {
  production: {
    card: "border-amber-200 bg-amber-50/70",
    label: "text-amber-600/70",
    badge: "bg-amber-100 text-amber-800",
    btn: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800",
    ring: "focus:ring-amber-100 focus:border-amber-400",
    spinner: "border-t-amber-500",
  },
  operational: {
    card: "border-blue-200 bg-blue-50/70",
    label: "text-blue-600/70",
    badge: "bg-blue-100 text-blue-800",
    btn: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
    ring: "focus:ring-blue-100 focus:border-blue-400",
    spinner: "border-t-blue-500",
  },
  default: {
    card: "border-stone-200 bg-stone-50/70",
    label: "text-stone-500",
    badge: "bg-stone-100 text-stone-700",
    btn: "bg-stone-700 hover:bg-stone-800 active:bg-stone-900",
    ring: "focus:ring-stone-100 focus:border-stone-400",
    spinner: "border-t-stone-500",
  },
} as const;

function getTheme(roleGroup: string) {
  if (roleGroup === "production") return GROUP_THEME.production;
  if (roleGroup === "operational") return GROUP_THEME.operational;
  return GROUP_THEME.default;
}

// ── Helper: determine target stage for current user + order ───────────────────

function resolveStage(roleName: string, allowedStages: string[], currentStage: string): string | null {
  // DB allowed_stages takes priority
  if (allowedStages.length > 0) {
    return allowedStages.includes(currentStage) ? currentStage : null;
  }
  // Fallback to code-level map
  const roleStages = ROLE_STAGE_MAP[roleName] || [];
  return roleStages.includes(currentStage) ? currentStage : null;
}

// ── Phase: Loading splash ─────────────────────────────────────────────────────

function PhaseLoading({ spinnerClass }: { spinnerClass: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className={`h-10 w-10 rounded-full border-2 border-stone-200 animate-spin ${spinnerClass}`} />
      <p className="text-[13px] text-stone-400">Memuat profil...</p>
    </div>
  );
}

// ── Phase: Search ─────────────────────────────────────────────────────────────

function PhaseSearch({
  user,
  theme,
  onSearch,
  onLogout,
}: {
  user: UserProfile;
  theme: (typeof GROUP_THEME)[keyof typeof GROUP_THEME];
  onSearch: (orderNumber: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [value, setValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const roleLabel = ROLE_STAGE_MAP[user.role.name]
    ?.map((s) => STAGE_LABELS[s] || s)
    .join(", ") || user.role.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setError("Masukkan nomor order");
      return;
    }
    setError(null);
    setIsSearching(true);
    try {
      await onSearch(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order tidak ditemukan");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-[380px]">
      <BrandHeader subtitle="Workshop Input" />

      {/* User greeting */}
      <div className={`mb-5 rounded-xl border px-4 py-3 ${theme.card}`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${theme.label}`}>
          Masuk sebagai
        </p>
        <p className="mt-1 text-[15px] font-semibold text-stone-800">
          {user.full_name}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${theme.badge}`}>
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

      {/* Search form */}
      <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
        <p className="mb-4 text-[13px] font-medium text-stone-600">
          Masukkan nomor order yang akan diproses
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(null); }}
              placeholder="Contoh: ORD-2024-001"
              autoComplete="off"
              autoCapitalize="characters"
              className={`w-full rounded-xl border border-stone-200 bg-stone-50/50 py-3 px-4 text-[15px] font-mono text-stone-700 placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-2 transition-all ${theme.ring}`}
            />
            {error && (
              <p className="mt-2 text-[12px] text-red-500">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className={`w-full rounded-xl py-3 text-[14px] font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${theme.btn}`}
          >
            {isSearching ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                </svg>
                Mencari...
              </span>
            ) : (
              "Cari Order"
            )}
          </button>
        </form>
      </div>
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
  theme: (typeof GROUP_THEME)[keyof typeof GROUP_THEME];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}) {
  const stageLabel = STAGE_LABELS[config.stage] || config.stage;

  return (
    <div className="w-full max-w-[420px]">
      {/* Top bar */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-stone-400 hover:text-stone-600 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Order lain
        </button>
        <p className="text-[13px] font-medium text-stone-700">{user.full_name}</p>
      </div>

      {/* Stage badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${theme.badge}`}>
          {stageLabel}
        </span>
        <span className="text-[12px] text-stone-400">#{order.order_number}</span>
      </div>

      {/* Order info card */}
      <div className={`mb-5 rounded-xl border px-4 py-3.5 ${theme.card}`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${theme.label}`}>
          Produk
        </p>
        <p className="mt-1 text-[15px] font-semibold text-stone-800">
          {order.product_name}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {order.customer_name && (
            <p className="text-[12px] text-stone-500">
              Customer: <span className="font-medium text-stone-700">{order.customer_name}</span>
            </p>
          )}
          {order.target_weight && (
            <p className="text-[12px] text-stone-500">
              Berat target: <span className="font-medium text-stone-700">{order.target_weight} g</span>
            </p>
          )}
          {order.deadline && (
            <p className="text-[12px] text-stone-500">
              Deadline: <span className="font-medium text-stone-700">
                {new Date(order.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Stage form */}
      <StageInputForm
        fields={config.fields}
        permissions={config.permissions}
        initialData={config.current_data}
        onSubmit={onSubmit}
      />
    </div>
  );
}

// ── Phase: Success ────────────────────────────────────────────────────────────

function PhaseSuccess({
  order,
  stage,
  theme,
  onNext,
}: {
  order: OrderInfo;
  stage: string;
  theme: (typeof GROUP_THEME)[keyof typeof GROUP_THEME];
  onNext: () => void;
}) {
  return (
    <div className="w-full max-w-[380px] text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border border-green-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-green-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-[18px] font-semibold text-stone-800 mb-1">Data Tersimpan</h2>
      <p className="text-[13px] text-stone-500 mb-1">
        Tahap <span className="font-medium text-stone-700">{STAGE_LABELS[stage] || stage}</span>
      </p>
      <p className="text-[13px] text-stone-400 mb-8">
        Order #{order.order_number}
      </p>
      <button
        onClick={onNext}
        className={`w-full rounded-xl py-3 text-[14px] font-medium text-white shadow-sm transition-all active:scale-[0.98] ${theme.btn}`}
      >
        Input Order Berikutnya
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function QRInputContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load current user on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Sesi tidak valid");
        }
        const json = await res.json();
        setUser(json.data);
        setPhase("search");
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Gagal memuat sesi");
      }
    })();
  }, []);

  const theme = getTheme(user?.role.role_group || "");

  const handleSearch = useCallback(
    async (orderNumber: string) => {
      if (!user) return;

      // 1. Fetch order
      const orderRes = await fetch(`/api/workshop/order?order_number=${encodeURIComponent(orderNumber)}`);
      const orderJson = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderJson.error || "Order tidak ditemukan");

      const orderData: OrderInfo = orderJson.data;

      // 2. Resolve which stage this user handles
      const targetStage = resolveStage(
        user.role.name,
        user.role.allowed_stages,
        orderData.current_stage,
      );

      if (!targetStage) {
        const myStages = (ROLE_STAGE_MAP[user.role.name] || [])
          .map((s) => STAGE_LABELS[s] || s)
          .join(", ");
        const currentLabel = STAGE_LABELS[orderData.current_stage] || orderData.current_stage;
        throw new Error(
          `Order ini sedang di tahap "${currentLabel}". Anda hanya menangani: ${myStages || user.role.name}.`,
        );
      }

      // 3. Fetch form config
      const configRes = await fetch(
        `/api/stages/form-config?order_id=${orderData.id}&stage=${targetStage}`,
      );
      const configJson = await configRes.json();
      if (!configRes.ok) throw new Error(configJson.error || "Gagal memuat form");

      setOrder(orderData);
      setConfig({ ...configJson.data.config, stage: targetStage });
      setPhase("form");
    },
    [user],
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
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan data");

      setPhase("success");
    },
    [order, config],
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/qr/login");
  }, [router]);

  const handleNextOrder = useCallback(() => {
    setOrder(null);
    setConfig(null);
    setPhase("search");
  }, []);

  // Error state (failed to load user)
  if (loadError) {
    return (
      <div className="w-full max-w-[380px] text-center">
        <BrandHeader subtitle="Workshop Access Point" />
        <div className="rounded-2xl border border-red-100 bg-white/90 p-7 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-[14px] text-stone-600 mb-5">{loadError}</p>
          <button
            onClick={() => router.push("/qr/login")}
            className="text-[14px] font-medium text-amber-600 hover:text-amber-700"
          >
            Login ulang
          </button>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return <PhaseLoading spinnerClass={`border-t-amber-500`} />;
  }

  if (phase === "search" && user) {
    return (
      <PhaseSearch
        user={user}
        theme={theme}
        onSearch={handleSearch}
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
        onBack={handleNextOrder}
      />
    );
  }

  if (phase === "success" && order && config) {
    return (
      <PhaseSuccess
        order={order}
        stage={config.stage}
        theme={theme}
        onNext={handleNextOrder}
      />
    );
  }

  return null;
}

export default function QRInputPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-10 w-10 rounded-full border-2 border-stone-200 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <QRInputContent />
    </Suspense>
  );
}
