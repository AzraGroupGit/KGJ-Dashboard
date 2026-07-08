import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Nama pengguna dan kata sandi wajib diisi" },
        { status: 400 },
      );
    }

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
        pin_hash,
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

    const roleProps = getRoleProps(userData);
    const roleName = roleProps.name;
    const roleGroup = roleProps.role_group;

    if (roleName === "superadmin") {
      return NextResponse.json(
        { error: "Akun Super Admin tidak dapat login melalui halaman workshop. Silakan gunakan halaman login dashboard." },
        { status: 403 },
      );
    }
    const qrAllowedGroups = ["production", "operational"];
    if (!qrAllowedGroups.includes(roleGroup)) {
      return NextResponse.json(
        { error: "Akun management/supervisor tidak dapat login di halaman ini. Gunakan halaman login dashboard." },
        { status: 403 },
      );
    }

    const supabase = await createClient();
    let { error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    });

    let clientPassword: string | null = null;

    if (!authError) {
      clientPassword = password;
    } else if (userData.pin_hash) {
      const pinValid = await bcrypt.compare(password, userData.pin_hash);
      if (pinValid) {
        const { data: authUser } = await admin.auth.admin.getUserById(userData.id);
        const loginPassword =
          authUser?.user?.user_metadata?.workshop_password ||
          userData.username ||
          password;
        try {
          await admin.auth.admin.updateUserById(userData.id, { password: loginPassword });
        } catch {
          // Non-critical — proceed anyway
        }
        const signInResult = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: loginPassword,
        });
        authError = signInResult.error ?? null;
        if (!authError) clientPassword = loginPassword;
      }
    }

    if (authError) {
      let message = "Kata sandi salah";
      if (authError.message.includes("rate limit")) {
        message = "Terlalu banyak percobaan. Coba lagi nanti.";
      }
      return NextResponse.json({ error: message }, { status: 401 });
    }

    await admin
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userData.id);

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      email: userData.email,
      workshopPassword: clientPassword,
      user: {
        role: roleName,
        roleDetail: {
          id: roleProps.id,
          name: roleProps.name,
          role_group: roleProps.role_group,
          description: roleProps.description,
        },
      },
    });
  } catch (error) {
    console.error("[POST /api/integrated-system/workshop/username-login] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
