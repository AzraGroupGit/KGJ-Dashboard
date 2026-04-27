// app/api/branches/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

async function requireSuperadmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, role:roles!users_role_id_fkey(name)")
    .eq("id", user.id)
    .single();

  if ((data?.role as any)?.name !== "superadmin") return null;
  return { id: data!.id };
}

/**
 * PUT /api/branches/[id]
 * Body: { name, code, address, phone?, email?, pic?, status? }
 * Hanya superadmin.
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const requester = await requireSuperadmin(supabase);

    if (!requester) {
      return NextResponse.json(
        { error: "Unauthorized atau Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, code, address, phone, email, pic, status } = body;

    if (!name || !code || !address) {
      return NextResponse.json(
        { error: "name, code, dan address wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("branches")
      .update({
        name,
        code: code.toUpperCase(),
        address,
        phone: phone || null,
        email: email || null,
        pic: pic || null,
        status: status || "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PUT /api/branches/:id]", error.message);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Kode cabang sudah digunakan" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal memperbarui data cabang" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      action: "UPDATE_BRANCH",
      entity_type: "branches",
      entity_id: id,
      new_data: { name, code, address, status },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PUT /api/branches/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/branches/[id]
 * Hapus cabang. Hanya superadmin.
 * Gagal jika masih ada user yang terhubung ke cabang ini.
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const requester = await requireSuperadmin(supabase);

    if (!requester) {
      return NextResponse.json(
        { error: "Unauthorized atau Forbidden" },
        { status: 403 },
      );
    }

    // Cek apakah masih ada user yang terhubung ke cabang ini
    const { count, error: countError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", id);

    if (countError) {
      console.error("[DELETE /api/branches/:id] count error:", countError.message);
      return NextResponse.json(
        { error: "Gagal memverifikasi data cabang" },
        { status: 500 },
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `Cabang masih memiliki ${count} pengguna aktif. Pindahkan atau hapus pengguna tersebut terlebih dahulu.`,
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabase
      .from("branches")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[DELETE /api/branches/:id]", deleteError.message);
      return NextResponse.json(
        { error: "Gagal menghapus data cabang" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      action: "DELETE_BRANCH",
      entity_type: "branches",
      entity_id: id,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/branches/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/branches/[id]
 * Body: { status: 'active' | 'inactive' }
 * Toggle status cabang. Hanya superadmin.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const requester = await requireSuperadmin(supabase);

    if (!requester) {
      return NextResponse.json(
        { error: "Unauthorized atau Forbidden" },
        { status: 403 },
      );
    }

    const { status } = await request.json();

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("branches")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, status")
      .single();

    if (error) {
      console.error("[PATCH /api/branches/:id]", error.message);
      return NextResponse.json(
        { error: "Gagal mengubah status cabang" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      action: status === "active" ? "ACTIVATE_BRANCH" : "DEACTIVATE_BRANCH",
      entity_type: "branches",
      entity_id: id,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/branches/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}