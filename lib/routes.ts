// lib/routes.ts

/**
 * Helper untuk type, path routing, dan route protection per role.
 *
 * Source of truth untuk daftar role dashboard ada di `lib/auth/session.ts` (LoginRole).
 * Role workshop/produksi didefinisikan terpisah di file ini (WorkshopRole).
 *
 * File ini:
 *   - Re-export AppRole (alias untuk LoginRole — dashboard roles)
 *   - Export WorkshopRole & AllRole untuk mencakup semua role di sistem
 *   - Sediakan ROUTES & *_ROUTES constants untuk hindari string literal tersebar
 *   - Sediakan helper routing (getDashboardPath, canAccessPath)
 *   - Sediakan helper proteksi route untuk middleware
 */

import { LOGIN_ROLES, type LoginRole } from "@/lib/auth/session";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Alias untuk LoginRole — dipakai di banyak tempat sebagai "app role" untuk dashboard.
 * Union: 'superadmin' | 'customer_service' | 'marketing'
 */
export type AppRole = LoginRole;

/**
 * Role yang digunakan untuk akses workshop / QR scan.
 * Role ini TIDAK bisa login lewat halaman /login (dashboard),
 * hanya lewat /workshop/login.
 *
 * Role names are DB-driven and can change — DO NOT enumerate them here.
 * Detection is done by exclusion: any non-AppRole string is a workshop role.
 */
export type WorkshopRole = string;

/**
 * Union semua role yang ada di sistem (dashboard + workshop).
 * Dipakai untuk validasi universal.
 */
export type AllRole = AppRole | WorkshopRole;

/**
 * Semua role dashboard yang valid di aplikasi.
 * Workshop roles are DB-driven (not enumerable), so this only covers AppRoles.
 */
export const ALL_ROLES: readonly string[] = [...LOGIN_ROLES] as const;

// ════════════════════════════════════════════════════════════════════════════
// ROUTE CONSTANTS — TOP-LEVEL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Central list of app routes. Hindari string literal tersebar di codebase.
 */
export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",

  // Dashboards per role (entry point)
  DASHBOARD_SUPERADMIN: "/dashboard/superadmin",
  DASHBOARD_CS: "/dashboard/cs",
  DASHBOARD_MARKETING: "/dashboard/marketing",
  DASHBOARD_SUPERVISOR: "/dashboard/supervisor",

  // Workshop / QR access
  QR_LOGIN: "/workshop/login",
  QR_INPUT: "/workshop/input",
} as const;

// ════════════════════════════════════════════════════════════════════════════
// ROUTE CONSTANTS PER ROLE (detail sub-route per dashboard)
// ════════════════════════════════════════════════════════════════════════════

export const SUPERADMIN_ROUTES = {
  DASHBOARD: "/dashboard/superadmin",
  KELOLA_AKUN: "/dashboard/superadmin/kelola-akun",
  KELOLA_QR_CODES: "/dashboard/superadmin/kelola-qr-codes",

  // BMS submenu
  BMS_DASHBOARD: "/dashboard/superadmin/bms",
  STATISTIK: "/dashboard/superadmin/bms/statistik",
  LAPORAN: "/dashboard/superadmin/bms/laporan",

  // OPR-PRD submenu
  OPRPRD_DASHBOARD: "/dashboard/superadmin/oprprd",
  OPRPRD_MONITORING_OPERASI: "/dashboard/superadmin/oprprd/operasi",
  OPRPRD_MONITORING_PRODUKSI: "/dashboard/superadmin/oprprd/produksi",
  OPRPRD_ANALISIS: "/dashboard/superadmin/oprprd/analisis",
  OPRPRD_LAPORAN: "/dashboard/superadmin/oprprd/laporan",
} as const;

export const CS_ROUTES = {
  DASHBOARD: "/dashboard/cs",
  INPUT_LEADS: "/dashboard/cs/input-leads",
} as const;

export const MARKETING_ROUTES = {
  DASHBOARD: "/dashboard/marketing",
  INPUT: "/dashboard/marketing/input",
  ANALISIS: "/dashboard/marketing/analisis",
} as const;

/**
 * Route khusus untuk workshop / QR access.
 * User produksi hanya mengakses halaman ini.
 */
export const WORKSHOP_ROUTES = {
  LOGIN: "/workshop/login",
  INPUT: "/workshop/input",
} as const;

export const SUPERVISOR_ROUTES = {
  DASHBOARD: "/dashboard/supervisor/bottleneck",
  MONITORING: "/dashboard/supervisor/monitoring",
  APPROVAL: "/dashboard/supervisor/approval",
} as const;

// ════════════════════════════════════════════════════════════════════════════
// PROTECTED & AUTH-ONLY PATHS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Path yang hanya boleh diakses oleh user yang sudah login.
 * Middleware akan redirect ke /login atau /workshop/login kalau user tidak authenticated.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/workshop/input"] as const;

/**
 * Path yang hanya boleh diakses oleh user yang BELUM login.
 * Middleware akan redirect ke dashboard kalau user sudah authenticated.
 *
 * CATATAN: /workshop/login TIDAK termasuk di sini karena:
 * - User workshop yang sudah login tetap boleh akses /workshop/login
 *   (misal: session expired, login ulang)
 * - User dashboard yang sudah login juga boleh akses /workshop/login
 *   (tidak ada masalah — halaman login QR tidak sensitif)
 */
const AUTH_ONLY_PATHS = ["/login"] as const;

