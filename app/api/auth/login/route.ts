// app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAppRole } from "@/lib/routes";
import { isLoginRole } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password harus diisi!" },
        { status: 400 },
      );
    }

    if (!isAppRole(role)) {
      return NextResponse.json({ error: "Role tidak valid!" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (authError || !authData.user) {
      let userMessage = "Email atau password salah!";
      if (authError?.message.includes("Email not confirmed")) {
        userMessage = "Email belum dikonfirmasi. Silakan cek inbox Anda.";
      } else if (authError?.message.includes("rate limit")) {
        userMessage = "Terlalu banyak percobaan login. Coba lagi nanti.";
      }

      return NextResponse.json(
        {
          error: userMessage,
          ...(process.env.NODE_ENV === "development" && {
            debug: authError?.message,
          }),
        },
        { status: 401 },
      );
    }

    // Ambil profil user — JOIN ke tabel roles untuk dapat detail role lengkap
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        full_name,
        username,
        branch_id,
        status,
        last_login,
        role:roles!users_role_id_fkey (
          id,
          name,
          role_group,
          description,
          permissions
        ),
        branches:branches!users_branch_id_fkey (
          id,
          name,
          code
        )
      `,
      )
      .eq("id", authData.user.id)
      .is("deleted_at", null)
      .single();

    if (userError || !userData) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Profil user belum tersedia di database. Hubungi administrator.",
          ...(process.env.NODE_ENV === "development" && {
            debug: userError?.message,
          }),
        },
        { status: 404 },
      );
    }

    if (userData.status !== "active") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Akun Anda tidak aktif! Silahkan hubungi administrator." },
        { status: 403 },
      );
    }

    // role dari database = object { id, name, role_group, description, permissions }
    const roleObj = userData.role as any;
    const userRoleName = roleObj?.name;

    if (!userRoleName) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Akun Anda belum memiliki role yang valid. Hubungi administrator.",
        },
        { status: 403 },
      );
    }

    // Pastikan role user adalah LoginRole (superadmin/customer_service/marketing).
    // Role produksi/operasional lain tidak diizinkan login lewat halaman form ini —
    // mereka pakai halaman QR code terpisah.
    if (!isLoginRole(userRoleName)) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Akun Anda tidak dapat login di halaman ini. Silakan gunakan halaman login yang sesuai.",
        },
        { status: 403 },
      );
    }

    if (userRoleName !== role) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: `Anda tidak memiliki akses sebagai ${role}! (role Anda: ${userRoleName})`,
        },
        { status: 403 },
      );
    }

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userData.id);

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userData.id,
      action: "LOGIN",
      entity_type: "auth",
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    // Response struktur sesuai ClientUser di lib/auth/session.ts
    return NextResponse.json(
      {
        success: true,
        message: "Login berhasil!",
        user: {
          id: userData.id,
          email: userData.email,
          fullName: userData.full_name,
          username: userData.username ?? null,
          role: userRoleName,
          roleDetail: {
            id: roleObj.id,
            name: roleObj.name,
            role_group: roleObj.role_group,
            description: roleObj.description ?? null,
            permissions: roleObj.permissions ?? {
              can_read: false,
              can_insert: false,
              can_update: false,
              can_delete: false,
            },
          },
          branch: userData.branches ?? null,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server!" },
      { status: 500 },
    );
  }
}
