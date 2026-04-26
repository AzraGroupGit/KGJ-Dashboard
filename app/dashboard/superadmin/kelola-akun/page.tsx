// app/dashboard/superadmin/kelola-akun/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchRef {
  id: string;
  name: string;
  code: string;
}

interface RoleOPRPRD {
  id: string;
  name: string;
  role_group:
    | "management"
    | "operational"
    | "production"
    | "marketing"
    | "customer_service";
  description: string | null;
  permissions: {
    can_read: boolean;
    can_insert: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
  allowed_stages: string[];
}

interface UnifiedUser {
  id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  role: "superadmin" | "customer_service" | "marketing" | null;
  roles: RoleOPRPRD | null;
  role_id: string | null;
  branch_id: string | null;
  branches: BranchRef | null;
  status: "active" | "inactive" | null;
  is_active: boolean;
  last_login: string | null;
  last_login_at: string | null;
  created_at: string;
  userType: "bms" | "oprprd";
}

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  pic: string | null;
  status: "active" | "inactive";
  total_leads: number;
  total_closing: number;
  created_at: string;
}

type AlertState = {
  type: "success" | "error" | "warning" | "info";
  message: string;
} | null;

type UserSegment = "all" | "bms" | "operational" | "production";
type NewUserType = "bms" | "oprprd" | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const BMS_ROLES = ["superadmin", "customer_service", "marketing"] as const;

const ROLE_GROUP_LABELS: Record<string, { label: string; bg: string }> = {
  management: { label: "Manajemen", bg: "bg-purple-100 text-purple-800" },
  operational: { label: "Operasional", bg: "bg-blue-100 text-blue-800" },
  production: { label: "Produksi", bg: "bg-amber-100 text-amber-800" },
};

const SEGMENT_OPTIONS: { value: UserSegment; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "bms", label: "BMS (Admin, CS, Marketing)" },
  { value: "operational", label: "Operasional" },
  { value: "production", label: "Produksi" },
];

// ─── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_BMS_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "customer_service" as "superadmin" | "customer_service" | "marketing",
  branch_id: "",
};

const EMPTY_OPRPRD_FORM = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_id: "",
};

