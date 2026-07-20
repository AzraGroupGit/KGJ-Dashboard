// app/dashboard/superadmin/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Info,
  Settings,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

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

const IcTrendUp = () => <TrendingUp size={11} />;
const IcTrendDown = () => <TrendingDown size={11} />;
const IcArrowRight = () => <ArrowRight size={13} />;
const IcAlert = () => <AlertTriangle size={13} />;
const IcInfo = () => <Info size={13} />;
const IcBarChart = () => <BarChart3 size={16} />;
const IcGear = () => <Settings size={16} />;

// ─── KPI Pill ──────────────────────────────────────────────────────────────────

function KpiPill({
  label,
  value,
  sub,
  status,
}: {
  label: string;
  value: string | number;
  sub?: string;
  status?: "good" | "warn" | "danger";
}) {
  const sc =
    status === "good"
      ? "text-emerald-500"
      : status === "warn"
        ? "text-amber-500"
        : status === "danger"
          ? "text-rose-500"
          : "text-ivory";
  const dc =
    status === "good"
      ? "bg-emerald-400"
      : status === "warn"
        ? "bg-amber-400"
        : status === "danger"
          ? "bg-rose-400"
          : "bg-white/20";
  return (
    <div className="bg-cocoa rounded-xl border border-gold/10 px-4 py-3 hover:border-gold/40 transition-colors duration-200 cursor-pointer shadow-[0_1px_3px_0_rgba(201,162,39,0.04)]">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dc}`} />
        <p className="text-[10px] text-white/40 font-medium tracking-wide">
          {label}
        </p>
      </div>
      <p className={`text-lg font-bold tabular-nums leading-tight ${sc}`}>
        {value}
        {sub && (
          <span className="text-[10px] font-normal text-white/40 ml-1">
            {sub}
          </span>
        )}
      </p>
    </div>
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
  vc = "text-ivory",
  hint,
}: {
  label: string;
  value: string | number;
  delta?: number;
  vc?: string;
  hint?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 group/stat cursor-help"
      title={hint}
    >
      <span className="text-[11px] text-white/40 tracking-wide">{label}</span>
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
    <div className="bg-cocoa rounded-2xl border border-gold/10 overflow-hidden flex flex-col group transition-all duration-300 shadow-[0_1px_3px_0_rgba(201,162,39,0.05)] hover:shadow-[0_4px_16px_-4px_rgba(201,162,39,0.12)] hover:border-gold/40">
      <div className={`h-[2px] w-full ${topBar}`} />
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-carbon flex items-center justify-center text-white/50 border border-gold/10">
              {icon}
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-ivory tracking-tight leading-none">
                {title}
              </h3>
              <p className="text-[11px] text-white/40 mt-0.5">
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
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold tracking-wide text-white transition-all duration-150 active:scale-[0.97] hover:opacity-90 ${btnBg}`}
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

  useEffect(() => {
    const u = getClientUser();
    setClientUser(u);
    if (!u) router.push("/login");
  }, [router]);
  const [mounted, setMounted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetcher<DashboardSnapshot>("/api/overview"),
  });

  useEffect(() => {
    if (!clientUser) router.push("/login");
  }, [clientUser, router]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
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

  if (!mounted) {
    return (
      <div
        className="flex h-screen"
        style={{
          background:
            "#26211C url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='0.75' fill='rgba(201,162,39,0.06)'/%3E%3C/svg%3E\") repeat",
        }}
      >
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="" role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat dashboard..." />
          </main>
        </div>
      </div>
    );
  }

  if (!clientUser) {
    return (
      <div
        className="flex h-screen"
        style={{
          background:
            "#26211C url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='0.75' fill='rgba(201,162,39,0.06)'/%3E%3C/svg%3E\") repeat",
        }}
      >
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="" role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat dashboard..." />
          </main>
        </div>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div
        className="flex h-screen"
        style={{
          background:
            "#26211C url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='0.75' fill='rgba(201,162,39,0.06)'/%3E%3C/svg%3E\") repeat",
        }}
      >
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
      <div
        className="flex h-screen"
        style={{
          background:
            "#26211C url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='0.75' fill='rgba(201,162,39,0.06)'/%3E%3C/svg%3E\") repeat",
        }}
      >
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser.email} role="superadmin" />

        <main
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
        >
          {/* ── Page Header ───────────────────────────────────────────── */}
          <div
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: "0ms",
            }}
          >
            <div>
              <h1 className="font-playfair text-2xl font-semibold tracking-wide text-ivory">
                Superadmin Dashboard
              </h1>
              <p className="mt-0.5 text-xs text-white/40">
                {formatFullDate()}
              </p>
            </div>
            {/* Quick inline stats */}
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <p className="text-white/40">Omzet</p>
                <p className="font-semibold tabular-nums text-cream">
                  {fmtRpShort(bms.omset)}
                </p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <p className="text-white/40">Produksi</p>
                <p className="font-semibold tabular-nums text-cream">
                  {ops.produksi}<span className="font-normal text-white/40">/{ops.target}</span>
                </p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <p className="text-white/40">On-Time</p>
                <p className={`font-semibold tabular-nums ${ops.on_time_pct >= 80 ? "text-emerald-300" : ops.on_time_pct >= 60 ? "text-amber-300" : "text-rose-300"}`}>
                  {ops.on_time_pct}%
                </p>
              </div>
            </div>
          </div>

          {/* ── KPI pills ────────────────────────────────────────────── */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition:
                "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: "80ms",
            }}
          >
            <KpiPill
              label="Omzet Hari Ini"
              value={fmtRpShort(bms.omset)}
              status={bms.omset > 0 ? "good" : undefined}
            />
            <KpiPill
              label="Produksi Aktif"
              value={ops.produksi}
              sub={`/ ${ops.target}`}
              status={prodPct >= 60 ? "good" : prodPct >= 30 ? "warn" : "danger"}
            />
            <KpiPill
              label="On-Time Delivery"
              value={`${ops.on_time_pct}%`}
              status={
                ops.on_time_pct >= 80
                  ? "good"
                  : ops.on_time_pct >= 60
                    ? "warn"
                    : "danger"
              }
            />
            <KpiPill
              label="Active Alerts"
              value={alerts.length}
              status={
                alerts.length === 0
                  ? "good"
                  : alerts.length <= 2
                    ? "warn"
                    : "danger"
              }
            />
          </div>

          {/* ── Alerts ───────────────────────────────────────────────── */}
          {alerts.length > 0 && (
            <div
              className="space-y-1.5"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(8px)",
                transition:
                  "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: "160ms",
              }}
            >
              {alerts.map((a) => {
                const s = {
                  warning: {
                    wrap: "bg-amber-500/10 border-amber-400/20 text-amber-300",
                    ic: <IcAlert />,
                  },
                  danger: {
                    wrap: "bg-rose-500/10  border-rose-400/20  text-rose-300",
                    ic: <IcAlert />,
                  },
                  info: {
                    wrap: "bg-sky-500/10   border-sky-400/20   text-sky-300",
                    ic: <IcInfo />,
                  },
                }[a.level];
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[11.5px] font-medium transition-all duration-200 hover:brightness-[0.97] ${s.wrap}`}
                  >
                    <span className="shrink-0 opacity-70">{s.ic}</span>
                    {a.message}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Module cards ─────────────────────────────────────────── */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition:
                "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: "240ms",
            }}
          >
            {/* BMS */}
            <ModuleCard
              href="/dashboard/superadmin/bms"
              title="Business Management"
              subtitle="Lead · Closing · Omzet"
              icon={<IcBarChart />}
              topBar="bg-violet-400"
              btnBg="bg-violet-500 hover:bg-violet-600"
            >
              <StatRow
                label="Lead Masuk"
                value={bms.lead_masuk}
                delta={bms.lead_delta}
                hint="Total leads masuk hari ini dari semua channel"
              />
              <StatRow
                label="Closing"
                value={bms.closing}
                delta={bms.closing_delta}
                vc="text-emerald-600"
                hint="Jumlah closing yang berhasil dikonversi hari ini"
              />
              <StatRow
                label="Omzet Hari Ini"
                value={fmtRpShort(bms.omset)}
                hint="Total omzet dari closing hari ini"
              />
              <StatRow
                label="Conversion Rate"
                value={`${bms.cr.toFixed(1)}%`}
                hint="Persentase lead yang berhasil closing"
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
              topBar="bg-violet-300"
              btnBg="bg-violet-400 hover:bg-violet-500"
            >
              {/* Bullet bar — production target */}
              <div className="pb-3 mb-0.5 border-b border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] text-white/40">
                    Target Produksi
                  </p>
                  <p className="text-[11px] font-semibold text-cream tabular-nums">
                    {ops.produksi} / {ops.target} unit
                  </p>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(prodPct, 100)}%`,
                      background:
                        "linear-gradient(90deg, #c4b5fd, #a78bfa, #8b5cf6)",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-white/30 tabular-nums">
                    0
                  </span>
                  <span className="text-[10px] font-bold text-violet-500 tabular-nums">
                    {prodPct}%
                  </span>
                  <span className="text-[10px] text-white/30 tabular-nums">
                    {ops.target}
                  </span>
                </div>
              </div>
              <StatRow
                label="On-Time Delivery"
                value={`${ops.on_time_pct}%`}
                hint="Persentase order yang selesai tepat waktu"
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
                hint="Jumlah order yang masih dalam antrian produksi"
                vc={ops.backlog > 5 ? "text-rose-500" : "text-cream"}
              />
            </ModuleCard>
          </div>

          {/* ── Activity feed ─────────────────────────────────────────── */}
          <div
            className="bg-cocoa rounded-2xl border border-gold/10 overflow-hidden"
            style={{
              boxShadow: "0 1px 3px 0 rgba(201,162,39,0.05)",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition:
                "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: "320ms",
            }}
          >
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gold/10">
              <h3 className="text-[12px] font-semibold text-cream">
                Aktivitas Terkini
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] font-mono text-white/40">
                  Live
                </span>
              </div>
            </div>

            <div>
              {activity.length === 0 && isLoading ? (
                <p className="px-6 py-4 text-[11px] text-white/40">
                  Memuat aktivitas...
                </p>
              ) : activity.length === 0 ? (
                <p className="px-6 py-4 text-[11px] text-white/40">
                  Belum ada aktivitas tercatat.
                </p>
              ) : (
                activity.map((a, i) => {
                  const bmsRow = a.module === "bms";
                  const isLast = i === activity.length - 1;
                  return (
                    <div
                      key={a.id}
                      className="relative flex items-start gap-3 pl-10 pr-6 py-3 hover:bg-carbon/70 transition-colors group"
                    >
                      <div className="absolute left-6 top-0 bottom-0 flex flex-col items-center">
                        <span
                          className={`mt-3.5 w-2 h-2 rounded-full shrink-0 border-2 ${
                            bmsRow
                              ? "bg-violet-400 border-violet-400"
                              : "bg-cocoa border-gold"
                          }`}
                        />
                        {!isLast && (
                          <div className="w-px flex-1 bg-white/10 mt-1" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-white/30 w-9 shrink-0 tabular-nums pt-2.5">
                        {a.time}
                      </span>
                      <div>
                        <span className="text-[10px] font-semibold text-white/40 tracking-wide">
                          {bmsRow ? "BMS" : "OPR"}
                        </span>
                        <p className="text-[12px] text-white/70 leading-relaxed">
                          {a.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer note */}
          <p
            className="text-center text-[10px] font-mono text-white/30 pb-2"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition:
                "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: "400ms",
            }}
          >
            Superadmin — Akses penuh ke semua modul
          </p>
        </main>
      </div>
    </div>
  );
}
