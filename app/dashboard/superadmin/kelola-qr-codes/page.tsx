// app/dashboard/superadmin/kelola-qr/page.tsx

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import QRCodeLib from "qrcode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  role_group: "management" | "operational" | "production";
  description: string | null;
}

interface QRCode {
  id: string;
  role_id: string;
  role_name?: string;
  role_group?: string;
  workstation_name: string;
  location: string | null;
  qr_token: string;
  qr_payload: string;
  is_active: boolean;
  generated_at: string;
  expired_at: string | null;
}

interface ScanEvent {
  id: string;
  order_id: string;
  order_number: string;
  user_name: string;
  workstation_name: string;
  action: "open" | "submit" | "edit" | "read" | "delete" | "reject";
  scanned_at: string;
}

interface QRStats {
  total_workstations: number;
  active_workstations: number;
  operational_count: number;
  production_count: number;
  scans_today: number;
  scans_this_week: number;
  most_active_workstation: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_GROUP_STYLES: Record<
  string,
  { label: string; bg: string; border: string }
> = {
  management: {
    label: "Manajemen",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  operational: {
    label: "Operasional",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  production: {
    label: "Produksi",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
};

const ACTION_STYLES: Record<string, { label: string; color: string }> = {
  open: { label: "Buka", color: "bg-blue-50 text-blue-700" },
  submit: { label: "Submit", color: "bg-green-50 text-green-700" },
  edit: { label: "Edit", color: "bg-yellow-50 text-yellow-700" },
  read: { label: "Baca", color: "bg-gray-50 text-gray-700" },
  delete: { label: "Hapus", color: "bg-red-50 text-red-700" },
  reject: { label: "Tolak", color: "bg-orange-50 text-orange-700" },
};

type AlertState = {
  type: "success" | "error" | "warning" | "info";
  message: string;
} | null;

const EMPTY_GENERATE_FORM = {
  role_id: "",
  workstation_name: "",
  location: "",
};

// ─── QR Code Generator Component ──────────────────────────────────────────────

function QRCodeImage({
  data,
  size = 200,
  className = "",
}: {
  data: string;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCodeLib.toCanvas(canvasRef.current, data, {
        width: size,
        margin: 2,
        color: {
          dark: "#1e293b",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
    }
  }, [data, size]);

  return (
    <div className={className} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KelolaQRPage() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [stats, setStats] = useState<QRStats>({
    total_workstations: 0,
    active_workstations: 0,
    operational_count: 0,
    production_count: 0,
    scans_today: 0,
    scans_this_week: 0,
    most_active_workstation: null,
  });

  const [activeTab, setActiveTab] = useState<"workstations" | "scan-logs">(
    "workstations",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
  const [qrToDeactivate, setQrToDeactivate] = useState<QRCode | null>(null);
  const [qrToDelete, setQrToDelete] = useState<QRCode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoleGroup, setFilterRoleGroup] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [generateForm, setGenerateForm] = useState(EMPTY_GENERATE_FORM);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

  const showAlert = (
    type: NonNullable<AlertState>["type"],
    message: string,
  ) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchQRCodes = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") {
      params.append("is_active", filterStatus === "active" ? "true" : "false");
    }
    if (filterRoleGroup) {
      params.append("role_group", filterRoleGroup);
    }

    const res = await fetch(`/api/qr-codes?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      showAlert("error", json.error || "Gagal memuat data QR Code");
      return;
    }
    setQrCodes(json.data ?? []);
  }, [filterStatus, filterRoleGroup]);

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/roles");
    const json = await res.json();
    if (!res.ok) {
      showAlert("error", json.error || "Gagal memuat data role");
      return;
    }
    const filteredRoles = (json.data ?? []).filter((r: Role) =>
      ["operational", "production"].includes(r.role_group),
    );
    setRoles(filteredRoles);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchQRCodes(), fetchRoles()]);
      setIsLoading(false);
    };
    load();
  }, [fetchQRCodes, fetchRoles]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenGenerateModal = () => {
    setGenerateForm(EMPTY_GENERATE_FORM);
    setIsModalOpen(true);
  };

  const handleGenerateQR = async () => {
    if (!generateForm.role_id) {
      showAlert("error", "Role harus dipilih");
      return;
    }
    if (!generateForm.workstation_name.trim()) {
      showAlert("error", "Nama workstation harus diisi");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: generateForm.role_id,
          workstation_name: generateForm.workstation_name.trim(),
          location: generateForm.location.trim() || null,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        showAlert("error", json.error || "Gagal membuat QR Code");
        return;
      }

      const roleName =
        roles.find((r) => r.id === generateForm.role_id)?.name || "";
      showAlert(
        "success",
        `QR Code untuk ${roleName} - ${generateForm.workstation_name} berhasil dibuat!`,
      );
      setIsModalOpen(false);
      setGenerateForm(EMPTY_GENERATE_FORM);
      await fetchQRCodes();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleStatus = async (qr: QRCode) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/qr-codes?id=${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !qr.is_active }),
      });
      const json = await res.json();

      if (!res.ok) {
        showAlert("error", json.error || "Gagal mengubah status QR Code");
        return;
      }

      showAlert(
        "success",
        `QR Code ${qr.workstation_name} ${!qr.is_active ? "diaktifkan" : "dinonaktifkan"}`,
      );
      await fetchQRCodes();
    } finally {
      setIsProcessing(false);
      setQrToDeactivate(null);
    }
  };

  const handleDeleteQR = async () => {
    if (!qrToDelete) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/qr-codes?id=${qrToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        showAlert("error", json.error || "Gagal menghapus QR Code");
        return;
      }

      showAlert(
        "success",
        `QR Code ${qrToDelete.workstation_name} berhasil dihapus`,
      );
      await fetchQRCodes();
    } finally {
      setIsProcessing(false);
      setQrToDelete(null);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!selectedQR) return;

    // Cari canvas di dalam modal detail
    const canvas = document.querySelector(
      "#qr-detail-canvas canvas",
    ) as HTMLCanvasElement;

    if (canvas) {
      const link = document.createElement("a");
      link.download = `QR-${selectedQR.workstation_name.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) return "Baru saja";
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} minggu lalu`;
  };

  const getStatusBadge = (qr: QRCode) => {
    const config = qr.is_active
      ? {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "Aktif",
          dot: "bg-emerald-500",
        }
      : {
          bg: "bg-slate-50 text-slate-600 border-slate-200",
          label: "Nonaktif",
          dot: "bg-slate-400",
        };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  };

  const getRoleGroupBadge = (group: string) => {
    const config = ROLE_GROUP_STYLES[group] || {
      label: group,
      bg: "bg-gray-50",
      border: "border-gray-200",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${config.bg} ${config.border}`}
      >
        {config.label}
      </span>
    );
  };

  const getActionBadge = (action: string) => {
    const config = ACTION_STYLES[action] || {
      label: action,
      color: "bg-gray-50 text-gray-700",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const filteredQRCodes = qrCodes.filter((qr) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      qr.workstation_name.toLowerCase().includes(search) ||
      qr.role_name?.toLowerCase().includes(search) ||
      qr.location?.toLowerCase().includes(search) ||
      qr.qr_token.toLowerCase().includes(search)
    );
  });

  const groupedQRCodes = {
    operational: filteredQRCodes.filter(
      (qr) => qr.role_group === "operational",
    ),
    production: filteredQRCodes.filter((qr) => qr.role_group === "production"),
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data QR Code..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-1.5">
                  Manajemen QR Code
                </h2>
                <p className="text-gray-500 text-sm">
                  Kelola QR Code untuk setiap posisi dan workstation produksi
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleOpenGenerateModal}
                leftIcon={<PlusIcon />}
              >
                Buat QR Code
              </Button>
            </div>

            {/* Alert */}
            {alert && (
              <div className="mb-5 animate-slide-down">
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                  autoClose
                  duration={4000}
                />
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 border border-stone-200 border-l-4 border-l-stone-400 shadow-sm">
                <p className="text-gray-500 text-xs mb-1.5">
                  Total Workstation
                </p>
                <p className="text-2xl font-semibold text-gray-800">
                  {stats.total_workstations}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-gray-500 text-xs mb-1.5">Aktif</p>
                <p className="text-2xl font-semibold text-emerald-600">
                  {stats.active_workstations}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-t-2 border-t-blue-400">
                <p className="text-gray-500 text-xs mb-1.5">Operasional</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {stats.operational_count}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-t-2 border-t-amber-400">
                <p className="text-gray-500 text-xs mb-1.5">Produksi</p>
                <p className="text-2xl font-semibold text-amber-600">
                  {stats.production_count}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-gray-500 text-xs mb-1.5">Scan Hari Ini</p>
                <p className="text-2xl font-semibold text-indigo-600">
                  {stats.scans_today}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-5">
              <nav className="flex gap-8">
                {(["workstations", "scan-logs"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3.5 px-1 font-medium text-sm transition-colors ${
                      activeTab === tab
                        ? "text-indigo-600 border-b-2 border-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "workstations" ? "QR Code" : "Riwayat Aktivitas"}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab: QR Workstation */}
            {activeTab === "workstations" && (
              <>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Cari workstation, role, atau lokasi..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg 
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as typeof filterStatus)
                    }
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                      focus:ring-2 focus:ring-indigo-200 outline-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>

                  <select
                    value={filterRoleGroup}
                    onChange={(e) => setFilterRoleGroup(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                      focus:ring-2 focus:ring-indigo-200 outline-none min-w-[140px]"
                  >
                    <option value="">Semua Grup Role</option>
                    <option value="operational">Operasional</option>
                    <option value="production">Produksi</option>
                  </select>

                  {(searchTerm ||
                    filterStatus !== "all" ||
                    filterRoleGroup) && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterStatus("all");
                        setFilterRoleGroup("");
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                {/* QR Code Cards Grid */}
                {filteredQRCodes.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <p className="text-gray-500 text-sm">
                      {searchTerm || filterStatus !== "all" || filterRoleGroup
                        ? "Tidak ada QR Code yang sesuai dengan filter."
                        : "Belum ada QR Code. Klik 'Buat QR Code' untuk membuat."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedQRCodes.operational.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-3">
                          Operasional
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedQRCodes.operational.map((qr) => (
                            <QRCodeCard
                              key={qr.id}
                              qr={qr}
                              onView={() => setSelectedQR(qr)}
                              onToggleStatus={() => handleToggleStatus(qr)}
                              onDelete={() => setQrToDelete(qr)}
                              getStatusBadge={getStatusBadge}
                              getRoleGroupBadge={getRoleGroupBadge}
                              formatRelativeTime={formatRelativeTime}
                              isProcessing={isProcessing}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedQRCodes.production.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-3">
                          Produksi
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedQRCodes.production.map((qr) => (
                            <QRCodeCard
                              key={qr.id}
                              qr={qr}
                              onView={() => setSelectedQR(qr)}
                              onToggleStatus={() => handleToggleStatus(qr)}
                              onDelete={() => setQrToDelete(qr)}
                              getStatusBadge={getStatusBadge}
                              getRoleGroupBadge={getRoleGroupBadge}
                              formatRelativeTime={formatRelativeTime}
                              isProcessing={isProcessing}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tab: Riwayat Aktivitas */}
            {activeTab === "scan-logs" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                      <tr>
                        {["Waktu", "Workstation", "Order", "User", "Aksi"].map(
                          (header) => (
                            <th
                              key={header}
                              className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scanEvents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-12 text-center text-gray-400 text-sm"
                          >
                            Belum ada aktivitas scan.
                          </td>
                        </tr>
                      ) : (
                        scanEvents.map((event) => (
                          <tr key={event.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3.5">
                              <div className="text-sm text-gray-700">
                                {formatDate(event.scanned_at)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatRelativeTime(event.scanned_at)}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-medium text-gray-800">
                                {event.workstation_name}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-mono text-gray-700">
                                {event.order_number}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-700">
                                {event.user_name}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {getActionBadge(event.action)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal Generate QR */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isGenerating && setIsModalOpen(false)}
        title="Buat QR Code Baru"
        size="md"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role / Posisi
            </label>
            <select
              value={generateForm.role_id}
              onChange={(e) =>
                setGenerateForm({ ...generateForm, role_id: e.target.value })
              }
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg 
                focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none bg-white"
              disabled={isGenerating}
            >
              <option value="">Pilih Role</option>
              {(["operational", "production"] as const).map((group) => {
                const groupRoles = roles.filter((r) => r.role_group === group);
                if (groupRoles.length === 0) return null;
                return (
                  <optgroup key={group} label={ROLE_GROUP_STYLES[group]?.label}>
                    {groupRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <Input
            label="Nama Workstation"
            value={generateForm.workstation_name}
            onChange={(e) =>
              setGenerateForm({
                ...generateForm,
                workstation_name: e.target.value,
              })
            }
            placeholder="Contoh: Meja Racik 1, Mesin Laser 2, Area Lebur"
            disabled={isGenerating}
          />

          <Input
            label="Lokasi (Opsional)"
            value={generateForm.location}
            onChange={(e) =>
              setGenerateForm({ ...generateForm, location: e.target.value })
            }
            placeholder="Contoh: Lantai 1 - Area Produksi"
            disabled={isGenerating}
          />

          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <span className="font-medium">Info:</span> QR Code ini akan
            digunakan di workstation. Pekerja akan scan QR ini untuk mencatat
            aktivitas pengerjaan order.
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isGenerating}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateQR}
              isLoading={isGenerating}
              disabled={
                !generateForm.role_id || !generateForm.workstation_name.trim()
              }
            >
              Buat QR Code
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail QR */}
      <Modal
        isOpen={!!selectedQR}
        onClose={() => { setSelectedQR(null); setCopiedLink(false); }}
        title="Detail QR Code"
        size="sm"
      >
        {selectedQR && (
          <div className="space-y-5">
            {/* QR Code Image */}
            <div id="qr-detail-canvas">
              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <QRCodeImage
                    data={selectedQR.qr_payload || selectedQR.qr_token}
                    size={220}
                  />
                </div>
              </div>
            </div>

            {/* Detail Info */}
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Workstation</span>
                <span className="font-medium text-gray-800">
                  {selectedQR.workstation_name}
                </span>
              </div>
              <div className="flex justify-between py-2 px-3">
                <span className="text-gray-500">Role</span>
                <span className="font-medium text-gray-800">
                  {selectedQR.role_name}
                </span>
              </div>
              <div className="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Grup Role</span>
                {getRoleGroupBadge(selectedQR.role_group || "")}
              </div>
              {selectedQR.location && (
                <div className="flex justify-between py-2 px-3">
                  <span className="text-gray-500">Lokasi</span>
                  <span className="text-gray-700">{selectedQR.location}</span>
                </div>
              )}
              <div className="py-2.5 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Link QR</span>
                  <button
                    onClick={() => handleCopyLink(selectedQR.qr_payload)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                      copiedLink
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-white text-indigo-600 border border-gray-200 hover:bg-indigo-50"
                    }`}
                  >
                    {copiedLink ? "✓ Tersalin!" : "Salin"}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-gray-600 break-all leading-relaxed">
                  {selectedQR.qr_payload}
                </p>
              </div>
              <div className="flex justify-between py-2 px-3">
                <span className="text-gray-500">Status</span>
                {getStatusBadge(selectedQR)}
              </div>
              <div className="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Dibuat</span>
                <span className="text-gray-700">
                  {formatDate(selectedQR.generated_at)}
                </span>
              </div>
              {selectedQR.expired_at && (
                <div className="flex justify-between py-2 px-3">
                  <span className="text-gray-500">Kadaluarsa</span>
                  <span className="text-gray-700">
                    {formatDate(selectedQR.expired_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="secondary"
                onClick={handleDownloadQR}
                leftIcon={<DownloadIcon />}
                className="flex-1"
              >
                Download
              </Button>
              <Button
                variant="primary"
                onClick={() => setSelectedQR(null)}
                className="flex-1"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={!!qrToDeactivate}
        variant="warning"
        title={
          qrToDeactivate?.is_active
            ? "Nonaktifkan QR Code?"
            : "Aktifkan QR Code?"
        }
        message={
          qrToDeactivate
            ? qrToDeactivate.is_active
              ? `QR Code untuk "${qrToDeactivate.workstation_name}" (${qrToDeactivate.role_name}) akan dinonaktifkan.`
              : `QR Code untuk "${qrToDeactivate.workstation_name}" (${qrToDeactivate.role_name}) akan diaktifkan kembali.`
            : ""
        }
        confirmText={
          qrToDeactivate?.is_active ? "Ya, Nonaktifkan" : "Ya, Aktifkan"
        }
        cancelText="Batal"
        isLoading={isProcessing}
        onConfirm={() => qrToDeactivate && handleToggleStatus(qrToDeactivate)}
        onCancel={() => !isProcessing && setQrToDeactivate(null)}
      />

      <ConfirmDialog
        isOpen={!!qrToDelete}
        variant="danger"
        title="Hapus QR Code?"
        message={
          qrToDelete
            ? `QR Code untuk "${qrToDelete.workstation_name}" (${qrToDelete.role_name}) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isProcessing}
        onConfirm={handleDeleteQR}
        onCancel={() => !isProcessing && setQrToDelete(null)}
      />
    </>
  );
}

// ─── QR Code Card Component ───────────────────────────────────────────────────

interface QRCodeCardProps {
  qr: QRCode;
  onView: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  getStatusBadge: (qr: QRCode) => React.ReactNode;
  getRoleGroupBadge: (group: string) => React.ReactNode;
  formatRelativeTime: (iso: string) => string;
  isProcessing: boolean;
}

function QRCodeCard({
  qr,
  onView,
  onToggleStatus,
  onDelete,
  getStatusBadge,
  getRoleGroupBadge,
  formatRelativeTime,
  isProcessing,
}: QRCodeCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="p-5">
        {/* Header dengan QR preview */}
        <div className="flex items-start gap-3 mb-4">
          {/* Icon QR sebagai ganti preview */}
          <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v1m6 11h2m-6 0h-2.48a2.5 2.5 0 00-4.52 0H4m16 0a2.5 2.5 0 00-4.52 0H15m-6 0H6.48"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 8h.01M12 8h.01M16 8h.01M8 8a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </div>

          {/* Info dan Status */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-gray-800 truncate text-sm">
                  {qr.workstation_name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">{qr.role_name}</p>
              </div>
              {getStatusBadge(qr)}
            </div>
          </div>
        </div>

        {/* Info tambahan */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            {getRoleGroupBadge(qr.role_group || "")}
          </div>
          {qr.location && (
            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
              <svg
                className="w-3 h-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {qr.location}
            </p>
          )}
          <p className="text-xs text-gray-400">
            Dibuat {formatRelativeTime(qr.generated_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onView}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Lihat detail"
            disabled={isProcessing}
          >
            <EyeIcon />
            <span>Detail</span>
          </button>

          <button
            onClick={onToggleStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              qr.is_active
                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            }`}
            title={qr.is_active ? "Nonaktifkan" : "Aktifkan"}
            disabled={isProcessing}
          >
            <PowerIcon />
            <span>{qr.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
          </button>

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
            title="Hapus QR"
            disabled={isProcessing}
          >
            <TrashIcon />
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>
  );
}
