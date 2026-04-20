// app/api/users/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

async function getRequester(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return data;
}

/**
 * PUT /api/users/[id]
 * Body: { full_name?, email?, role?, branch_id?, password? }
 * Hanya superadmin.
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const requester = await getRequester(supabase);

    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (requester.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { full_name, email, role, branch_id, password } = body;

    if (!full_name || !email || !role) {
      return NextResponse.json(
        { error: "full_name, email, dan role wajib diisi" },
        { status: 400 },
      );
    }

    if (!["superadmin", "cs", "marketing"].includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Update email & optional password di auth
    const authUpdate: { email?: string; password?: string } = {
      email: email.trim().toLowerCase(),
    };
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password minimal 6 karakter" },
          { status: 400 },
        );
      }
      authUpdate.password = password;
    }

    const { error: authError } = await admin.auth.admin.updateUserById(
      id,
      authUpdate,
    );

    if (authError) {
      console.error("[PUT /api/users/:id] auth error:", authError.message);
      return NextResponse.json(
        { error: "Gagal memperbarui akun auth" },
        { status: 500 },
      );
    }

    // Update profil di tabel users
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        full_name,
        email: email.trim().toLowerCase(),
        role,
        branch_id: branch_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        id, email, full_name, role, branch_id, status, created_at, updated_at,
        branches!users_branch_id_fkey (id, name, code)
      `,
      )
      .single();

    if (updateError) {
      console.error("[PUT /api/users/:id] update error:", updateError.message);
      return NextResponse.json(
        { error: "Gagal memperbarui profil user" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      action: "UPDATE_USER",
      entity_type: "users",
      entity_id: id,
      new_data: { full_name, email, role },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("[PUT /api/users/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Body: { status: 'active' | 'inactive' }
 * Toggle status akun. Hanya superadmin.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const requester = await getRequester(supabase);

    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (requester.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cegah superadmin menonaktifkan dirinya sendiri
    if (id === requester.id) {
      return NextResponse.json(
        { error: "Tidak dapat mengubah status akun sendiri" },
        { status: 400 },
      );
    }

    const { status } = await request.json();

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("users")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      console.error("[PATCH /api/users/:id]", error.message);
      return NextResponse.json(
        { error: "Gagal mengubah status user" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      action: status === "active" ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entity_type: "users",
      entity_id: id,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/users/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Hapus akun auth + profil user. Hanya superadmin.
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const requester = await getRequester(supabase);

    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (requester.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cegah superadmin menghapus dirinya sendiri
    if (id === requester.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun sendiri" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Hapus profil dulu (FK constraint), lalu auth user
    const { error: deleteProfileError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteProfileError) {
      console.error("[DELETE /api/users/:id] profile:", deleteProfileError.message);
      return NextResponse.json(
        { error: "Gagal menghapus profil user" },
        { status: 500 },
      );
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error("[DELETE /api/users/:id] auth:", deleteAuthError.message);
      // Profil sudah terhapus — catat saja, tidak rollback
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      action: "DELETE_USER",
      entity_type: "users",
      entity_id: id,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/users/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}