// app/api/users/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperadmin, mapUserResponse } from "../route";

const BMS_ROLE_NAMES = ["superadmin", "customer_service", "marketing"] as const;
type BmsRoleName = (typeof BMS_ROLE_NAMES)[number];

function isBmsRoleName(v: unknown): v is BmsRoleName {
  return (
    typeof v === "string" && (BMS_ROLE_NAMES as readonly string[]).includes(v)
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/users/[id]
// ════════════════════════════════════════════════════════════════════════════

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireSuperadmin(supabase);
    if ("error" in auth) return auth.error;

    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id, email, full_name, username, phone,
        branch_id, role_id, status, last_login,
        created_at, updated_at,
        role:roles!users_role_id_fkey (
          id, name, role_group, description, permissions, allowed_stages
        ),
        branches:branches!users_branch_id_fkey (id, name, code)
      `,
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: mapUserResponse(data) });
  } catch (error) {
    console.error("[GET /api/users/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/users/[id]
// Body (semua optional):
//   - full_name, email, phone, password, branch_id
//   - role (BMS mode) ATAU role_id (untuk ganti role ke apa saja)
//
// Catatan: username tidak bisa diubah setelah create (design choice).
// ════════════════════════════════════════════════════════════════════════════
const admin = createAdminClient();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireSuperadmin(supabase);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { full_name, email, phone, password, branch_id, role, role_id } =
      body;

    const updatePayload: Record<string, unknown> = {};

    // full_name
    if (typeof full_name === "string" && full_name.trim()) {
      updatePayload.full_name = full_name.trim();
    }

    // email
    if (email !== undefined) {
      const normalizedEmail = email?.trim().toLowerCase() || null;
      if (normalizedEmail) {
        const { data: dup } = await supabase
          .from("users")
          .select("id")
          .eq("email", normalizedEmail)
          .neq("id", id)
          .is("deleted_at", null)
          .maybeSingle();
        if (dup) {
          return NextResponse.json(
            { error: "Email sudah digunakan user lain" },
            { status: 409 },
          );
        }
        updatePayload.email = normalizedEmail;
      } else {
        // users.email adalah NOT NULL — saat email dikosongkan (user OPRPRD tanpa
        // email asli), simpan dummy @internal.local agar constraint terpenuhi.
        const { data: u } = await supabase
          .from("users")
          .select("username")
          .eq("id", id)
          .single();
        updatePayload.email = `${u?.username ?? id}@internal.local`;
      }
    }

    // phone
    if (phone !== undefined) {
      updatePayload.phone = phone?.trim() || null;
    }

    // role — BMS mode (pakai string nama role)
    if (role !== undefined) {
      if (!isBmsRoleName(role)) {
        return NextResponse.json(
          {
            error: "Role harus: superadmin, customer_service, marketing",
          },
          { status: 400 },
        );
      }

      const { data: roleRec } = await supabase
        .from("roles")
        .select("id")
        .eq("name", role)
        .single();

      if (!roleRec) {
        return NextResponse.json(
          { error: `Role '${role}' tidak ditemukan` },
          { status: 500 },
        );
      }

      updatePayload.role_id = roleRec.id;

      // Non-Customer Service tidak perlu branch
      if (role !== "customer_service") {
        updatePayload.branch_id = null;
      }
    }

    // role_id — bisa dipakai untuk set role apa saja (termasuk non-BMS)
    if (role_id !== undefined && role === undefined) {
      const { data: roleRec } = await supabase
        .from("roles")
        .select("id, name")
        .eq("id", role_id)
        .single();

      if (!roleRec) {
        return NextResponse.json(
          { error: "Role tidak valid" },
          { status: 400 },
        );
      }

      updatePayload.role_id = roleRec.id;

      // Kalau role baru bukan Customer Service, clear branch_id
      if (roleRec.name !== "customer_service") {
        updatePayload.branch_id = null;
      }
    }

    // branch_id explicit
    if (branch_id !== undefined) {
      updatePayload.branch_id = branch_id || null;
    }

    // Password update via auth admin
    if (password) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { error: "Password minimal 6 karakter" },
          { status: 400 },
        );
      }

      const admin = createAdminClient();
      const { error: pwError } = await admin.auth.admin.updateUserById(id, {
        password,
      });

      if (pwError) {
        console.error("[PUT /api/users/:id] password error:", pwError.message);
        return NextResponse.json(
          { error: "Gagal mengubah password" },
          { status: 500 },
        );
      }
    }

    // Sync email ke auth.users kalau berubah
    // updatePayload.email dijamin non-null (lihat blok "email" di atas).
    if (updatePayload.email !== undefined) {
      const admin = createAdminClient();
      const { error: emailError } = await admin.auth.admin.updateUserById(id, {
        email: updatePayload.email as string,
      });

      if (emailError) {
        console.warn(
          "[PUT /api/users/:id] auth email sync warning:",
          emailError.message,
        );
      }
    }

    // Update public.users
    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await admin
        .from("users")
        .update(updatePayload)
        .eq("id", id);

      if (updateError) {
        console.error(
          "[PUT /api/users/:id] update error:",
          updateError.message,
        );
        return NextResponse.json(
          { error: "Gagal memperbarui user" },
          { status: 500 },
        );
      }
    }

    // Fetch terbaru
    const { data: updated } = await supabase
      .from("users")
      .select(
        `
        id, email, full_name, username, phone,
        branch_id, role_id, status, last_login,
        created_at, updated_at,
        role:roles!users_role_id_fkey (
          id, name, role_group, description, permissions, allowed_stages
        ),
        branches:branches!users_branch_id_fkey (id, name, code)
      `,
      )
      .eq("id", id)
      .single();

    try {
      await supabase.from("activity_logs").insert({
        user_id: auth.authUser.id,
        action: "UPDATE_USER",
        entity_type: "users",
        entity_id: id,
        new_data: updatePayload,
      });
    } catch {}

    return NextResponse.json({
      data: updated ? mapUserResponse(updated) : null,
    });
  } catch (error) {
    console.error("[PUT /api/users/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/users/[id] — khusus toggle status
// Body (pakai salah satu):
//   { status: 'active' | 'inactive' }   (untuk BMS)
//   { is_active: boolean }              (untuk OPRPRD, alias)
// ════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireSuperadmin(supabase);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { status, is_active } = body;

    // Tentukan status final dari dua bentuk input
    let newStatus: "active" | "inactive" | null = null;

    if (status === "active" || status === "inactive") {
      newStatus = status;
    } else if (typeof is_active === "boolean") {
      newStatus = is_active ? "active" : "inactive";
    }

    if (!newStatus) {
      return NextResponse.json(
        {
          error:
            "Harus menyertakan 'status' ('active'/'inactive') atau 'is_active' (boolean)",
        },
        { status: 400 },
      );
    }

    // Cegah superadmin menonaktifkan dirinya sendiri
    if (id === auth.authUser.id && newStatus === "inactive") {
      return NextResponse.json(
        { error: "Tidak bisa menonaktifkan akun Anda sendiri" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("users")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("[PATCH /api/users/:id]", error.message);
      return NextResponse.json(
        { error: "Gagal mengubah status" },
        { status: 500 },
      );
    }

    try {
      await supabase.from("activity_logs").insert({
        user_id: auth.authUser.id,
        action: `SET_USER_${newStatus.toUpperCase()}`,
        entity_type: "users",
        entity_id: id,
        new_data: { status: newStatus },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/users/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/users/[id]
// Soft delete di public.users + hard delete di auth.users (supaya tidak bisa login).
// ════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireSuperadmin(supabase);
    if ("error" in auth) return auth.error;

    // Cegah hapus diri sendiri
    if (id === auth.authUser.id) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus akun Anda sendiri" },
        { status: 400 },
      );
    }

    // Soft delete di public.users
    const { error: softDeleteError } = await supabase
      .from("users")
      .update({
        deleted_at: new Date().toISOString(),
        status: "inactive",
      })
      .eq("id", id);

    if (softDeleteError) {
      console.error("[DELETE /api/users/:id]", softDeleteError.message);
      return NextResponse.json(
        { error: "Gagal menghapus user" },
        { status: 500 },
      );
    }

    // Hard delete di auth.users
    const admin = createAdminClient();
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(id);

    if (authDeleteError) {
      console.warn(
        "[DELETE /api/users/:id] auth delete warning:",
        authDeleteError.message,
      );
    }

    try {
      await supabase.from("activity_logs").insert({
        user_id: auth.authUser.id,
        action: "DELETE_USER",
        entity_type: "users",
        entity_id: id,
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/users/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
