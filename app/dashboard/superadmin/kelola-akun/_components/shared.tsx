"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BranchRef {
  id: string;
  name: string;
  code: string;
}

export interface RoleOPRPRD {
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

export interface UnifiedUser {
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
  userType: "bms" | "supervisor" | "oprprd";
}

export interface Branch {
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

export type AlertState = {
  type: "success" | "error" | "warning" | "info";
  message: string;
} | null;

export type UserSegment = "all" | "bms" | "management" | "operational" | "production";

export type NewUserType = "bms" | "supervisor" | "oprprd" | null;

// ─── Constants ────────────────────────────────────────────────────────────────

export const BMS_ROLES = ["superadmin", "customer_service", "marketing"] as const;

export const ROLE_GROUP_LABELS: Record<string, { label: string; bg: string }> = {
  management: { label: "Manajemen", bg: "bg-purple-100 text-purple-800" },
  operational: { label: "Operasional", bg: "bg-blue-100 text-blue-800" },
  production: { label: "Produksi", bg: "bg-amber-100 text-amber-800" },
};

export const SEGMENT_OPTIONS: { value: UserSegment; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "bms", label: "BMS (Admin, CS, Marketing)" },
  { value: "management", label: "Manajemen" },
  { value: "operational", label: "Operasional" },
  { value: "production", label: "Produksi" },
];

// ─── Empty forms ──────────────────────────────────────────────────────────────

export const EMPTY_BMS_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "customer_service" as "superadmin" | "customer_service" | "marketing",
  branch_id: "",
};

export const EMPTY_OPRPRD_FORM = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_id: "",
};

export const EMPTY_SUPERVISOR_FORM = {
  username: "",
  full_name: "",
  email: "",
  password: "",
  role: "operational_supervisor" as "operational_supervisor" | "production_supervisor",
};

export const EMPTY_BRANCH_FORM = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  pic: "",
  status: "active" as Branch["status"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const parseApiError = (raw: string, httpStatus?: number): string => {
  if (!raw) return "Terjadi kesalahan, silakan coba lagi";

  if (httpStatus === 409) {
    if (raw.includes("Supervisor Operasional") || raw.includes("Supervisor Produksi"))
      return raw;
    if (raw.toLowerCase().includes("email"))
      return "Email ini sudah terdaftar. Gunakan email lain.";
    if (raw.toLowerCase().includes("username"))
      return "Username sudah digunakan. Pilih username lain.";
    if (raw.includes("sudah terdaftar"))
      return "Akun dengan data ini sudah terdaftar di sistem.";
    return raw;
  }

  if (httpStatus === 403)
    return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
  if (httpStatus === 401)
    return "Sesi login Anda telah berakhir. Silakan login ulang.";

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

  if (raw.startsWith("Gagal membuat akun auth:")) return raw;
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

  return raw;
};

export const resolveUserType = (u: { role?: string; roles?: { name?: string; role_group?: string } | null; username?: string; email?: string }): "bms" | "supervisor" | "oprprd" => {
  if (u.role && (BMS_ROLES as readonly string[]).includes(u.role))
    return "bms";
  const roleName = u.roles?.name;
  if (roleName === "operational_supervisor" || roleName === "production_supervisor")
    return "supervisor";
  if (u.roles?.role_group) return "oprprd";
  if (u.username && (!u.email || u.email?.endsWith("@internal.local")))
    return "oprprd";
  return u.email && !u.username ? "bms" : "oprprd";
};

export const currentUserIsActive = (u: UnifiedUser) =>
  u.userType === "bms" ? u.status === "active" : u.is_active;

export const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getRoleBadge = (user: UnifiedUser) => {
  if (user.userType === "bms") {
    const map: Record<string, { bg: string; label: string }> = {
      superadmin: { bg: "bg-purple-100 text-purple-800", label: "Super Admin" },
      customer_service: { bg: "bg-blue-100 text-blue-800", label: "Customer Service" },
      marketing: { bg: "bg-green-100 text-green-800", label: "Marketing" },
    };
    const cfg = map[user.role ?? ""] ?? {
      bg: "bg-gray-100 text-gray-800",
      label: user.role ?? "-",
    };
    return (
      <div className="flex flex-col gap-0.5">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cfg.bg}`}>
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
  if (role.name === "operational_supervisor") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
          Spv. Operasional
        </span>
        <span className="text-[10px] text-gray-400">Manajemen</span>
      </div>
    );
  }
  if (role.name === "production_supervisor") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
          Spv. Produksi
        </span>
        <span className="text-[10px] text-gray-400">Manajemen</span>
      </div>
    );
  }
  const cfg = ROLE_GROUP_LABELS[role.role_group] ?? {
    label: role.name,
    bg: "bg-gray-100 text-gray-800",
  };
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cfg.bg}`}>
        {role.name}
      </span>
      <span className="text-[10px] text-gray-400">{cfg.label}</span>
    </div>
  );
};

export const getStatusBadge = (user: UnifiedUser) => {
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

export const getBranchStatusBadge = (status: "active" | "inactive") =>
  status === "active" ? (
    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
      Aktif
    </span>
  ) : (
    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
      Nonaktif
    </span>
  );