/**
 * Path publik yang tidak butuh autentikasi sama sekali.
 * Middleware tidak akan melakukan pengecekan apapun di path ini.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/workshop/login", // halaman login workshop selalu terbuka
  "/api/auth", // API auth (login, qr-login, logout)
] as const;

// ════════════════════════════════════════════════════════════════════════════
// TYPE GUARD
// ════════════════════════════════════════════════════════════════════════════

/**
 * Validasi apakah sebuah value adalah AppRole yang valid (dashboard roles).
 * Dipakai di API route untuk validate input role dari client (login dashboard).
 */
export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    (LOGIN_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Validasi apakah sebuah value adalah WorkshopRole yang valid.
 * Any non-empty string that is not an AppRole is treated as a workshop role,
 * since workshop role names are DB-driven and cannot be enumerated statically.
 */
export function isWorkshopRole(value: unknown): value is WorkshopRole {
  return typeof value === "string" && value.length > 0 && !isAppRole(value);
}

/**
 * Validasi apakah sebuah value adalah role valid di sistem (dashboard atau workshop).
 */
export function isAllRole(value: unknown): value is AllRole {
  return (
    typeof value === "string" &&
    (ALL_ROLES as readonly string[]).includes(value)
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Map role → path halaman utama setelah login sukses.
 *
 * Pembagian:
 *   - superadmin                       → /dashboard/superadmin
 *   - customer_service                 → /dashboard/cs
 *   - marketing                        → /dashboard/marketing
 *   - production_staff / qc_staff / admin  → /workshop/login
 *
 * Menerima input unknown (dari DB atau user input) — kalau bukan AllRole
 * valid, return null. Defensive untuk runtime safety.
 */
export function getDashboardPath(role: unknown): string | null {
  // Cek AppRole (dashboard)
  if (isAppRole(role)) {
    switch (role) {
      case "superadmin":
        return ROUTES.DASHBOARD_SUPERADMIN;

      case "customer_service":
        return ROUTES.DASHBOARD_CS;

      case "marketing":
        return ROUTES.DASHBOARD_MARKETING;

      default: {
        const _exhaustive: never = role;
        console.warn(`[getDashboardPath] unknown AppRole:`, _exhaustive);
        return null;
      }
    }
  }

  // Supervisor — punya dashboard sendiri
  if (role === "supervisor") {
    return ROUTES.DASHBOARD_SUPERVISOR + "/bottleneck";
  }

  // Cek WorkshopRole — semua role workshop diarahkan ke QR login
  if (isWorkshopRole(role)) {
    return ROUTES.QR_LOGIN;
  }

  console.warn(`[getDashboardPath] invalid role:`, role);
  return null;
}

/**
 * Cek apakah sebuah role punya akses ke path tertentu.
 * Dipakai di middleware untuk proteksi route level granular.
 *
 * Menerima role string (bisa AppRole atau WorkshopRole) dan path.
 */
export function canAccessPath(role: string, path: string): boolean {
  // Superadmin bisa akses semua (termasuk QR)
  if (role === "superadmin") return true;

  // Supervisor — hanya akses dashboard supervisor
  if (role === "supervisor") {
    return (
      path.startsWith(ROUTES.DASHBOARD_SUPERVISOR) || path.startsWith("/api/")
    );
  }

  // Workshop roles — hanya bisa akses /qr/*
  if (isWorkshopRole(role)) {
    return (
      path.startsWith(ROUTES.QR_LOGIN) ||
      path.startsWith(ROUTES.QR_INPUT) ||
      path.startsWith("/api/") // izinkan API call
    );
  }

  // Customer Service — hanya dashboard CS
  if (role === "customer_service") {
    return (
      path.startsWith(ROUTES.DASHBOARD_CS) || path.startsWith("/api/") // izinkan API call
    );
  }

  // Marketing — hanya dashboard marketing
  if (role === "marketing") {
    return (
      path.startsWith(ROUTES.DASHBOARD_MARKETING) || path.startsWith("/api/") // izinkan API call
    );
  }

  // Role tidak dikenali
  return false;
}

/**
 * Convert role dari URL query parameter (bentuk friendly)
 * ke AppRole canonical. Return null kalau tidak match.
 *
 * Contoh:
 *   '?role=admin' → 'superadmin'
 *   '?role=cs'    → 'customer_service'  (alias lama)
 *   '?role=customer_service' → 'customer_service'
 *   '?role=xxx'   → null
 */
export function queryParamToAppRole(param: string | null): AppRole | null {
  if (!param) return null;

  // Alias untuk kompatibilitas link lama
  if (param === "admin") return "superadmin";
  if (param === "cs") return "customer_service";

  return isAppRole(param) ? param : null;
}

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cek apakah path adalah path publik (tidak butuh autentikasi).
 * Middleware bisa skip pengecekan untuk path ini.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix + "/") ||
      pathname.startsWith(prefix + "?"),
  );
}

/**
 * Cek apakah path perlu authentication (user harus sudah login).
 * Contoh: /dashboard/cs → true, /workshop/input → true, /login → false
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix + "/") ||
      pathname.startsWith(prefix + "?"),
  );
}

/**
 * Cek apakah path khusus untuk user yang belum login.
 * User yang sudah login tidak boleh akses (akan di-redirect ke dashboard).
 * Contoh: /login → true, /workshop/login → false
 *
 * CATATAN: /workshop/login TIDAK termasuk karena halaman itu boleh diakses
 * baik sudah login maupun belum (user workshop mungkin perlu login ulang).
 */
export function isAuthOnlyPath(pathname: string): boolean {
  return (AUTH_ONLY_PATHS as readonly string[]).some(
    (authPath) => pathname === authPath || pathname.startsWith(authPath + "?"),
  );
}
