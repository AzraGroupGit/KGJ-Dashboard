import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const qrToken = searchParams.get("qr_token");

    if (!qrToken) {
      return NextResponse.json(
        { error: "QR token wajib diisi" },
        { status: 400 },
      );
    }

    const { data: qrCode, error: qrError } = await admin
      .from("qr_codes")
      .select("role_id, roles:roles!qr_codes_role_id_fkey(name, role_group)")
      .eq("qr_token", qrToken)
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

    const { data: workers, error: workersError } = await admin
      .from("users")
      .select("id, full_name, username, pin_hash")
      .eq("role_id", qrCode.role_id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (workersError) {
      console.error("[GET /api/integrated-system/workshop/workers] Error:", workersError);
      return NextResponse.json(
        { error: "Gagal mengambil data pekerja" },
        { status: 500 },
      );
    }

    const safeWorkers = (workers || []).map((w) => ({
      id: w.id,
      full_name: w.full_name,
      username: w.username,
      has_pin: w.pin_hash !== null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        workers: safeWorkers,
        workstation: qrCode.roles
          ? (qrCode.roles as { name?: string }).name
          : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/workshop/workers] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
