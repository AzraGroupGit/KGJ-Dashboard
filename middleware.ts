// middleware.ts

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ROUTES,
  getDashboardPath,
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

  // 1) Akses halaman protected tanpa login → redirect ke /login
  if (pathIsProtected && !user) {
    const loginUrl = new URL(ROUTES.LOGIN, req.url);
    // Sertakan path asal sebagai query, biar setelah login bisa kembali
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2) Akses halaman auth (mis. /login) padahal sudah login →
  //    redirect ke dashboard sesuai role
  if (pathIsAuthOnly && user) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const dashboardPath = getDashboardPath(userData?.role);
    if (dashboardPath) {
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }
    // Kalau role tidak dikenali, biarkan user stay di /login
  }

  return res;
}

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
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
