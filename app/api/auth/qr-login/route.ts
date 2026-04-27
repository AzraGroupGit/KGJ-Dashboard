// app/api/auth/qr-login/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Nama pengguna dan kata sandi wajib diisi" },
        { status: 400 },
      );
    }

    // Admin client bypasses RLS for the pre-auth user lookup
    const admin = createAdminClient();

    const { data: userData, error: userError } = await admin
      .from("users")
      .select(
        `
        id,
        email,
        full_name,
        username,
        status,
        deleted_at,
        role:roles!users_role_id_fkey (
          id,
          name,
          role_group,
          permissions,
          allowed_stages
        )
      `,
      )
      .or(`username.eq.${username},email.eq.${username}`)
      .is("deleted_at", null)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan" },
        { status: 401 },
      );
    }

    if (userData.status !== "active") {
      return NextResponse.json(
        { error: "Akun tidak aktif. Hubungi administrator." },
        { status: 403 },
      );
    }

    const roleObj = userData.role as any;
    const roleName = roleObj?.name;
    const roleGroup = roleObj?.role_group;

    // QR login hanya untuk workshop + management (supervisor)
    const qrAllowedGroups = ["production", "operational", "management"];
    if (roleName !== "superadmin" && !qrAllowedGroups.includes(roleGroup)) {
      return NextResponse.json(
        {
          error:
            "Akun Anda tidak memiliki akses ke halaman workshop. Gunakan halaman login dashboard.",
        },
        { status: 403 },
      );
    }

    // Session client for signInWithPassword — must write the auth cookie
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    });

    if (authError) {
      let message = "Kata sandi salah";
      if (authError.message.includes("rate limit")) {
        message = "Terlalu banyak percobaan. Coba lagi nanti.";
      }
      return NextResponse.json({ error: message }, { status: 401 });
    }

    // Post-auth writes via admin client (avoids RLS dependency)
    await admin
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userData.id);

    await admin.from("activity_logs").insert({
      user_id: userData.id,
      action: "QR_LOGIN",
      entity_type: "auth",
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      user: {
        id: userData.id,
        fullName: userData.full_name,
        username: userData.username,
        role: roleName,
        roleDetail: {
          id: roleObj.id,
          name: roleObj.name,
          role_group: roleObj.role_group,
          permissions: roleObj.permissions,
          allowed_stages: roleObj.allowed_stages,
        },
      },
    });
  } catch (error) {
    console.error("[QR Login] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
