// lib/routes.ts

/**
 * Single source of truth untuk semua route di aplikasi.
 */

// =======================================================================
// Role aplikasi
// =======================================================================
export const ROLES = {
  SUPERADMIN: "superadmin",
  CS: "cs",
  MARKETING: "marketing",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

// Type guard — berguna untuk memvalidasi nilai dari localStorage/DB
export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    (Object.values(ROLES) as string[]).includes(value)
  );
}

// =======================================================================
// Public / umum
// =======================================================================
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
} as const;

// =======================================================================
// Dashboard path per role
// =======================================================================
export const DASHBOARD_PATHS: Record<AppRole, string> = {
  [ROLES.SUPERADMIN]: "/dashboard/superadmin",
  [ROLES.CS]: "/dashboard/cs",
  [ROLES.MARKETING]: "/dashboard/marketing",
};

/**
 * Ambil path dashboard berdasarkan role.
 * Return null kalau role tidak dikenali.
 */
export function getDashboardPath(
  role: string | null | undefined,
): string | null {
  if (!role || !isAppRole(role)) return null;
  return DASHBOARD_PATHS[role];
}

// =======================================================================
// Sub-route tiap role (dipakai di Sidebar menu)
// =======================================================================
export const SUPERADMIN_ROUTES = {
  DASHBOARD: DASHBOARD_PATHS.superadmin,
  STATISTIK: `${DASHBOARD_PATHS.superadmin}/statistik`,
  KELOLA_AKUN: `${DASHBOARD_PATHS.superadmin}/kelola-akun`,
  LAPORAN: `${DASHBOARD_PATHS.superadmin}/laporan`,
} as const;

export const CS_ROUTES = {
  DASHBOARD: DASHBOARD_PATHS.cs,
  INPUT_LEADS: `${DASHBOARD_PATHS.cs}/input-leads`,
} as const;

export const MARKETING_ROUTES = {
  DASHBOARD: DASHBOARD_PATHS.marketing,
  INPUT: `${DASHBOARD_PATHS.marketing}/input`,
  ANALISIS: `${DASHBOARD_PATHS.marketing}/analisis`,
} as const;

// =======================================================================
// Guards untuk middleware
// =======================================================================
/**
 * Route yang wajib login. Kalau user belum auth, akan di-redirect ke /login.
 */
export const PROTECTED_PATH_PREFIXES = ["/dashboard"] as const;

/**
 * Route khusus untuk user yang BELUM login. Kalau sudah login, redirect
 * ke dashboard sesuai role-nya.
 */
export const AUTH_ONLY_PATHS = ["/login"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
