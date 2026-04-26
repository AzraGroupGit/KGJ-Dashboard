// middleware.ts

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ROUTES,
  getDashboardPath,
  canAccessPath,
  isProtectedPath,
  isAuthOnlyPath,
} from "@/lib/routes";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[middleware] Missing Supabase env vars");
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update cookie di request (supaya getUser setelahnya dapat yg baru)
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value);
        });
        // Buat response baru yang meneruskan request, dengan cookie ter-update
        res = NextResponse.next({
          request: { headers: req.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const pathIsProtected = isProtectedPath(pathname);
  const pathIsAuthOnly = isAuthOnlyPath(pathname);

  // ──────────────────────────────────────────────────────────────────────────
  // 1) Akses halaman protected tanpa login → redirect ke /login
  // ──────────────────────────────────────────────────────────────────────────
  if (pathIsProtected && !user) {
    const loginUrl = new URL(ROUTES.LOGIN, req.url);
    // Sertakan path asal sebagai query, biar setelah login bisa kembali
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2) Akses halaman auth (e.g. /login) padahal sudah login →
  //    redirect ke dashboard sesuai role
  // ──────────────────────────────────────────────────────────────────────────
  if (pathIsAuthOnly && user) {
    const roleName = await fetchUserRoleName(supabase, user.id);

    const dashboardPath = getDashboardPath(roleName);
    if (dashboardPath) {
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }

    // Role tidak dikenali (misal production_staff yang login via form) —
    // paksa logout & biarkan di /login dengan pesan error.
    await supabase.auth.signOut();
    const loginUrl = new URL(ROUTES.LOGIN, req.url);
    loginUrl.searchParams.set("error", "invalid_role");
    return NextResponse.redirect(loginUrl);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3) Akses halaman protected dengan role tidak sesuai → redirect ke
  //    dashboard role-nya sendiri
  //    Misal: user CS coba akses /dashboard/superadmin
  // ──────────────────────────────────────────────────────────────────────────
  if (pathIsProtected && user) {
    const roleName = await fetchUserRoleName(supabase, user.id);

    // Role user tidak dikenali → force logout
    if (!roleName) {
      await supabase.auth.signOut();
      const loginUrl = new URL(ROUTES.LOGIN, req.url);
      loginUrl.searchParams.set("error", "no_role");
      return NextResponse.redirect(loginUrl);
    }

    // Cek akses path — kalau tidak punya akses, redirect ke dashboard sendiri
    if (!canAccessPath(roleName as any, pathname)) {
      const ownDashboard = getDashboardPath(roleName);
      if (ownDashboard) {
        return NextResponse.redirect(new URL(ownDashboard, req.url));
      }
      // Fallback defensive — seharusnya tidak pernah sampai sini
      return NextResponse.redirect(new URL(ROUTES.LOGIN, req.url));
    }
  }

  return res;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ambil nama role user dari tabel users (JOIN ke roles).
 * Return null kalau user tidak ada, tidak aktif, sudah di-soft-delete,
 * atau role tidak valid.
 */
async function fetchUserRoleName(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
      status,
      deleted_at,
      role:roles!users_role_id_fkey (
        name
      )
    `,
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.warn("[middleware] failed to fetch user role:", error?.message);
    return null;
  }

  // Tolak user yang sudah di-soft-delete
  if (data.deleted_at) return null;

  // Tolak user yang statusnya bukan active
  if (data.status !== "active") return null;

  const roleName = (data.role as any)?.name;
  if (!roleName || typeof roleName !== "string") return null;

  return roleName;
}

// ════════════════════════════════════════════════════════════════════════════
// MATCHER CONFIG
// ════════════════════════════════════════════════════════════════════════════

export const config = {
  // Matcher mengeksklusi static assets & API routes biar middleware
  // tidak jalan di setiap request yang tidak relevan.
  matcher: [
    /*
     * Jalankan middleware di semua path KECUALI:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - file dengan ekstensi (*.png, *.svg, dsb)
     * - /api/* (API routes handle auth sendiri)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\..*).*)",
  ],
};
