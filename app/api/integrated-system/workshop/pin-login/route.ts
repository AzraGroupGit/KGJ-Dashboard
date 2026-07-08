import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCKOUT_MINUTES = 5;

export async function POST(request: Request) {
  try {
    const { user_id, pin, qr_token, setup_pin } = await request.json();

    if (!user_id || !pin || !qr_token) {
      return NextResponse.json(
        { error: "User ID, PIN, dan QR token wajib diisi" },
        { status: 400 },
      );
    }

    if (typeof pin !== "string" || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN harus berupa 6 digit angka" },
        { status: 400 },
      );
    }

    if (setup_pin !== undefined) {
      if (typeof setup_pin !== "string" || setup_pin.length !== 6 || !/^\d{6}$/.test(setup_pin)) {
        return NextResponse.json(
          { error: "Setup PIN harus berupa 6 digit angka" },
          { status: 400 },
        );
      }
    }

    const admin = createAdminClient();

    const { data: qrCode, error: qrError } = await admin
      .from("qr_codes")
      .select("id, role_id, workstation_name, is_active, roles:roles!qr_codes_role_id_fkey(id, name, role_group, allowed_stages)")
      .eq("qr_token", qr_token)
      .eq("is_active", true)
      .single();

    if (qrError || !qrCode) {
      return NextResponse.json(
        { error: "QR Code tidak valid atau tidak aktif" },
        { status: 404 },
      );
    }

    const qrRoleGroup = (qrCode.roles as { role_group?: string } | null)?.role_group;
    const allowedGroups = ["production", "operational"];
    if (qrRoleGroup && !allowedGroups.includes(qrRoleGroup)) {
      return NextResponse.json(
        { error: "QR Code ini untuk akun management/supervisor. Gunakan halaman login dashboard." },
        { status: 403 },
      );
    }

    const { data: userData, error: userError } = await admin
      .from("users")
      .select("id, email, full_name, username, status, pin_hash, pin_attempts, pin_locked_until, role:roles!users_role_id_fkey(id, name, role_group, allowed_stages)")
      .eq("id", user_id)
      .is("deleted_at", null)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "Pekerja tidak ditemukan" },
        { status: 404 },
      );
    }

    if (userData.status !== "active") {
      return NextResponse.json(
        { error: "Akun tidak aktif. Hubungi administrator." },
        { status: 403 },
      );
    }

    if (userData.pin_locked_until) {
      const lockTime = new Date(userData.pin_locked_until);
      if (lockTime > new Date()) {
        const minsRemaining = Math.ceil((lockTime.getTime() - Date.now()) / 60000);
        return NextResponse.json(
          { error: `Akun terkunci. Coba lagi dalam ${minsRemaining} menit.` },
          { status: 429 },
        );
      }
      await admin.from("users").update({ pin_attempts: 0, pin_locked_until: null }).eq("id", user_id);
    }

    if (setup_pin !== undefined) {
      if (userData.pin_hash) {
        return NextResponse.json(
          { error: "PIN sudah ada. Gunakan fitur ubah PIN." },
          { status: 400 },
        );
      }

      const hashedPin = await bcrypt.hash(setup_pin, 10);
      await admin.from("users").update({
        pin_hash: hashedPin,
        pin_attempts: 0,
        pin_locked_until: null,
      }).eq("id", user_id);

      const roleProps = getRoleProps(userData);
      return NextResponse.json({
        success: true,
        message: "PIN berhasil dibuat",
        email: userData.email,
        workshopPassword: userData.username,
        user: {
          role: roleProps.name,
          roleDetail: {
            id: roleProps.id,
            name: roleProps.name,
            role_group: roleProps.role_group,
            description: roleProps.description,
          },
        },
      });
    }

    if (!userData.pin_hash) {
      return NextResponse.json({
        needs_pin_setup: true,
        message: "PIN belum dibuat. Silakan buat PIN baru.",
      });
    }

    const pinValid = await bcrypt.compare(pin, userData.pin_hash);

    if (!pinValid) {
      const newAttempts = (userData.pin_attempts || 0) + 1;
      const remaining = MAX_PIN_ATTEMPTS - newAttempts;

      if (remaining <= 0) {
        const lockUntil = new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60000).toISOString();
        await admin.from("users").update({
          pin_attempts: newAttempts,
          pin_locked_until: lockUntil,
        }).eq("id", user_id);

        return NextResponse.json(
          { error: `PIN salah. Akun terkunci selama ${PIN_LOCKOUT_MINUTES} menit.`, remaining_attempts: 0 },
          { status: 429 },
        );
      }

      await admin.from("users").update({ pin_attempts: newAttempts }).eq("id", user_id);

      return NextResponse.json(
        { error: `PIN salah. Sisa percobaan: ${remaining}`, remaining_attempts: remaining },
        { status: 401 },
      );
    }

    await admin.from("users").update({
      pin_attempts: 0,
      pin_locked_until: null,
      last_login: new Date().toISOString(),
    }).eq("id", user_id);

    const roleProps = getRoleProps(userData);
    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      email: userData.email,
      workshopPassword: userData.username,
      user: {
        role: roleProps.name,
        roleDetail: {
          id: roleProps.id,
          name: roleProps.name,
          role_group: roleProps.role_group,
          description: roleProps.description,
        },
      },
    });
  } catch (error) {
    console.error("[POST /api/integrated-system/workshop/pin-login] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
