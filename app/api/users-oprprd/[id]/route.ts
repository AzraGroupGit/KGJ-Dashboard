// app/api/users-oprprd/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/users-oprprd/[id]
 * Mendapatkan detail user OPRPRD
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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
        roles (
          role_group
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (currentUser?.roles?.role_group !== "management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
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
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("[GET /api/users-oprprd/[id]]", error.message);
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/users-oprprd/[id]] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/users-oprprd/[id]
 * Update user OPRPRD
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (currentUser?.roles?.role_group !== "management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { username, full_name, email, phone, password, role_id } = body;

    // Build update data
    const updateData: any = {
      full_name,
      email: email?.trim().toLowerCase() || null,
      phone: phone || null,
      role_id,
      updated_at: new Date().toISOString(),
    };

    // Update username jika berubah
    if (username) {
      const { data: existingUsername } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", id)
        .is("deleted_at", null)
        .single();

      if (existingUsername) {
        return NextResponse.json(
          { error: "Username sudah digunakan" },
          { status: 409 },
        );
      }
      updateData.username = username;
    }

    // Update email jika berubah
    if (email) {
      const { data: existingEmail } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .neq("id", id)
        .is("deleted_at", null)
        .single();

      if (existingEmail) {
        return NextResponse.json(
          { error: "Email sudah digunakan" },
          { status: 409 },
        );
      }
    }

    // Update password jika diisi
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password minimal 6 karakter" },
          { status: 400 },
        );
      }

      const admin = createAdminClient();

      // Update password di Auth
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(
        id,
        { password },
      );

      if (authUpdateError) {
        console.error(
          "[PUT /api/users-oprprd/[id]] auth update error:",
          authUpdateError,
        );
        return NextResponse.json(
          { error: "Gagal mengupdate password di auth" },
          { status: 500 },
        );
      }

      // Update password_hash di tabel users
      const { data: hashedPassword, error: hashError } = await supabase.rpc(
        "hash_password",
        { password_input: password },
      );

      if (!hashError && hashedPassword) {
        updateData.password_hash = hashedPassword;
      }
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        id,
        username,
        full_name,
        email,
        phone,
        role_id,
        is_active,
        updated_at,
        roles!users_role_id_fkey (
          id,
          name,
          role_group
        )
      `,
      )
      .single();

    if (updateError) {
      console.error(
        "[PUT /api/users-oprprd/[id]] update error:",
        updateError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengupdate user" },
        { status: 500 },
      );
    }

    // Log activity
    try {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "UPDATE_USERS_OPRPRD",
        entity_type: "users",
        entity_id: id,
        new_data: { username, full_name, email, role_id },
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch (logError) {
      console.warn(
        "[PUT /api/users-oprprd/[id]] failed to log activity:",
        logError,
      );
    }

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("[PUT /api/users-oprprd/[id]] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/users-oprprd/[id]
 * Partial update (toggle status)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (currentUser?.roles?.role_group !== "management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        id,
        username,
        full_name,
        is_active,
        updated_at
      `,
      )
      .single();

    if (updateError) {
      console.error(
        "[PATCH /api/users-oprprd/[id]] update error:",
        updateError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengupdate status user" },
        { status: 500 },
      );
    }

    // Log activity
    try {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: body.is_active
          ? "ACTIVATE_USERS_OPRPRD_USER"
          : "DEACTIVATE_USERS_OPRPRD_USER",
        entity_type: "users",
        entity_id: id,
        new_data: { is_active: body.is_active },
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch (logError) {
      console.warn(
        "[PATCH /api/users-oprprd/[id]] failed to log activity:",
        logError,
      );
    }

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("[PATCH /api/users-oprprd/[id]] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/users-oprprd/[id]
 * Soft delete user OPRPRD
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (currentUser?.roles?.role_group !== "management") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ambil data user sebelum dihapus untuk snapshot
    const { data: userBeforeDelete } = await supabase
      .from("users")
      .select("username, full_name, email, role_id")
      .eq("id", id)
      .single();

    // Soft delete
    const { error: deleteError } = await supabase
      .from("users")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (deleteError) {
      console.error(
        "[DELETE /api/users-oprprd/[id]] delete error:",
        deleteError.message,
      );
      return NextResponse.json(
        { error: "Gagal menghapus user" },
        { status: 500 },
      );
    }

    // Log ke data_deletion_logs
    await supabase.from("data_deletion_logs").insert({
      deleted_by: user.id,
      target_table: "users",
      target_id: id,
      deletion_type: "soft",
      snapshot: userBeforeDelete,
      reason: "Dihapus melalui admin panel OPRPRD",
    });

    // Log activity
    try {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "DELETE_USERS_OPRPRD_USER",
        entity_type: "users",
        entity_id: id,
        new_data: { deleted_at: new Date().toISOString() },
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch (logError) {
      console.warn(
        "[DELETE /api/users-oprprd/[id]] failed to log activity:",
        logError,
      );
    }

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus",
    });
  } catch (error) {
    console.error("[DELETE /api/users-oprprd/[id]] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
