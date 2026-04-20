// app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAppRole } from "@/lib/routes";

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    console.log("=== LOGIN ATTEMPT ===");
    console.log("Email:", email);
    console.log("Role:", role);

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
      console.error("❌ Supabase Auth Error:", authError?.message);

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

    console.log("✅ Auth successful, user ID:", authData.user.id);

    // Ambil profil user
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        full_name,
        role,
        branch_id,
        status,
        last_login,
        branches (
          id,
          name,
          code
        )
      `,
      )
      .eq("id", authData.user.id)
      .single();

    if (userError || !userData) {
      console.error("❌ Profile fetch error:", userError?.message);
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

    if (userData.role !== role) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: `Anda tidak memiliki akses sebagai ${role}! (role Anda: ${userData.role})`,
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

    console.log("✅ Login successful for:", email);

    return NextResponse.json(
      {
        success: true,
        message: "Login berhasil!",
        user: {
          id: userData.id,
          email: userData.email,
          fullName: userData.full_name,
          role: userData.role,
          branch: userData.branches,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Unexpected login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server!" },
      { status: 500 },
    );
  }
}
