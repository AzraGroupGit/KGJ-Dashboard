// app/api/qr-codes/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// Type definitions
interface Role {
  id: string;
  name: string;
  role_group: string;
  description: string | null;
}

interface QRCode {
  id: string;
  role_id: string;
  workstation_name: string;
  location: string | null;
  qr_token: string;
  qr_payload: string;
  is_active: boolean;
  generated_at: string;
  expired_at: string | null;
  roles: Role | null;
}

interface UserWithRole {
  id: string;
  roles: {
    name: string;
    role_group: string;
  } | null;
}

interface TransformedQRCode {
  id: string;
  role_id: string;
  role_name: string | undefined;
  role_group: string | undefined;
  workstation_name: string;
  location: string | null;
  qr_token: string;
  qr_payload: string;
  is_active: boolean;
  generated_at: string;
  expired_at: string | null;
}

/**
 * GET /api/qr-codes
 * Mendapatkan daftar QR Code (bisa filter berdasarkan role_group)
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

    const { searchParams } = new URL(request.url);
    const roleGroup = searchParams.get("role_group");
    const isActive = searchParams.get("is_active");

    // Query ke tabel qr_codes
    let query = supabase
      .from("qr_codes")
      .select(
        `
        id,
        role_id,
        workstation_name,
        location,
        qr_token,
        qr_payload,
        is_active,
        generated_at,
        expired_at,
        roles!qr_codes_role_id_fkey (
          id,
          name,
          role_group,
          description
        )
      `,
      )
      .order("generated_at", { ascending: false });

    if (roleGroup) {
      query = query.eq("roles.role_group", roleGroup);
    }

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/qr-codes]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data QR Code" },
        { status: 500 },
      );
    }

    // Transform data dengan type assertion
    const qrCodes = data as unknown as QRCode[];

    const transformedData: TransformedQRCode[] =
      qrCodes?.map((qr) => ({
        id: qr.id,
        role_id: qr.role_id,
        role_name: qr.roles?.name,
        role_group: qr.roles?.role_group,
        workstation_name: qr.workstation_name,
        location: qr.location,
        qr_token: qr.qr_token,
        qr_payload: qr.qr_payload,
        is_active: qr.is_active,
        generated_at: qr.generated_at,
        expired_at: qr.expired_at,
      })) || [];

    // Group by role_group
    const groupedData = {
      operational:
        transformedData?.filter((d) => d.role_group === "operational") || [],
      production:
        transformedData?.filter((d) => d.role_group === "production") || [],
      qc: transformedData?.filter((d) => d.role_group === "qc") || [],
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      grouped: groupedData,
    });
  } catch (error) {
    console.error("[GET /api/qr-codes] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/qr-codes
 * Generate QR Code baru
 * Body: { role_id, workstation_name, location, expired_at? }
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

    // Cek apakah user adalah superadmin
    const { data: currentUserData, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        roles!inner (
          name,
          role_group
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (userError || !currentUserData) {
      console.error("[POST /api/qr-codes] User error:", userError);
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const currentUser = currentUserData as unknown as UserWithRole;

    if (!currentUser.roles || currentUser.roles.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { role_id, workstation_name, location, expired_at } = body;

    if (!role_id || !workstation_name) {
      return NextResponse.json(
        { error: "role_id dan workstation_name wajib diisi" },
        { status: 400 },
      );
    }

    // Cek apakah role ada
    const { data: roleExists, error: roleError } = await supabase
      .from("roles")
      .select("id, name, role_group")
      .eq("id", role_id)
      .single();

    if (roleError || !roleExists) {
      return NextResponse.json(
        { error: "Role tidak ditemukan" },
        { status: 404 },
      );
    }

    // Cek apakah role dan workstation sudah punya QR aktif
    const { data: existingQR } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("role_id", role_id)
      .eq("workstation_name", workstation_name)
      .eq("is_active", true)
      .maybeSingle();

    if (existingQR) {
      return NextResponse.json(
        { error: "Workstation ini sudah memiliki QR Code aktif" },
        { status: 409 },
      );
    }

    // Generate QR token unik
    const qrToken = `QR-${randomBytes(16).toString("hex")}`;

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Buat URL params
    const loginUrl = new URL("/qr/login", appBaseUrl);
    loginUrl.searchParams.set("qr_token", qrToken);
    loginUrl.searchParams.set("workstation", workstation_name.trim());

    const qrPayload = loginUrl.toString();

    // Insert ke tabel qr_codes
    const { data: newQR, error: insertError } = await supabase
      .from("qr_codes")
      .insert({
        role_id,
        workstation_name: workstation_name.trim(),
        location: location?.trim() || null,
        qr_token: qrToken,
        qr_payload: qrPayload,
        is_active: true,
        generated_at: new Date().toISOString(),
        expired_at: expired_at || null,
      })
      .select(
        `
        id,
        role_id,
        workstation_name,
        location,
        qr_token,
        qr_payload,
        is_active,
        generated_at,
        expired_at,
        roles!qr_codes_role_id_fkey (
          id,
          name,
          role_group
        )
      `,
      )
      .single();

    if (insertError) {
      console.error("[POST /api/qr-codes] Insert error:", insertError);
      return NextResponse.json(
        { error: "Gagal membuat QR Code: " + insertError.message },
        { status: 500 },
      );
    }

    const qrCodeData = newQR as unknown as QRCode;

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "CREATE_QR_CODE",
      entity_type: "qr_codes",
      entity_id: qrCodeData.id,
      new_data: { role_id, workstation_name, location },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        success: true,
        message: "QR Code berhasil dibuat",
        data: {
          id: qrCodeData.id,
          role_id: qrCodeData.role_id,
          role_name: qrCodeData.roles?.name,
          role_group: qrCodeData.roles?.role_group,
          workstation_name: qrCodeData.workstation_name,
          location: qrCodeData.location,
          qr_token: qrCodeData.qr_token,
          qr_payload: qrCodeData.qr_payload,
          is_active: qrCodeData.is_active,
          generated_at: qrCodeData.generated_at,
          expired_at: qrCodeData.expired_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/qr-codes] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/qr-codes
 * Update status QR Code (aktif/nonaktif)
 * Query param: ?id=xxx
 * Body: { is_active: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cek superadmin
    const { data: currentUserData, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        roles!inner (
          name,
          role_group
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const currentUser = currentUserData as unknown as UserWithRole;

    if (!currentUser.roles || currentUser.roles.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json();
    const { is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Parameter id diperlukan" },
        { status: 400 },
      );
    }

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active harus berupa boolean" },
        { status: 400 },
      );
    }

    const { data: updatedQR, error: updateError } = await supabase
      .from("qr_codes")
      .update({ is_active })
      .eq("id", id)
      .select(
        `
        id,
        workstation_name,
        is_active,
        roles!qr_codes_role_id_fkey (
          name,
          role_group
        )
      `,
      )
      .single();

    if (updateError) {
      console.error("[PATCH /api/qr-codes]", updateError);
      return NextResponse.json(
        { error: "Gagal mengupdate QR Code" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: is_active ? "ACTIVATE_QR_CODE" : "DEACTIVATE_QR_CODE",
      entity_type: "qr_codes",
      entity_id: id,
      new_data: { is_active },
    });

    return NextResponse.json({
      success: true,
      message: `QR Code ${is_active ? "diaktifkan" : "dinonaktifkan"}`,
      data: updatedQR,
    });
  } catch (error) {
    console.error("[PATCH /api/qr-codes] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/qr-codes
 * Hapus QR Code
 * Query param: ?id=xxx
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cek superadmin
    const { data: currentUserData, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        roles!inner (
          name,
          role_group
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const currentUser = currentUserData as unknown as UserWithRole;

    if (!currentUser.roles || currentUser.roles.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Parameter id diperlukan" },
        { status: 400 },
      );
    }

    // Ambil data sebelum dihapus untuk log
    const { data: qrToDelete } = await supabase
      .from("qr_codes")
      .select("workstation_name, role_id")
      .eq("id", id)
      .single();

    const { error: deleteError } = await supabase
      .from("qr_codes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[DELETE /api/qr-codes]", deleteError);
      return NextResponse.json(
        { error: "Gagal menghapus QR Code" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "DELETE_QR_CODE",
      entity_type: "qr_codes",
      entity_id: id,
      old_data: qrToDelete,
    });

    return NextResponse.json({
      success: true,
      message: "QR Code berhasil dihapus",
    });
  } catch (error) {
    console.error("[DELETE /api/qr-codes] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
