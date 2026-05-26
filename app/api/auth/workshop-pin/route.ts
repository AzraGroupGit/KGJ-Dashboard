import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { action, currentPin, newPin } = await request.json();

    if (!action || !newPin) {
      return NextResponse.json(
        { error: "Action dan PIN baru wajib diisi" },
        { status: 400 },
      );
    }

    if (action !== "set" && action !== "change") {
      return NextResponse.json(
        { error: "Action harus 'set' atau 'change'" },
        { status: 400 },
      );
    }

    if (typeof newPin !== "string" || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { error: "PIN harus berupa 6 digit angka" },
        { status: 400 },
      );
    }

    // Get current user from Supabase session
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "Sesi tidak valid. Silakan login ulang." },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    // Fetch user data with role info
    const { data: userData, error: userError } = await admin
      .from("users")
      .select("id, full_name, pin_hash, status, role:roles!users_role_id_fkey(id, name, role_group)")
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    if (userData.status !== "active") {
      return NextResponse.json(
        { error: "Akun tidak aktif. Hubungi administrator." },
        { status: 403 },
      );
    }

    const roleObj = userData.role as any;
    const roleGroup = roleObj?.role_group;

    // Only allow workshop roles (production, operational)
    if (roleGroup !== "production" && roleGroup !== "operational") {
      return NextResponse.json(
        { error: "Fitur ini hanya untuk pekerja workshop" },
        { status: 403 },
      );
    }

    if (action === "set") {
      if (userData.pin_hash) {
        return NextResponse.json(
          { error: "PIN sudah diatur. Gunakan 'Ubah PIN' jika ingin mengganti." },
          { status: 400 },
        );
      }

      const salt = await bcrypt.genSalt(10);
      const pinHash = await bcrypt.hash(newPin, salt);

      await admin
        .from("users")
        .update({
          pin_hash: pinHash,
          pin_attempts: 0,
          pin_locked_until: null,
        })
        .eq("id", userData.id);

      return NextResponse.json({
        success: true,
        message: "PIN berhasil diatur",
      });
    }

    if (action === "change") {
      if (!currentPin) {
        return NextResponse.json(
          { error: "PIN saat ini wajib diisi untuk mengubah PIN" },
          { status: 400 },
        );
      }

      if (!userData.pin_hash) {
        return NextResponse.json(
          { error: "PIN belum diatur. Gunakan 'Atur PIN' terlebih dahulu." },
          { status: 400 },
        );
      }

      const pinValid = await bcrypt.compare(currentPin, userData.pin_hash);
      if (!pinValid) {
        return NextResponse.json(
          { error: "PIN saat ini salah" },
          { status: 401 },
        );
      }

      const salt = await bcrypt.genSalt(10);
      const pinHash = await bcrypt.hash(newPin, salt);

      await admin
        .from("users")
        .update({
          pin_hash: pinHash,
          pin_attempts: 0,
          pin_locked_until: null,
        })
        .eq("id", userData.id);

      return NextResponse.json({
        success: true,
        message: "PIN berhasil diubah",
      });
    }

    return NextResponse.json(
      { error: "Action tidak valid" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Workshop PIN] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
