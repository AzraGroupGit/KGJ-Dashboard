// app/api/users/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/users
 * Query params: role, status, limit
 * Hanya superadmin yang bisa melihat semua user.
 * Role lain hanya melihat user di branch yang sama.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500,
    );

    let query = supabase
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
        created_at,
        updated_at,
        branches!users_branch_id_fkey (
          id,
          name,
          code
        )
      `,
      )
      .order("full_name", { ascending: true })
      .limit(limit);

    if (role) query = query.eq("role", role);

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.eq("status", "active");
    }

    if (currentUser.role !== "superadmin") {
      if (currentUser.branch_id) {
        query = query.eq("branch_id", currentUser.branch_id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/users]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data user" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/users] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users
 * Body: { full_name, email, password, role, branch_id? }
 * Hanya superadmin.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUser?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { full_name, email, password, role, branch_id } = body;

    if (!full_name || !email || !password || !role) {
      return NextResponse.json(
        { error: "full_name, email, password, dan role wajib diisi" },
        { status: 400 },
      );
    }

    if (!["superadmin", "cs", "marketing"].includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Buat auth user
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("[POST /api/users] auth error:", authError?.message);
      if (authError?.message.includes("already")) {
        return NextResponse.json(
          { error: "Email sudah terdaftar" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal membuat akun auth" },
        { status: 500 },
      );
    }

    // Upsert profil ke tabel users (trigger Supabase mungkin sudah insert baris kosong)
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .upsert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        full_name,
        role,
        branch_id: branch_id || null,
        status: "active",
      })
      .select(
        `
        id, email, full_name, role, branch_id, status, created_at,
        branches!users_branch_id_fkey (id, name, code)
      `,
      )
      .single();

    if (insertError) {
      console.error("[POST /api/users] insert error:", insertError.message);
      // Rollback: hapus auth user agar tidak orphan
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Gagal menyimpan profil user" },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "CREATE_USER",
      entity_type: "users",
      entity_id: newUser.id,
      new_data: { full_name, email, role },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/users] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}