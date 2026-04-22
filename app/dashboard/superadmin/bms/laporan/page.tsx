// app/dashboard/superadmin/laporan/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getClientUser, type ClientUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  title: string;
  type: "monthly" | "quarterly" | "yearly";
  period: string;
  file_url: string | null;
  file_size: number | null;
  status: "ready" | "processing" | "failed";
  generated_at: string;
  users: { full_name: string } | null;
}

type AlertState = { type: "success" | "error" | "warning" | "info"; message: string } | null;
type ReportType = "monthly" | "quarterly" | "yearly";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function buildTitle(type: ReportType, period: string): string {
  if (type === "monthly") {
    const [year, month] = period.split("-");
    return `Laporan Bulanan ${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
  }
  if (type === "quarterly") {
    const [year, q] = period.split("-");
    return `Laporan Triwulan ${q.replace("Q", "")} ${year}`;
  }
  return `Laporan Tahunan ${period}`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LaporanPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filterType, setFilterType] = useState<"all" | ReportType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);

  // Form state — defaults safe for SSR (no Date.now())
  const [formType, setFormType] = useState<ReportType>("monthly");
  const [formPeriod, setFormPeriod] = useState("2026-04");

  useEffect(() => {
    setClientUser(getClientUser());
    // Set default period to current month after hydration
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    setFormPeriod(`${y}-${m}`);
  }, []);

  // Sync period default when type changes
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    if (formType === "monthly") {
      setFormPeriod(`${y}-${String(m).padStart(2, "0")}`);
    } else if (formType === "quarterly") {
      const q = Math.ceil(m / 3);
      setFormPeriod(`${y}-Q${q}`);
    } else {
      setFormPeriod(String(y));
    }
  }, [formType]);

  const showAlert = (type: NonNullable<AlertState>["type"], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    const url =
      filterType === "all" ? "/api/reports" : `/api/reports?type=${filterType}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      showAlert("error", json.error || "Gagal memuat laporan");
      return;
    }
    setReports(json.data ?? []);
  }, [filterType]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchReports();
      setIsLoading(false);
    };
    load();
  }, [fetchReports]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!formPeriod) {
      showAlert("error", "Periode harus dipilih");
      return;
    }
    setIsGenerating(true);
    try {
      const title = buildTitle(formType, formPeriod);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: formType, period: formPeriod, title }),
      });
      const json = await res.json();
      if (!res.ok) {
        showAlert("error", json.error || "Gagal membuat laporan");
        return;
      }
      showAlert("success", `${title} berhasil dibuat!`);
      await fetchReports();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/reports/${reportToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showAlert("error", json.error || "Gagal menghapus laporan");
        return;
      }
      showAlert("success", `Laporan "${reportToDelete.title}" berhasil dihapus!`);
      await fetchReports();
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  const handleExport = (type: "cs" | "marketing" | "complete") => {
    window.location.href = `/api/reports/export?type=${type}`;
  };

  // ─── Derived stats ─────────────────────────────────────────────────────────

  const stats = {
    total: reports.length,
    ready: reports.filter((r) => r.status === "ready").length,
    processing: reports.filter((r) => r.status === "processing").length,
    failed: reports.filter((r) => r.status === "failed").length,
  };

  // ─── Year options for yearly selector ─────────────────────────────────────

  const yearOptions = [2024, 2025, 2026, 2027];

  // ─── Quarterly options ─────────────────────────────────────────────────────

  const quarterOptions = [
    { value: "2025-Q1", label: "Triwulan 1 (Jan–Mar) 2025" },
    { value: "2025-Q2", label: "Triwulan 2 (Apr–Jun) 2025" },
    { value: "2025-Q3", label: "Triwulan 3 (Jul–Sep) 2025" },
    { value: "2025-Q4", label: "Triwulan 4 (Okt–Des) 2025" },
    { value: "2026-Q1", label: "Triwulan 1 (Jan–Mar) 2026" },
    { value: "2026-Q2", label: "Triwulan 2 (Apr–Jun) 2026" },
    { value: "2026-Q3", label: "Triwulan 3 (Jul–Sep) 2026" },
    { value: "2026-Q4", label: "Triwulan 4 (Okt–Des) 2026" },
  ];

  // ─── Badge helpers ─────────────────────────────────────────────────────────

  const getStatusBadge = (status: Report["status"]) => {
    const map = {
      ready: { bg: "bg-green-100 text-green-800", dot: "bg-green-500", label: "Siap" },
      processing: { bg: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500", label: "Diproses" },
      failed: { bg: "bg-red-100 text-red-800", dot: "bg-red-500", label: "Gagal" },
    };
    const { bg, dot, label } = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </span>
    );
  };

  const getTypeBadge = (type: Report["type"]) => {
    const map = {
      monthly: { bg: "bg-blue-100 text-blue-800", label: "Bulanan" },
      quarterly: { bg: "bg-purple-100 text-purple-800", label: "Triwulan" },
      yearly: { bg: "bg-orange-100 text-orange-800", label: "Tahunan" },
    };
    const { bg, label } = map[type];
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${bg}`}>{label}</span>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">

            {/* Page header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Laporan & Ekspor Data
              </h2>
              <p className="text-gray-500 text-sm">
                Generate, kelola, dan unduh laporan performa bisnis
              </p>
            </div>

            {/* Alert */}
            {alert && (
              <div className="mb-6 animate-slide-down">
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                  autoClose
                  duration={4000}
                />
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Laporan", value: stats.total, color: "border-indigo-400", textColor: "text-indigo-600" },
                { label: "Siap Diunduh", value: stats.ready, color: "border-green-400", textColor: "text-green-600" },
                { label: "Sedang Diproses", value: stats.processing, color: "border-yellow-400", textColor: "text-yellow-600" },
                { label: "Gagal", value: stats.failed, color: "border-red-400", textColor: "text-red-600" },
              ].map(({ label, value, color, textColor }) => (
                <div key={label} className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${color}`}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Top section: Generate + Export */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">

              {/* Generate form — 3 cols */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-800">Generate Laporan Baru</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipe Laporan</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as ReportType)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                      disabled={isGenerating}
                    >
                      <option value="monthly">Bulanan</option>
                      <option value="quarterly">Triwulan</option>
                      <option value="yearly">Tahunan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Periode</label>
                    {formType === "monthly" && (
                      <input
                        type="month"
                        value={formPeriod}
                        onChange={(e) => setFormPeriod(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        disabled={isGenerating}
                      />
                    )}
                    {formType === "quarterly" && (
                      <select
                        value={formPeriod}
                        onChange={(e) => setFormPeriod(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={isGenerating}
                      >
                        {quarterOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    )}
                    {formType === "yearly" && (
                      <select
                        value={formPeriod}
                        onChange={(e) => setFormPeriod(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={isGenerating}
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="primary"
                      onClick={handleGenerate}
                      isLoading={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? "Memproses..." : "Generate"}
                    </Button>
                  </div>
                </div>

                {formPeriod && (
                  <div className="bg-indigo-50 rounded-lg px-4 py-2.5 text-sm text-indigo-700">
                    <span className="font-medium">Preview judul: </span>
                    {buildTitle(formType, formPeriod)}
                  </div>
                )}
              </div>

              {/* Export shortcuts — 2 cols */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                {[
                  {
                    label: "Ekspor Data CS",
                    desc: "Lead & closing per cabang",
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                    gradient: "from-blue-500 to-blue-600",
                    action: () => handleExport("cs"),
                  },
                  {
                    label: "Ekspor Data Marketing",
                    desc: "Channel & performa marketing",
                    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                    gradient: "from-green-500 to-green-600",
                    action: () => handleExport("marketing"),
                  },
                  {
                    label: "Ekspor Data Lengkap",
                    desc: "Semua data dalam satu file",
                    icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
                    gradient: "from-purple-500 to-purple-600",
                    action: () => handleExport("complete"),
                  },
                ].map(({ label, desc, icon, gradient, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={`flex items-center gap-4 w-full bg-gradient-to-r ${gradient} text-white rounded-xl px-5 py-4 hover:opacity-90 transition-opacity text-left shadow-sm`}
                  >
                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-white/80">{desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Reports list */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* List header with filter */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-800">Riwayat Laporan</h3>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
                  {([
                    { value: "all", label: "Semua" },
                    { value: "monthly", label: "Bulanan" },
                    { value: "quarterly", label: "Triwulan" },
                    { value: "yearly", label: "Tahunan" },
                  ] as { value: "all" | ReportType; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFilterType(value)}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        filterType === value
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="p-8">
                  <Loading variant="skeleton" text="Memuat laporan..." />
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg className="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium">Belum ada laporan</p>
                  <p className="text-xs mt-1">Generate laporan pertama Anda di atas</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="px-6 py-4 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          {/* Icon */}
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 text-sm">{report.title}</h4>
                              {getTypeBadge(report.type)}
                              {getStatusBadge(report.status)}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                              <span>
                                Dibuat oleh: <span className="text-gray-600">{report.users?.full_name ?? "—"}</span>
                              </span>
                              <span>•</span>
                              <span>{formatDate(report.generated_at)}</span>
                              {report.file_size && (
                                <>
                                  <span>•</span>
                                  <span>{formatFileSize(report.file_size)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {report.file_url ? (
                            <a
                              href={report.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </span>
                          )}
                          <button
                            onClick={() => setReportToDelete(report)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus laporan"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </main>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!reportToDelete}
        variant="danger"
        title="Hapus laporan ini?"
        message={
          reportToDelete
            ? `Laporan "${reportToDelete.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => !isDeleting && setReportToDelete(null)}
      />
    </>
  );
}
