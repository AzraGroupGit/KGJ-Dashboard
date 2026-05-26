import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

const ALLOWED_ROLES = ["operational_supervisor", "production_supervisor", "supervisor"];

interface Role {
  id: string;
  name: string;
  role_group: string;
  description: string | null;
  allowed_stages: string[] | null;
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
  role: {
    name: string;
    role_group: string;
  } | null;
}

async function checkAuth(request: Request): Promise<{ user: any; error?: NextResponse }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, role:roles!users_role_id_fkey(name, role_group)")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return { user: null, error: NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 }) };
  }

  const u = userData as unknown as UserWithRole;
  if (!u.role || !ALLOWED_ROLES.includes(u.role.name)) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: u };
}

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { error: authErr } = await checkAuth(request);
    if (authErr) return authErr;

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const roleGroup = searchParams.get("role_group");
    const isActive = searchParams.get("is_active");

    let query = admin
      .from("qr_codes")
      .select(`
        id, role_id, workstation_name, location, qr_token, qr_payload,
        is_active, generated_at, expired_at,
        roles!qr_codes_role_id_fkey(id, name, role_group, description, allowed_stages)
      `)
      .order("generated_at", { ascending: false });

    if (roleGroup) query = query.eq("roles.role_group", roleGroup);
    if (isActive !== null) query = query.eq("is_active", isActive === "true");

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Gagal mengambil data QR Code" }, { status: 500 });
    }

    const qrCodes = (data as unknown as QRCode[])?.map((qr) => ({
      id: qr.id,
      role_id: qr.role_id,
      role_name: qr.roles?.name,
      role_group: qr.roles?.role_group,
      allowed_stages: qr.roles?.allowed_stages ?? [],
      workstation_name: qr.workstation_name,
      location: qr.location,
      qr_token: qr.qr_token,
      qr_payload: qr.qr_payload,
      is_active: qr.is_active,
      generated_at: qr.generated_at,
      expired_at: qr.expired_at,
    })) || [];

    return NextResponse.json({
      success: true,
      data: qrCodes,
      grouped: {
        operational: qrCodes.filter((d) => d.role_group === "operational"),
        production: qrCodes.filter((d) => d.role_group === "production"),
      },
    });
  } catch (error) {
    console.error("[GET /api/supervisor/qr-codes]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { user, error: authErr } = await checkAuth(request);
    if (authErr) return authErr;

    const admin = createAdminClient();
    const body = await request.json();
    const { role_id, workstation_name, location, expired_at } = body;

    if (!role_id || !workstation_name) {
      return NextResponse.json({ error: "role_id dan workstation_name wajib diisi" }, { status: 400 });
    }

    const { data: roleExists } = await admin
      .from("roles")
      .select("id, name, role_group")
      .eq("id", role_id)
      .single();

    if (!roleExists) {
      return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 });
    }

    const { data: existingQR } = await admin
      .from("qr_codes")
      .select("id")
      .eq("role_id", role_id)
      .eq("workstation_name", workstation_name)
      .eq("is_active", true)
      .maybeSingle();

    if (existingQR) {
      return NextResponse.json({ error: "Workstation ini sudah memiliki QR Code aktif" }, { status: 409 });
    }

    const qrToken = `QR-${randomBytes(16).toString("hex")}`;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const loginUrl = new URL("/workshop/login", appBaseUrl);
    loginUrl.searchParams.set("qr_token", qrToken);
    loginUrl.searchParams.set("workstation", workstation_name.trim());
    const qrPayload = loginUrl.toString();

    const { data: newQR, error: insertError } = await admin
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
      .select(`
        id, role_id, workstation_name, location, qr_token, qr_payload,
        is_active, generated_at, expired_at,
        roles!qr_codes_role_id_fkey(id, name, role_group)
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Gagal membuat QR Code: " + insertError.message }, { status: 500 });
    }

    const qrCodeData = newQR as unknown as QRCode;

    await admin.from("activity_logs").insert({
      user_id: user.id,
      action: "CREATE_QR_CODE",
      entity_type: "qr_codes",
      entity_id: qrCodeData.id,
      new_data: { role_id, workstation_name, location },
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
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
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/supervisor/qr-codes]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// ── PATCH ────────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const { user, error: authErr } = await checkAuth(request);
    if (authErr) return authErr;

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json();
    const { is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Parameter id diperlukan" }, { status: 400 });
    }
    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active harus berupa boolean" }, { status: 400 });
    }

    const { data: updatedQR, error: updateError } = await admin
      .from("qr_codes")
      .update({ is_active })
      .eq("id", id)
      .select(`id, workstation_name, is_active, roles!qr_codes_role_id_fkey(name, role_group)`)
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Gagal mengupdate QR Code" }, { status: 500 });
    }

    await admin.from("activity_logs").insert({
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
    console.error("[PATCH /api/supervisor/qr-codes]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const { user, error: authErr } = await checkAuth(request);
    if (authErr) return authErr;

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Parameter id diperlukan" }, { status: 400 });
    }

    const { data: qrToDelete } = await admin
      .from("qr_codes")
      .select("workstation_name, role_id")
      .eq("id", id)
      .single();

    const { error: deleteError } = await admin.from("qr_codes").delete().eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Gagal menghapus QR Code" }, { status: 500 });
    }

    await admin.from("activity_logs").insert({
      user_id: user.id,
      action: "DELETE_QR_CODE",
      entity_type: "qr_codes",
      entity_id: id,
      old_data: qrToDelete,
    });

    return NextResponse.json({ success: true, message: "QR Code berhasil dihapus" });
  } catch (error) {
    console.error("[DELETE /api/supervisor/qr-codes]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
