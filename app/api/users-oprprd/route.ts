// app/api/users-oprprd/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/users-oprprd
 * Query params: role_group, is_active, limit
 * Hanya superadmin/management yang bisa melihat semua user.
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

    // Cek role user yang sedang login
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select(
        `
        id,
        role_id,
        roles (
          id,
          name,
          role_group
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    // Hanya management yang bisa akses
    if (currentUser.roles?.role_group !== "management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleGroup = searchParams.get("role_group");
    const isActive = searchParams.get("is_active");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500,
    );

    let query = supabase
      .from("users")
      .select(
        `
        id,
        username,
        full_name,
        email,
        phone,
        role_id,
        is_active,
        last_login_at,
        created_at,
        updated_at,
        roles!users_role_id_fkey (
          id,
          name,
          role_group,
          description,
          permissions,
          allowed_stages
        )
      `,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by role_group
    if (roleGroup) {
      query = query.eq("roles.role_group", roleGroup);
    }

    // Filter by is_active
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/users-oprprd]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data user" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/users-oprprd] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users-oprprd
 * Body: { username, full_name, email?, phone?, password, role_id }
 * Hanya management.
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

    // Cek role user yang sedang login
    const { data: currentUser } = await supabase
      .from("users")
      .select(
        `
        id,
        roles (
          role_group
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (currentUser?.roles?.[0]?.role_group !== "management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { username, full_name, email, phone, password, role_id } = body;

    // Validasi
    if (!username || !full_name || !password || !role_id) {
      return NextResponse.json(
        { error: "username, full_name, password, dan role_id wajib diisi" },
        { status: 400 },
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username minimal 3 karakter" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 },
      );
    }

    // Cek role_id valid
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, role_group")
      .eq("id", role_id)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    // Cek username sudah ada
    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .is("deleted_at", null)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 409 },
      );
    }

    // Cek email jika diisi
    if (email) {
      const { data: existingEmail } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .is("deleted_at", null)
        .single();

      if (existingEmail) {
        return NextResponse.json(
          { error: "Email sudah digunakan" },
          { status: 409 },
        );
      }
    }

    const admin = createAdminClient();

    // Buat auth user dengan email (gunakan email jika ada, jika tidak generate dummy email)
    const authEmail = email
      ? email.trim().toLowerCase()
      : `${username}@internal.kodagede.local`;

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          username,
        },
      });

    if (authError || !authData.user) {
      console.error("[POST /api/users-oprprd] auth error:", authError?.message);
      if (authError?.message.includes("already")) {
        return NextResponse.json(
          { error: "Email sudah terdaftar di sistem auth" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal membuat akun auth" },
        { status: 500 },
      );
    }

    // Hash password untuk disimpan di password_hash (backup)
    const { data: hashedPassword, error: hashError } = await supabase.rpc(
      "hash_password",
      { password_input: password },
    );

    if (hashError) {
      console.error("[POST /api/users-oprprd] hash error:", hashError);
      // Rollback auth user
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Gagal memproses password" },
        { status: 500 },
      );
    }

    // Insert ke tabel users
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        username,
        full_name,
        email: email ? email.trim().toLowerCase() : null,
        phone: phone || null,
        password_hash: hashedPassword,
        role_id,
        is_active: true,
      })
      .select(
        `
        id,
        username,
        full_name,
        email,
        phone,
        role_id,
        is_active,
        created_at,
        roles!users_role_id_fkey (
          id,
          name,
          role_group
        )
      `,
      )
      .single();

    if (insertError) {
      console.error(
        "[POST /api/users-oprprd] insert error:",
        insertError.message,
      );
      // Rollback: hapus auth user
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Gagal menyimpan profil user" },
        { status: 500 },
      );
    }

    // Log activity (opsional, jika ada tabel activity_logs)
    try {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "CREATE_USERS_OPRPRD",
        entity_type: "users",
        entity_id: newUser.id,
        new_data: { username, full_name, email, role_id },
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch (logError) {
      console.warn(
        "[POST /api/users-oprprd] failed to log activity:",
        logError,
      );
    }

    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/users-oprprd] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
