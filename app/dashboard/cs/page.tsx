// app/dashboard/cs/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CS_ROUTES } from "@/lib/routes";
import type { CsOrder } from "@/types/cs-orders";

// ── Types ──────────────────────────────────────────────────────────────────

interface StatsData {
  branch: { id: string; name: string; code: string } | null;
  summary: {
    totalLeadMasuk: number;
    totalClosing: number;
    conversionRate: number;
  };
  period: { daysWithInput: number };
  today: { hasInput: boolean; leadMasuk: number; closing: number };
}

interface RecentInput {
  id: string;
  input_date: string;
  lead_masuk: number;
  closing: number;
  notes: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CSDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentInputs, setRecentInputs] = useState<RecentInput[]>([]);
  const [orders, setOrders] = useState<CsOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientUser = getClientUser();
    if (!clientUser) {
      router.push("/login");
      return;
    }
    setUser(clientUser);

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [statsRes, inputsRes, ordersRes] = await Promise.all([
          fetch("/api/cs/stats"),
          fetch("/api/cs/inputs?limit=7"),
          fetch("/api/cs/orders"),
        ]);
        if (!statsRes.ok)
          throw new Error(
            (await statsRes.json()).error || "Gagal memuat stats",
          );
        if (!inputsRes.ok)
          throw new Error(
            (await inputsRes.json()).error || "Gagal memuat riwayat",
          );
        if (!ordersRes.ok)
          throw new Error(
            (await ordersRes.json()).error || "Gagal memuat orders",
          );

        const [s, i, o] = await Promise.all([
          statsRes.json(),
          inputsRes.json(),
          ordersRes.json(),
        ]);
        setStats(s.data);
        setRecentInputs(i.data || []);
        setOrders(o.data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  // ── Derived order data ───────────────────────────────────────────────────

  const thisMonth = new Date().toISOString().slice(0, 7);
  const pending = orders.filter((o) => o.form_status === "pending");
  const submitted = orders.filter((o) => o.form_status === "submitted");
  const reviewed = orders.filter((o) => o.form_status === "reviewed");
  const converted = orders.filter((o) => o.form_status === "converted");
  const bulanIni = orders.filter((o) => o.created_at?.startsWith(thisMonth));
  const recentOrders = [...orders].slice(0, 5);

  const pipelineTotal = orders.length || 1;

  // Orders submitted but not yet reviewed (needs attention)
  const needsReview = submitted.length;

  // Oldest pending order (how many days waiting)
  const oldestPending =
    pending.length > 0
      ? Math.floor(
          (Date.now() -
            new Date(pending[pending.length - 1].created_at).getTime()) /
            86400000,
        )
      : null;

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="customer_service" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={user?.email || ""} role="customer_service" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat dashboard..." />
          </main>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="customer_service" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={user.email} role="customer_service" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          {/* ── Greeting ── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {stats?.branch?.name ? ` · Cabang ${stats.branch.name}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(CS_ROUTES.INPUT_LEADS)}
              >
                Input Leads
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(CS_ROUTES.INPUT_ORDER)}
              >
                + Buat Order
              </Button>
            </div>
          </div>

          {/* ── Action alerts ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leads alert */}
            {!stats?.today.hasInput ? (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    Belum input leads hari ini
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Data leads & closing hari ini belum tercatat.
                  </p>
                </div>
                <button
                  onClick={() => router.push(CS_ROUTES.INPUT_LEADS)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap"
                >
                  Input →
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">
                    Leads hari ini sudah diinput
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Lead masuk: <strong>{stats.today.leadMasuk}</strong> ·
                    Closing: <strong>{stats.today.closing}</strong>
                  </p>
                </div>
                <button
                  onClick={() => router.push(CS_ROUTES.INPUT_LEADS)}
                  className="text-xs font-semibold text-green-700 hover:text-green-900 whitespace-nowrap"
                >
                  Edit →
                </button>
              </div>
            )}

            {/* Order review alert */}
            {needsReview > 0 ? (
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800">
                    {needsReview} form perlu direview
                  </p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Pelanggan sudah mengisi form, menunggu review CS.
                  </p>
                </div>
                <button
                  onClick={() => router.push(CS_ROUTES.INPUT_ORDER)}
                  className="text-xs font-semibold text-orange-700 hover:text-orange-900 whitespace-nowrap"
                >
                  Review →
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-600">
                    Semua form sudah direview
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tidak ada form yang menunggu review saat ini.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Order pipeline ── */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-700">
                  Pipeline Order
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {orders.length} total order · bulan ini {bulanIni.length} baru
                </p>
              </div>
              <button
                onClick={() => router.push(CS_ROUTES.INPUT_ORDER)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                Kelola order →
              </button>
            </div>

            {/* Pipeline stages */}
            <div className="flex items-stretch gap-2">
              {[
                {
                  label: "Menunggu Pengisian",
                  count: pending.length,
                  color: "bg-amber-500",
                  light: "bg-amber-50",
                  text: "text-amber-700",
                  desc: "Link dikirim, form belum diisi",
                },
                {
                  label: "Terisi Pelanggan",
                  count: submitted.length,
                  color: "bg-orange-500",
                  light: "bg-orange-50",
                  text: "text-orange-700",
                  desc: "Pelanggan sudah mengisi form",
                },
                {
                  label: "Sudah Direview",
                  count: reviewed.length,
                  color: "bg-blue-500",
                  light: "bg-blue-50",
                  text: "text-blue-700",
                  desc: "CS sudah review & verifikasi",
                },
                {
                  label: "Dikonversi",
                  count: converted.length,
                  color: "bg-green-500",
                  light: "bg-green-50",
                  text: "text-green-700",
                  desc: "Order masuk ke produksi",
                },
              ].map((stage, idx) => (
                <div key={idx} className="flex items-center flex-1 gap-2">
                  <div
                    className={`flex-1 ${stage.light} rounded-xl p-4 border border-opacity-20`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600 leading-tight">
                        {stage.label}
                      </p>
                      <span className={`text-2xl font-bold ${stage.text}`}>
                        {stage.count}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-full transition-all`}
                        style={{
                          width: `${Math.round((stage.count / pipelineTotal) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">{stage.desc}</p>
                  </div>
                  {idx < 3 && (
                    <svg
                      className="w-4 h-4 text-gray-300 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {/* Warning if oldest pending is very old */}
            {oldestPending !== null && oldestPending >= 3 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Ada order yang sudah menunggu pengisian selama{" "}
                <strong className="mx-1">{oldestPending} hari</strong> —
                pertimbangkan follow-up ke pelanggan.
              </div>
            )}
          </div>

          {/* ── Two columns: Leads performance + Recent orders ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Leads performance */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-700">
                    Performa Leads — Bulan Ini
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {stats?.period.daysWithInput ?? 0} hari tercatat
                  </p>
                </div>
                <button
                  onClick={() => router.push(CS_ROUTES.INPUT_LEADS)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Input leads →
                </button>
              </div>

              {/* Main metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-700">
                    {stats?.summary.totalLeadMasuk ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Lead Masuk</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-700">
                    {stats?.summary.totalClosing ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Closing</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-xl">
                  <p className="text-2xl font-bold text-purple-700">
                    {(stats?.summary.conversionRate ?? 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">CR</p>
                </div>
              </div>

              {/* Recent inputs mini-list */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Input Terakhir
              </p>
              <div className="space-y-1">
                {recentInputs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">
                    Belum ada data input.
                  </p>
                ) : (
                  recentInputs.slice(0, 5).map((item) => {
                    const cr =
                      item.lead_masuk > 0
                        ? (item.closing / item.lead_masuk) * 100
                        : 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-xs text-gray-500">
                          {fmtDate(item.input_date)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-700">
                            <span className="font-medium">
                              {item.lead_masuk}
                            </span>{" "}
                            lead
                          </span>
                          <span className="text-xs text-gray-700">
                            <span className="font-medium">{item.closing}</span>{" "}
                            closing
                          </span>
                          <span
                            className={`text-xs font-bold w-12 text-right ${cr >= 30 ? "text-green-600" : cr >= 20 ? "text-yellow-600" : "text-red-500"}`}
                          >
                            {cr.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-700">
                    Order Terbaru
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {bulanIni.length} order dibuat bulan ini
                  </p>
                </div>
                <button
                  onClick={() => router.push(CS_ROUTES.INPUT_ORDER)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Lihat semua →
                </button>
              </div>

              <div className="space-y-2">
                {recentOrders.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400 mb-3">
                      Belum ada order dibuat.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(CS_ROUTES.INPUT_ORDER)}
                    >
                      Buat Order Pertama
                    </Button>
                  </div>
                ) : (
                  recentOrders.map((order) => {
                    const statusMap = {
                      pending: {
                        label: "Menunggu",
                        dot: "bg-amber-400",
                        badge: "bg-amber-100 text-amber-700",
                      },
                      submitted: {
                        label: "Perlu Review",
                        dot: "bg-orange-500",
                        badge: "bg-orange-100 text-orange-700",
                      },
                      reviewed: {
                        label: "Direview",
                        dot: "bg-blue-500",
                        badge: "bg-blue-100 text-blue-700",
                      },
                      converted: {
                        label: "Dikonversi",
                        dot: "bg-green-500",
                        badge: "bg-green-100 text-green-700",
                      },
                    };
                    const st = statusMap[order.form_status];
                    return (
                      <div
                        key={order.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                        onClick={() => router.push(CS_ROUTES.INPUT_ORDER)}
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {order.customer_name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {order.order_number}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.badge}`}
                          >
                            {st.label}
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {fmtDate(order.tgl_chat)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
