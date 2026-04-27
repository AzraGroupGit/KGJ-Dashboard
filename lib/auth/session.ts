// lib/auth/session.ts

/**
 * Semua role yang bisa login via halaman /login (form email+password).
 * Union flat — tampil sebagai satu daftar di dropdown.
 */
export const LOGIN_ROLES = [
  "superadmin",
  "customer_service",
  "marketing",
] as const;

export type LoginRole = (typeof LOGIN_ROLES)[number];

/** role_group dari tabel roles di database. */
export type RoleGroup =
  | "management"
  | "operational"
  | "production"
  | "marketing"
  | "customer_service";

export interface RolePermissions {
  can_read: boolean;
  can_insert: boolean;
  can_update: boolean;
  can_delete: boolean;
}

/**
 * Detail role lengkap — diambil dari tabel `roles` di database.
 * Dipakai untuk permission-based rendering dan display name.
 *
 * Catatan: `name` di-type sebagai `string` karena tabel roles memuat juga
 * role non-login (packing, qc_1, jewelry_expert_*, dll) yang tidak ada di
 * union LoginRole. Jadi nilai field ini bisa lebih luas dari LoginRole.
 */
export interface UserRoleDetail {
  id: string;
  name: string;
  role_group: RoleGroup;
  description: string | null;
  permissions: RolePermissions;
}

export interface UserBranch {
  id: string;
  name: string;
  code: string;
}

export interface ClientUser {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
  /** Nama role — strict union 3 role BMS yang bisa login via form. */
  role: LoginRole;
  /** Detail role lengkap dari database (permissions, role_group, dll). */
  roleDetail: UserRoleDetail | null;
  /** Cabang — biasanya hanya ada untuk role Customer Service. */
  branch: UserBranch | null;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  id: "userId",
  email: "userEmail",
  fullName: "userName",
  username: "userUsername",
  role: "userRole",
  roleDetail: "userRoleDetail",
  branch: "userBranch",
} as const;

/** Role yang masuk kategori management (akses tinggi). */
export const MANAGEMENT_ROLES = [
  "superadmin",
] as const satisfies readonly LoginRole[];

/** Role yang masuk kategori operasional (input data harian). */
export const OPERATIONAL_ROLES = [
  "customer_service",
  "marketing",
] as const satisfies readonly LoginRole[];

const VALID_ROLE_GROUPS: readonly string[] = [
  "management",
  "operational",
  "production",
  "marketing",
  "customer_service",
];

// ════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ════════════════════════════════════════════════════════════════════════════

export function isLoginRole(value: unknown): value is LoginRole {
  return (
    typeof value === "string" &&
    (LOGIN_ROLES as readonly string[]).includes(value)
  );
}

function isRoleGroup(value: unknown): value is RoleGroup {
  return typeof value === "string" && VALID_ROLE_GROUPS.includes(value);
}

function isRoleDetailObject(value: unknown): value is UserRoleDetail {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    isRoleGroup(r.role_group)
  );
}

// ════════════════════════════════════════════════════════════════════════════
// READ
// ════════════════════════════════════════════════════════════════════════════

/**
 * Baca data user dari localStorage. Return null kalau tidak ada atau rusak.
 * SSR-safe: kalau dipanggil di server, return null.
 */
export function getClientUser(): ClientUser | null {
  if (typeof window === "undefined") return null;

  const id = localStorage.getItem(STORAGE_KEYS.id);
  const email = localStorage.getItem(STORAGE_KEYS.email);
  const fullName = localStorage.getItem(STORAGE_KEYS.fullName);
  const roleRaw = localStorage.getItem(STORAGE_KEYS.role);

  // Field wajib
  if (!id || !email || !fullName || !roleRaw) return null;

  // Validasi role — kalau ada role asing, anggap session rusak
  if (!isLoginRole(roleRaw)) return null;

  const username = localStorage.getItem(STORAGE_KEYS.username);
  const roleDetailRaw = localStorage.getItem(STORAGE_KEYS.roleDetail);
  const branchRaw = localStorage.getItem(STORAGE_KEYS.branch);

  let roleDetail: UserRoleDetail | null = null;
  if (roleDetailRaw) {
    try {
      const parsed = JSON.parse(roleDetailRaw);
      if (isRoleDetailObject(parsed)) {
        roleDetail = parsed;
      }
    } catch {
      roleDetail = null;
    }
  }

  let branch: UserBranch | null = null;
  if (branchRaw) {
    try {
      branch = JSON.parse(branchRaw);
    } catch {
      branch = null;
    }
  }

  return {
    id,
    email,
    fullName,
    username: username || null,
    role: roleRaw,
    roleDetail,
    branch,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// WRITE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Simpan data user ke localStorage. Dipanggil setelah login sukses.
 */
export function setClientUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: LoginRole;
  username?: string | null;
  roleDetail?: UserRoleDetail | null;
  branch?: UserBranch | null;
}): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEYS.id, user.id);
  localStorage.setItem(STORAGE_KEYS.email, user.email);
  localStorage.setItem(STORAGE_KEYS.fullName, user.fullName);
  localStorage.setItem(STORAGE_KEYS.role, user.role);

  if (user.username) {
    localStorage.setItem(STORAGE_KEYS.username, user.username);
  } else {
    localStorage.removeItem(STORAGE_KEYS.username);
  }

  if (user.roleDetail) {
    localStorage.setItem(
      STORAGE_KEYS.roleDetail,
      JSON.stringify(user.roleDetail),
    );
  } else {
    localStorage.removeItem(STORAGE_KEYS.roleDetail);
  }

  if (user.branch) {
    localStorage.setItem(STORAGE_KEYS.branch, JSON.stringify(user.branch));
  } else {
    localStorage.removeItem(STORAGE_KEYS.branch);
  }
}

/** Hapus semua data user di localStorage. Dipanggil saat logout. */
export function clearClientUser(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

// ════════════════════════════════════════════════════════════════════════════
// ROLE CHECK HELPERS
// ════════════════════════════════════════════════════════════════════════════

/** Cek apakah user adalah superadmin. */
export function isSuperadmin(user: ClientUser | null): boolean {
  return user?.role === "superadmin";
}

/** Cek apakah user masuk kategori operational (customer_service/marketing). */
export function isOperationalUser(user: ClientUser | null): boolean {
  if (!user) return false;
  return (OPERATIONAL_ROLES as readonly string[]).includes(user.role);
}

/**
 * Cek apakah user punya salah satu role dari daftar.
 * Contoh: hasAnyRole(user, ["customer_service", "marketing"])
 */
export function hasAnyRole(
  user: ClientUser | null,
  roles: readonly LoginRole[],
): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Cek permission berdasarkan roleDetail.
 * Kalau roleDetail tidak tersedia (misal user lama sebelum struktur di-update),
 * fallback: superadmin dianggap punya semua permission.
 */
export function hasPermission(
  user: ClientUser | null,
  action: keyof RolePermissions,
): boolean {
  if (!user) return false;
  if (user.roleDetail?.permissions) {
    return user.roleDetail.permissions[action] === true;
  }
  // Fallback: superadmin selalu dapat akses, role lain return false
  return user.role === "superadmin";
}

/** Dapatkan display name role untuk UI (human-readable). */
export function getRoleDisplayName(role: LoginRole): string {
  const map: Record<LoginRole, string> = {
    superadmin: "Super Admin",
    customer_service: "Customer Service",
    marketing: "Marketing",
  };
  return map[role];
}
