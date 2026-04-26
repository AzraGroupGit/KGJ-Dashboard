// app/dashboard/superadmin/page.tsx

"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardSnapshot {
  bms: {
    lead_masuk: number;
    closing: number;
    omset: number;
    cr: number;
    lead_delta: number;
    closing_delta: number;
  };
  oprprd: {
    produksi: number;
    target: number;
    on_time_pct: number;
    backlog: number;
  };
  activity: ActivityItem[];
  alerts: AlertItem[];
}

interface ActivityItem {
  id: string;
  time: string;
  module: "bms" | "oprprd";
  message: string;
}

interface AlertItem {
  id: string;
  level: "warning" | "danger" | "info";
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtRpShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
};

const formatFullDate = () =>
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// ─── SVG Icon set (custom, tidak pakai library) ───────────────────────────────

const IcTrendUp = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path
      d="M1 8.5L4 5.5L6.5 8L10 3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 3H10V5.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcTrendDown = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path
      d="M1 2.5L4 5.5L6.5 3L10 8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 8H10V5.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M2 6.5H11M7.5 3L11 6.5L7.5 10"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcAlert = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M6.5 1.5L12 11.5H1L6.5 1.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <line
      x1="6.5"
      y1="5.5"
      x2="6.5"
      y2="8"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="6.5" cy="9.5" r="0.55" fill="currentColor" />
  </svg>
);

const IcInfo = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <line
      x1="6.5"
      y1="6"
      x2="6.5"
      y2="9.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="6.5" cy="4" r="0.55" fill="currentColor" />
  </svg>
);

const IcBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect
      x="1"
      y="6"
      width="3.5"
      height="9"
      rx="0.8"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="6.25"
      y="2"
      width="3.5"
      height="13"
      rx="0.8"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="11.5"
      y="9"
      width="3.5"
      height="6"
      rx="0.8"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const IcGear = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M12.95 3.05L11.89 4.11M4.11 11.89L3.05 12.95"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const IcPulse = () => (
  <svg width="6" height="6" viewBox="0 0 6 6">
    <circle cx="3" cy="3" r="3" fill="currentColor" />
  </svg>
);

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({
  pct,
  size = 50,
  stroke = 3,
  color,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={off}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </svg>
  );
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function Delta({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded
      ${up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}
    >
      {up ? <IcTrendUp /> : <IcTrendDown />} {Math.abs(delta)}
    </span>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  delta,
  vc = "text-slate-900",
}: {
  label: string;
  value: string | number;
  delta?: number;
  vc?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[11px] text-slate-400 tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        {delta !== undefined && <Delta delta={delta} />}
        <span className={`text-[13px] font-semibold tabular-nums ${vc}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({
  href,
  title,
  subtitle,
  icon,
  topBar,
  btnBg,
  children,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  topBar: string;
  btnBg: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-200">
      <div className={`h-[2px] w-full ${topBar}`} />
      <div className="p-6 flex-1 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
              {icon}
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-slate-900 tracking-tight leading-none">
                {title}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 tracking-widest uppercase">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Stats body */}
        <div className="flex-1">{children}</div>

        {/* CTA */}
        <button
          onClick={() => router.push(href)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold tracking-wide text-white transition-all active:scale-[0.98] hover:opacity-90 ${btnBg}`}
        >
          <span>Buka {title}</span>
          <IcArrowRight />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperadminDashboard() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const cu = getClientUser();
    if (!cu) {
      router.push("/login");
      return;
    }
    setClientUser(cu);

    const t = setTimeout(() => setMounted(true), 50);

    const fetchSnapshot = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/overview");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchSnapshot();

    return () => clearTimeout(t);
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const bms = data?.bms ?? {
    lead_masuk: 0,
    closing: 0,
    omset: 0,
    cr: 0,
    lead_delta: 0,
    closing_delta: 0,
  };
  const ops = data?.oprprd ?? {
    produksi: 0,
    target: 0,
    on_time_pct: 0,
    backlog: 0,
  };
  const alerts = data?.alerts ?? [];
  const activity = data?.activity ?? [];
  const prodPct =
    ops.target > 0 ? Math.round((ops.produksi / ops.target) * 100) : 0;

  if (!clientUser) return null;

  if (isLoading && !data) {
    return (
      <div className="flex h-screen bg-[#f8f9fb]">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser.email} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat dashboard..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fb]">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser.email} role="superadmin" />

        <main
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          {/* ── Greeting ─────────────────────────────────────────────── */}
          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-5 overflow-hidden">
            {/* geometric accent — subtle, no emoji */}
            <div
              className="absolute right-0 top-0 bottom-0 w-48 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, transparent 40%, rgba(99,102,241,0.04) 100%)",
              }}
            />
            {/* decorative lines */}
            <div className="absolute right-10 top-0 bottom-0 w-px bg-slate-100/60" />
            <div className="absolute right-20 top-4 bottom-4 w-px bg-slate-100/40" />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] text-slate-400 font-mono tracking-wide">
                  {formatFullDate()}
                </p>
              </div>

              <div className="flex items-center gap-5 shrink-0">
                <div className="hidden sm:flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 animate-pulse">
                      <IcPulse />
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Sistem aktif
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">
                    Terakhir sync{" "}
                    {now.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="border-l border-slate-100 pl-5">
                  <p className="text-[27px] font-bold font-mono text-slate-900 leading-none tabular-nums tracking-tight">
                    {now.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5 tracking-[0.15em] uppercase text-right">
                    {now.toLocaleDateString("id-ID", { weekday: "long" })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Alerts ───────────────────────────────────────────────── */}
          {alerts.length > 0 && (
            <div className="space-y-1.5">
              {alerts.map((a) => {
                const s = {
                  warning: {
                    wrap: "bg-amber-50 border-amber-200/60 text-amber-700",
                    ic: <IcAlert />,
                  },
                  danger: {
                    wrap: "bg-rose-50  border-rose-200/60  text-rose-700",
                    ic: <IcAlert />,
                  },
                  info: {
                    wrap: "bg-sky-50   border-sky-200/60   text-sky-700",
                    ic: <IcInfo />,
                  },
                }[a.level];
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[11.5px] font-medium ${s.wrap}`}
                  >
                    <span className="shrink-0 opacity-70">{s.ic}</span>
                    {a.message}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Module cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* BMS */}
            <ModuleCard
              href="/dashboard/superadmin/bms"
              title="Business Management"
              subtitle="Lead · Closing · Omzet"
              icon={<IcBarChart />}
              topBar="bg-indigo-500"
              btnBg="bg-indigo-600 hover:bg-indigo-700"
            >
              <StatRow
                label="Lead Masuk"
                value={bms.lead_masuk}
                delta={bms.lead_delta}
              />
              <StatRow
                label="Closing"
                value={bms.closing}
                delta={bms.closing_delta}
                vc="text-emerald-600"
              />
              <StatRow label="Omzet Hari Ini" value={fmtRpShort(bms.omset)} />
              <StatRow
                label="Conversion Rate"
                value={`${bms.cr.toFixed(1)}%`}
                vc={
                  bms.cr >= 25
                    ? "text-emerald-600"
                    : bms.cr >= 15
                      ? "text-amber-500"
                      : "text-rose-500"
                }
              />
            </ModuleCard>

            {/* OPRPRD */}
            <ModuleCard
              href="/dashboard/superadmin/oprprd"
              title="Operasional & Produksi"
              subtitle="Produksi · Operasi · Analisis"
              icon={<IcGear />}
              topBar="bg-teal-500"
              btnBg="bg-teal-600 hover:bg-teal-700"
            >
              {/* Ring + progress */}
              <div className="flex items-center gap-5 pb-3 mb-0.5 border-b border-slate-50">
                <div className="relative shrink-0">
                  <ProgressRing pct={prodPct} color="#0d9488" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-teal-700 tabular-nums">
                      {prodPct}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">
                    Target Produksi
                  </p>
                  <p className="text-[15px] font-bold text-slate-900 tabular-nums mt-0.5">
                    {ops.produksi}
                    <span className="text-[11px] text-slate-400 font-normal">
                      {" "}
                      / {ops.target} unit
                    </span>
                  </p>
                </div>
              </div>
              <StatRow
                label="On-Time Delivery"
                value={`${ops.on_time_pct}%`}
                vc={
                  ops.on_time_pct >= 80
                    ? "text-emerald-600"
                    : ops.on_time_pct >= 60
                      ? "text-amber-500"
                      : "text-rose-500"
                }
              />
              <StatRow
                label="Backlog Order"
                value={`${ops.backlog} order`}
                vc={ops.backlog > 5 ? "text-rose-500" : "text-slate-700"}
              />
            </ModuleCard>
          </div>

          {/* ── Activity feed ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100">
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight uppercase tracking-widest">
                Aktivitas Terkini
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 animate-pulse">
                  <IcPulse />
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Live
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-50">
              {activity.length === 0 && isLoading ? (
                <p className="px-6 py-4 text-[11px] text-slate-400">
                  Memuat aktivitas...
                </p>
              ) : activity.length === 0 ? (
                <p className="px-6 py-4 text-[11px] text-slate-400">
                  Belum ada aktivitas tercatat.
                </p>
              ) : null}
              {activity.map((a) => {
                const bmsRow = a.module === "bms";
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* time */}
                    <span className="text-[10px] font-mono text-slate-300 w-9 shrink-0 tabular-nums">
                      {a.time}
                    </span>
                    {/* module chip */}
                    <span
                      className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border shrink-0
                      ${
                        bmsRow
                          ? "bg-indigo-50 text-indigo-500 border-indigo-100"
                          : "bg-teal-50   text-teal-600  border-teal-100"
                      }`}
                    >
                      {bmsRow ? "BMS" : "OPR"}
                    </span>
                    {/* divider */}
                    <div className="w-px h-3 bg-slate-200 shrink-0" />
                    {/* message */}
                    <span className="text-[12px] text-slate-600">
                      {a.message}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] font-mono text-slate-300 tracking-widest uppercase pb-2">
            Superadmin — Akses penuh ke semua modul
          </p>
        </main>
      </div>
    </div>
  );
}