const EMPTY_BRANCH_FORM = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  pic: "",
  status: "active" as Branch["status"],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function KelolaAkunPage() {
  const [activeTab, setActiveTab] = useState<"users" | "branches">("users");
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<AlertState>(null);

  const [allUsers, setAllUsers] = useState<UnifiedUser[]>([]);
  const [roles, setRoles] = useState<RoleOPRPRD[]>([]);
  const [segment, setSegment] = useState<UserSegment>("all");
  const [showInactive, setShowInactive] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [newUserType, setNewUserType] = useState<NewUserType>(null);

  const [bmsForm, setBmsForm] = useState(EMPTY_BMS_FORM);
  const [oprprdForm, setOprprdForm] = useState(EMPTY_OPRPRD_FORM);

  const [userToDelete, setUserToDelete] = useState<UnifiedUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH_FORM);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showAlert = (
    type: NonNullable<AlertState>["type"],
    message: string,
  ) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Terjemahkan pesan error API → pesan ramah pengguna
  const parseApiError = (raw: string, httpStatus?: number): string => {
    if (!raw) return "Terjadi kesalahan, silakan coba lagi.";

    // 409 Conflict — duplikasi data
    if (httpStatus === 409) {
      if (raw.toLowerCase().includes("email"))
        return "Email ini sudah terdaftar. Gunakan email lain.";
      if (raw.toLowerCase().includes("username"))
        return "Username sudah digunakan. Pilih username lain.";
      if (raw.includes("sudah terdaftar"))
        return "Akun dengan data ini sudah terdaftar di sistem.";
      return raw;
    }

    // 403 / 401 — akses
    if (httpStatus === 403)
      return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
    if (httpStatus === 401)
      return "Sesi login Anda telah berakhir. Silakan login ulang.";

    // Validasi input (400)
    if (raw.includes("Nama lengkap dan password"))
      return "Nama lengkap dan password wajib diisi.";
    if (raw.includes("Password minimal"))
      return "Password terlalu pendek, minimal 6 karakter.";
    if (raw.includes("Email wajib")) return "Email wajib diisi untuk akun BMS.";
    if (raw.includes("Cabang wajib"))
      return "Pilih cabang terlebih dahulu untuk role Customer Service.";
    if (raw.includes("Username minimal"))
      return "Username terlalu pendek, minimal 3 karakter.";
    if (raw.includes("Role harus dipilih") || raw.includes("Role tidak valid"))
      return "Role belum dipilih atau tidak valid.";
    if (raw.includes("Role harus salah satu"))
      return "Role tidak dikenali. Pilih: Super Admin, Customer Service, atau Marketing.";
    if (raw.includes("role BMS, gunakan field"))
      return "Untuk role BMS gunakan mode BMS, bukan mode Operasional.";

    // Error server (500)
    if (raw.includes("Gagal membuat akun auth"))
      return "Gagal membuat akun. Email mungkin sudah pernah terdaftar sebelumnya.";
    if (raw.includes("Gagal menyimpan profil"))
      return "Akun berhasil dibuat di sistem auth, tapi profil gagal disimpan. Hubungi administrator.";
    if (raw.includes("Gagal memperbarui"))
      return "Gagal menyimpan perubahan. Silakan coba lagi.";
    if (raw.includes("Gagal mengubah password"))
      return "Password gagal diubah. Silakan coba lagi.";
    if (raw.includes("tidak ditemukan di database"))
      return "Konfigurasi role tidak ditemukan. Hubungi administrator.";
    if (raw.includes("Terjadi kesalahan server"))
      return "Server sedang bermasalah. Silakan coba beberapa saat lagi.";

    // Fallback — tampilkan pesan asli dari API
    return raw;
  };

  const resolveUserType = (u: any): "bms" | "oprprd" => {
    if (u.role && (BMS_ROLES as readonly string[]).includes(u.role))
      return "bms";
    if (u.roles?.role_group) return "oprprd";
    if (u.username && (!u.email || u.email?.endsWith("@internal.local")))
      return "oprprd";
    return u.email && !u.username ? "bms" : "oprprd";
  };

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchAllUsers = useCallback(async () => {
    const params = new URLSearchParams({ limit: "500" });
    if (!showInactive) params.append("status", "active");
    const res = await fetch(`/api/users?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      showAlert("error", parseApiError(json.error, res.status));
      return;
    }
    setAllUsers(
      (json.data ?? []).map((u: any) => ({
        ...u,
        userType: resolveUserType(u),
      })),
    );
  }, [showInactive]);

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/roles");
    const json = await res.json();
    if (!res.ok) return;
    setRoles(
      (json.data ?? []).filter(
        (r: RoleOPRPRD) => r.role_group !== "management",
      ),
    );
  }, []);

  const fetchBranches = useCallback(async () => {
    const res = await fetch("/api/branches");
    const json = await res.json();
    if (!res.ok) {
      showAlert("error", parseApiError(json.error, res.status));
      return;
    }
    setBranches(json.data ?? []);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchAllUsers(), fetchRoles(), fetchBranches()]);
      setIsLoading(false);
    };
    load();
  }, [fetchAllUsers, fetchRoles, fetchBranches]);

  // ─── Filtered & stats ──────────────────────────────────────────────────────

  const filteredUsers = allUsers.filter((u) => {
    if (segment === "all") return true;
    if (segment === "bms") return u.userType === "bms";
    return u.roles?.role_group === segment;
  });

  const stats = {
    total: allUsers.length,
    bms: allUsers.filter((u) => u.userType === "bms").length,
    operational: allUsers.filter((u) => u.roles?.role_group === "operational")
      .length,
    production: allUsers.filter((u) => u.roles?.role_group === "production")
      .length,
    active: allUsers.filter((u) =>
      u.userType === "bms" ? u.status === "active" : u.is_active,
    ).length,
  };

  // ─── Modal handlers ────────────────────────────────────────────────────────

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    setNewUserType(null);
    setBmsForm(EMPTY_BMS_FORM);
    setOprprdForm(EMPTY_OPRPRD_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UnifiedUser) => {
    setIsEditMode(true);
    setSelectedUser(user);
    setNewUserType(user.userType);
    if (user.userType === "bms") {
      setBmsForm({
        full_name: user.full_name,
        email: user.email ?? "",
        password: "",
        role:
          (user.role as (typeof EMPTY_BMS_FORM)["role"]) ?? "customer_service",
        branch_id: user.branch_id ?? "",
      });
    } else {
      setOprprdForm({
        username: user.username ?? "",
        full_name: user.full_name,
        email: user.email ?? "",
        phone: user.phone ?? "",
        password: "",
        role_id: user.role_id ?? "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  // ─── Save BMS ──────────────────────────────────────────────────────────────

  const handleSaveBmsUser = async () => {
    if (!bmsForm.full_name.trim() || !bmsForm.email.trim()) {
      showAlert("error", "Nama lengkap dan email wajib diisi.");
      return;
    }
    if (!isEditMode && !bmsForm.password) {
      showAlert("error", "Password wajib diisi untuk akun baru.");
      return;
    }
    if (bmsForm.password && bmsForm.password.length < 6) {
      showAlert("error", "Password terlalu pendek, minimal 6 karakter.");
      return;
    }
    if (bmsForm.role === "customer_service" && !bmsForm.branch_id) {
      showAlert(
        "error",
        "Pilih cabang terlebih dahulu untuk role Customer Service.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: bmsForm.full_name.trim(),
        email: bmsForm.email.trim(),
        role: bmsForm.role,
        branch_id:
          bmsForm.role === "customer_service"
            ? bmsForm.branch_id || null
            : null,
        ...(bmsForm.password ? { password: bmsForm.password } : {}),
      };

      const res = await fetch(
        isEditMode ? `/api/users/${selectedUser!.id}` : "/api/users",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();

      if (!res.ok) {
        showAlert("error", parseApiError(json.error, res.status));
        return;
      }

      showAlert(
        "success",
        isEditMode
          ? "Akun berhasil diperbarui!"
          : "Akun BMS baru berhasil dibuat!",
      );

      setIsModalOpen(false);

      setTimeout(() => {
        fetchAllUsers();
      }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save OPRPRD ───────────────────────────────────────────────────────────

  const handleSaveOprprdUser = async () => {
    if (!oprprdForm.username.trim() || !oprprdForm.full_name.trim()) {
      showAlert("error", "Username dan nama lengkap wajib diisi.");
      return;
    }
    if (oprprdForm.username.trim().length < 3) {
      showAlert("error", "Username terlalu pendek, minimal 3 karakter.");
      return;
    }
    if (!oprprdForm.role_id) {
      showAlert("error", "Role wajib dipilih.");
      return;
    }
    if (!isEditMode && !oprprdForm.password) {
      showAlert("error", "Password wajib diisi untuk akun baru.");
      return;
    }
    if (oprprdForm.password && oprprdForm.password.length < 6) {
      showAlert("error", "Password terlalu pendek, minimal 6 karakter.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, string | null> = {
        username: oprprdForm.username.trim(),
        full_name: oprprdForm.full_name.trim(),
        email: oprprdForm.email.trim() || null,
        phone: oprprdForm.phone.trim() || null,
        role_id: oprprdForm.role_id,
      };
      if (oprprdForm.password) payload.password = oprprdForm.password;

      const res = await fetch(
        isEditMode ? `/api/users/${selectedUser!.id}` : "/api/users",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();

      if (!res.ok) {
        showAlert("error", parseApiError(json.error, res.status));
        return;
      }

      showAlert(
        "success",
        isEditMode
          ? "Akun berhasil diperbarui!"
          : "Akun Operasional/Produksi baru berhasil dibuat!",
      );

      setIsModalOpen(false);

      setTimeout(() => {
        fetchAllUsers();
      }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Toggle status ─────────────────────────────────────────────────────────

  const handleToggleUserStatus = async (user: UnifiedUser) => {
    const body =
      user.userType === "bms"
        ? { status: user.status === "active" ? "inactive" : "active" }
        : { is_active: !user.is_active };

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      showAlert("error", parseApiError(json.error, res.status));
      return;
    }
    const isNowActive =
      user.userType === "bms" ? user.status !== "active" : !user.is_active;
    showAlert(
      "success",
      `Akun ${user.full_name} berhasil ${isNowActive ? "diaktifkan" : "dinonaktifkan"}.`,
    );
    await fetchAllUsers();
  };

  // ─── Delete user ───────────────────────────────────────────────────────────

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showAlert("error", parseApiError(json.error, res.status));
        return;
      }
      showAlert("success", `Akun ${userToDelete.full_name} berhasil dihapus.`);
      await fetchAllUsers();
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  // ─── Branch handlers ───────────────────────────────────────────────────────

  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setIsEditMode(true);
      setSelectedBranch(branch);
      setBranchForm({
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone ?? "",
        email: branch.email ?? "",
        pic: branch.pic ?? "",
        status: branch.status,
      });
    } else {
      setIsEditMode(false);
      setSelectedBranch(null);
      setBranchForm(EMPTY_BRANCH_FORM);
    }
    setIsModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (
      !branchForm.name.trim() ||
      !branchForm.code.trim() ||
      !branchForm.address.trim()
    ) {
      showAlert("error", "Nama cabang, kode, dan alamat wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: branchForm.name.trim(),
        code: branchForm.code.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim() || null,
        email: branchForm.email.trim() || null,
        pic: branchForm.pic.trim() || null,
        status: branchForm.status,
      };

      const res = await fetch(
        isEditMode ? `/api/branches/${selectedBranch!.id}` : "/api/branches",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();

      if (!res.ok) {
        showAlert("error", parseApiError(json.error, res.status));
        return;
      }

      showAlert(
        "success",
        isEditMode
          ? `Data ${branchForm.name} berhasil diperbarui.`
          : `Cabang ${branchForm.name} berhasil ditambahkan.`,
      );

      // TUTUP MODAL SETELAH SUKSES
      setIsModalOpen(false);

      setTimeout(() => {
        fetchBranches();
      }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    const newStatus = branch.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/branches/${branch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!res.ok) {
      showAlert("error", parseApiError(json.error, res.status));
      return;
    }
    showAlert(
      "success",
      `Cabang ${branch.name} berhasil ${newStatus === "active" ? "diaktifkan" : "dinonaktifkan"}.`,
    );
    await fetchBranches();
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/branches/${branchToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showAlert("error", parseApiError(json.error, res.status));
        return;
      }
      showAlert("success", `Cabang ${branchToDelete.name} berhasil dihapus.`);
      await fetchBranches();
    } finally {
      setIsDeleting(false);
      setBranchToDelete(null);
    }
  };

  // ─── Badge helpers ─────────────────────────────────────────────────────────

  const getRoleBadge = (user: UnifiedUser) => {
    if (user.userType === "bms") {
      const map: Record<string, { bg: string; label: string }> = {
        superadmin: {
          bg: "bg-purple-100 text-purple-800",
          label: "Super Admin",
        },
        customer_service: {
          bg: "bg-blue-100 text-blue-800",
          label: "Customer Service",
        },
        marketing: { bg: "bg-green-100 text-green-800", label: "Marketing" },
      };
      const cfg = map[user.role ?? ""] ?? {
        bg: "bg-gray-100 text-gray-800",
        label: user.role ?? "-",
      };
      return (
        <div className="flex flex-col gap-0.5">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${cfg.bg}`}
          >
            {cfg.label}
          </span>
          <span className="text-[10px] text-gray-400">BMS</span>
        </div>
      );
    }
    const role = user.roles;
    if (!role)
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">
          -
        </span>
      );
    const cfg = ROLE_GROUP_LABELS[role.role_group] ?? {
      label: role.name,
      bg: "bg-gray-100 text-gray-800",
    };
    return (
      <div className="flex flex-col gap-0.5">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${cfg.bg}`}
        >
          {role.name}
        </span>
        <span className="text-[10px] text-gray-400">{cfg.label}</span>
      </div>
    );
  };

  const getStatusBadge = (user: UnifiedUser) => {
    const isActive =
      user.userType === "bms" ? user.status === "active" : user.is_active;
    return isActive ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Aktif
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
        Nonaktif
      </span>
    );
  };

  const getBranchStatusBadge = (status: "active" | "inactive") =>
    status === "active" ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Aktif
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
        Nonaktif
      </span>
    );

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

  const activeBranches = branches.filter((b) => b.status === "active");
  const currentUserIsActive = (u: UnifiedUser) =>
    u.userType === "bms" ? u.status === "active" : u.is_active;

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data..." />
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
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Kelola Akun & Data Cabang
                </h2>
                <p className="text-gray-600">
                  Buat, edit, dan kelola akses pengguna serta data cabang
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() =>
                  activeTab === "users"
                    ? handleOpenCreateModal()
                    : handleOpenBranchModal()
                }
                leftIcon={
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
                }
              >
                {activeTab === "users" ? "Buat Akun Baru" : "Tambah Cabang"}
              </Button>
            </div>

            {/* Alert */}
            {alert && (
              <div className="mb-6 animate-slide-down">
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                  autoClose
                  duration={5000}
                />
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="flex gap-8">
                {(["users", "branches"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 px-1 font-medium text-sm transition-colors ${activeTab === tab ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <div className="flex items-center gap-2">
                      {tab === "users" ? (
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
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      ) : (
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
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      )}
                      {tab === "users" ? "Manajemen User" : "Data Cabang"}
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* ── Tab: Users ── */}
            {activeTab === "users" && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {[
                    {
                      label: "Total",
                      value: stats.total,
                      color: "border-indigo-400",
                      text: "text-indigo-700",
                    },
                    {
                      label: "BMS",
                      value: stats.bms,
                      color: "border-purple-400",
                      text: "text-purple-700",
                    },
                    {
                      label: "Operasional",
                      value: stats.operational,
                      color: "border-blue-400",
                      text: "text-blue-700",
                    },
                    {
                      label: "Produksi",
                      value: stats.production,
                      color: "border-amber-400",
                      text: "text-amber-700",
                    },
                    {
                      label: "Aktif",
                      value: stats.active,
                      color: "border-green-400",
                      text: "text-green-700",
                    },
                  ].map(({ label, value, color, text }) => (
                    <div
                      key={label}
                      className={`bg-white rounded-xl shadow-sm p-4 border-t-2 ${color}`}
                    >
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-xl font-bold ${text}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {SEGMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSegment(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${segment === opt.value ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Tampilkan nonaktif
                  </label>
                </div>

                {/* Tabel */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            "Nama / Identitas",
                            "Email / Username",
                            "Role",
                            "Status",
                            "Terakhir Login",
                            "Aksi",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-10 text-center text-gray-500 text-sm"
                            >
                              Tidak ada data user.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {user.full_name}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  {user.id.slice(0, 8)}…
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {user.userType === "bms" ? (
                                  (user.email ?? "-")
                                ) : (
                                  <div>
                                    <div className="font-medium text-gray-800">
                                      @{user.username}
                                    </div>
                                    {user.email && (
                                      <div className="text-xs text-gray-400">
                                        {user.email}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getRoleBadge(user)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(user)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(
                                  user.last_login ?? user.last_login_at,
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOpenEditModal(user)}
                                    className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                    title="Edit"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserStatus(user)}
                                    className={`${currentUserIsActive(user) ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"} transition-colors`}
                                    title={
                                      currentUserIsActive(user)
                                        ? "Nonaktifkan"
                                        : "Aktifkan"
                                    }
                                  >
                                    <svg
                                      className="w-5 h-5"
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
                                  </button>
                                  <button
                                    onClick={() => setUserToDelete(user)}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Hapus"
                                  >
                                    <svg
                                      className="w-5 h-5"
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
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab: Branches ── */}
            {activeTab === "branches" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 mb-2">Total Cabang</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {branches.length}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600 mb-2">Cabang Aktif</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {activeBranches.length}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600 mb-2">
                      Total Lead (All Time)
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {branches
                        .reduce((s, b) => s + b.total_leads, 0)
                        .toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600 mb-2">
                      Total Closing (All Time)
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {branches
                        .reduce((s, b) => s + b.total_closing, 0)
                        .toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {branches.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-sm">
                    Belum ada data cabang.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-bold text-white">
                                {branch.name}
                              </h3>
                              <p className="text-sm text-indigo-100">
                                {branch.code}
                              </p>
                            </div>
                            {getBranchStatusBadge(branch.status)}
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <svg
                                className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
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
                              <div>
                                <p className="text-xs text-gray-500">Alamat</p>
                                <p className="text-sm text-gray-800">
                                  {branch.address}
                                </p>
                              </div>
                            </div>
                            {branch.phone && (
                              <div className="flex items-center gap-3">
                                <svg
                                  className="w-5 h-5 text-gray-400 shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Telepon
                                  </p>
                                  <p className="text-sm text-gray-800">
                                    {branch.phone}
                                  </p>
                                </div>
                              </div>
                            )}
                            {branch.pic && (
                              <div className="flex items-center gap-3">
                                <svg
                                  className="w-5 h-5 text-gray-400 shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                <div>
                                  <p className="text-xs text-gray-500">PIC</p>
                                  <p className="text-sm text-gray-800">
                                    {branch.pic}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Total Lead</span>
                              <span className="font-semibold text-gray-800">
                                {branch.total_leads.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mb-4">
                              <span className="text-gray-600">
                                Total Closing
                              </span>
                              <span className="font-semibold text-gray-800">
                                {branch.total_closing.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBranchModal(branch)}
                                className="flex-1"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  branch.status === "active"
                                    ? "warning"
                                    : "success"
                                }
                                onClick={() => handleToggleBranchStatus(branch)}
                                className="flex-1"
                              >
                                {branch.status === "active"
                                  ? "Nonaktifkan"
                                  : "Aktifkan"}
                              </Button>
                              <button
                                onClick={() => setBranchToDelete(branch)}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Hapus cabang"
                              >
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
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Modal ── */}
            <Modal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              title={
                activeTab === "branches"
                  ? isEditMode
                    ? "Edit Cabang"
                    : "Tambah Cabang Baru"
                  : isEditMode
                    ? `Edit Akun — ${selectedUser?.userType === "bms" ? "BMS" : "Operasional & Produksi"}`
                    : newUserType === null
                      ? "Pilih Tipe Akun"
                      : newUserType === "bms"
                        ? "Buat Akun BMS"
                        : "Buat Akun Operasional & Produksi"
              }
              size="md"
            >
              {/* TAMPILKAN ALERT DI DALAM MODAL */}
              {alert && (
                <div className="mb-4">
                  <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert(null)}
                    autoClose
                    duration={3000}
                  />
                </div>
              )}
              {/* Form Cabang */}
              {activeTab === "branches" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nama Cabang"
                      value={branchForm.name}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, name: e.target.value })
                      }
                      placeholder="Contoh: Cabang Jakarta Barat"
                      disabled={isSaving}
                    />
                    <Input
                      label="Kode Cabang"
                      value={branchForm.code}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Contoh: CBG-JKT-B"
                      disabled={isSaving}
                    />
                  </div>
                  <Input
                    label="Alamat Lengkap"
                    value={branchForm.address}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, address: e.target.value })
                    }
                    placeholder="Jl. Contoh No. 123, Kota"
                    disabled={isSaving}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nomor Telepon"
                      value={branchForm.phone}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, phone: e.target.value })
                      }
                      placeholder="(021) 1234567"
                      disabled={isSaving}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={branchForm.email}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, email: e.target.value })
                      }
                      placeholder="cabang@company.com"
                      disabled={isSaving}
                    />
                  </div>
                  <Input
                    label="PIC (Person in Charge)"
                    value={branchForm.pic}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, pic: e.target.value })
                    }
                    placeholder="Nama penanggung jawab"
                    disabled={isSaving}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={branchForm.status}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          status: e.target.value as Branch["status"],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                      disabled={isSaving}
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="secondary"
                      onClick={handleCloseModal}
                      disabled={isSaving}
                    >
                      Batal
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveBranch}
                      isLoading={isSaving}
                    >
                      {isEditMode ? "Simpan Perubahan" : "Tambah Cabang"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 1: Pilih tipe akun */}
              {activeTab === "users" && !isEditMode && newUserType === null && (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-gray-500 mb-4">
                    Pilih tipe akun yang ingin dibuat:
                  </p>
                  <button
                    onClick={() => setNewUserType("bms")}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Akun BMS</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Super Admin, Customer Service, Marketing — login dengan
                        email
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setNewUserType("oprprd")}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Akun Operasional & Produksi
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Operasional, Produksi — login dengan username
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Form BMS */}
              {activeTab === "users" &&
                (isEditMode
                  ? selectedUser?.userType === "bms"
                  : newUserType === "bms") && (
                  <div className="space-y-4">
                    {!isEditMode && (
                      <button
                        onClick={() => setNewUserType(null)}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 mb-2"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        Ganti tipe akun
                      </button>
                    )}
                    <Input
                      label="Nama Lengkap"
                      value={bmsForm.full_name}
                      onChange={(e) =>
                        setBmsForm({ ...bmsForm, full_name: e.target.value })
                      }
                      placeholder="Masukkan nama lengkap"
                      disabled={isSaving}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={bmsForm.email}
                      onChange={(e) =>
                        setBmsForm({ ...bmsForm, email: e.target.value })
                      }
                      placeholder="email@company.com"
                      disabled={isSaving}
                    />
                    <Input
                      label={
                        isEditMode
                          ? "Password Baru (kosongkan jika tidak diubah)"
                          : "Password"
                      }
                      type="password"
                      value={bmsForm.password}
                      onChange={(e) =>
                        setBmsForm({ ...bmsForm, password: e.target.value })
                      }
                      placeholder="Minimal 6 karakter"
                      disabled={isSaving}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={bmsForm.role}
                        onChange={(e) =>
                          setBmsForm({
                            ...bmsForm,
                            role: e.target.value as typeof bmsForm.role,
                            branch_id: "",
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={isSaving}
                      >
                        <option value="superadmin">Super Admin</option>
                        <option value="customer_service">
                          Customer Service
                        </option>
                        <option value="marketing">Marketing</option>
                      </select>
                    </div>
                    {bmsForm.role === "customer_service" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cabang
                        </label>
                        <select
                          value={bmsForm.branch_id}
                          onChange={(e) =>
                            setBmsForm({
                              ...bmsForm,
                              branch_id: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                          disabled={isSaving}
                        >
                          <option value="">Pilih Cabang</option>
                          {activeBranches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        variant="secondary"
                        onClick={handleCloseModal}
                        disabled={isSaving}
                      >
                        Batal
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleSaveBmsUser}
                        isLoading={isSaving}
                      >
                        {isEditMode ? "Simpan Perubahan" : "Buat Akun"}
                      </Button>
                    </div>
                  </div>
                )}

              {/* Form OPRPRD */}
              {activeTab === "users" &&
                (isEditMode
                  ? selectedUser?.userType === "oprprd"
                  : newUserType === "oprprd") && (
                  <div className="space-y-4">
                    {!isEditMode && (
                      <button
                        onClick={() => setNewUserType(null)}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 mb-2"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        Ganti tipe akun
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Username"
                        value={oprprdForm.username}
                        onChange={(e) =>
                          setOprprdForm({
                            ...oprprdForm,
                            username: e.target.value,
                          })
                        }
                        placeholder="min. 3 karakter"
                        disabled={isSaving || isEditMode}
                      />
                      <Input
                        label="Nama Lengkap"
                        value={oprprdForm.full_name}
                        onChange={(e) =>
                          setOprprdForm({
                            ...oprprdForm,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="Masukkan nama lengkap"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Email (Opsional)"
                        type="email"
                        value={oprprdForm.email}
                        onChange={(e) =>
                          setOprprdForm({
                            ...oprprdForm,
                            email: e.target.value,
                          })
                        }
                        placeholder="email@company.com"
                        disabled={isSaving}
                      />
                      <Input
                        label="Telepon (Opsional)"
                        type="tel"
                        value={oprprdForm.phone}
                        onChange={(e) =>
                          setOprprdForm({
                            ...oprprdForm,
                            phone: e.target.value,
                          })
                        }
                        placeholder="08123456789"
                        disabled={isSaving}
                      />
                    </div>
                    <Input
                      label={
                        isEditMode
                          ? "Password Baru (kosongkan jika tidak diubah)"
                          : "Password"
                      }
                      type="password"
                      value={oprprdForm.password}
                      onChange={(e) =>
                        setOprprdForm({
                          ...oprprdForm,
                          password: e.target.value,
                        })
                      }
                      placeholder="Minimal 6 karakter"
                      disabled={isSaving}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={oprprdForm.role_id}
                        onChange={(e) =>
                          setOprprdForm({
                            ...oprprdForm,
                            role_id: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={isSaving}
                      >
                        <option value="">Pilih Role</option>
                        {(["operational", "production"] as const).map(
                          (group) => {
                            const groupRoles = roles.filter(
                              (r) => r.role_group === group,
                            );
                            if (groupRoles.length === 0) return null;
                            return (
                              <optgroup
                                key={group}
                                label={ROLE_GROUP_LABELS[group]?.label ?? group}
                              >
                                {groupRoles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          },
                        )}
                      </select>
                      {oprprdForm.role_id && (
                        <p className="mt-1.5 text-xs text-gray-500 italic">
                          {roles.find((r) => r.id === oprprdForm.role_id)
                            ?.description ?? "Tidak ada deskripsi."}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        variant="secondary"
                        onClick={handleCloseModal}
                        disabled={isSaving}
                      >
                        Batal
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleSaveOprprdUser}
                        isLoading={isSaving}
                      >
                        {isEditMode ? "Simpan Perubahan" : "Buat Akun"}
                      </Button>
                    </div>
                  </div>
                )}
            </Modal>
          </main>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={!!branchToDelete}
        variant="danger"
        title="Hapus cabang ini?"
        message={
          branchToDelete
            ? `Cabang "${branchToDelete.name}" (${branchToDelete.code}) akan dihapus permanen. Pastikan tidak ada pengguna yang masih terhubung ke cabang ini.`
            : ""
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleDeleteBranch}
        onCancel={() => !isDeleting && setBranchToDelete(null)}
      />

      <ConfirmDialog
        isOpen={!!userToDelete}
        variant="danger"
        title="Hapus akun ini?"
        message={
          userToDelete
            ? `Akun "${userToDelete.full_name}" (${userToDelete.userType === "bms" ? userToDelete.email : `@${userToDelete.username}`}) akan dihapus permanen beserta akses loginnya. Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeletingUser}
        onConfirm={handleDeleteUser}
        onCancel={() => !isDeletingUser && setUserToDelete(null)}
      />
    </>
  );
}
