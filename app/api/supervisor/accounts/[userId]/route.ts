// app/api/supervisor/accounts/[userId]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifySupervisorScope(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, role:roles!users_role_id_fkey(name, role_group)")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const roleName: string = (data.role as any)?.name ?? "";

  if (roleName === "operational_supervisor") {
    return { supervisorId: userId, scopedGroup: "operational" as const, roleName };
  }
  if (roleName === "production_supervisor") {
    return { supervisorId: userId, scopedGroup: "production" as const, roleName };
  }
  return null;
}

async function loadTargetUser(targetId: string, scopedGroup: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(
      `id, full_name, username, email, role_id, status,
       role:roles!users_role_id_fkey(id, name, role_group)`,
    )
    .eq("id", targetId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const roleGroup: string = (data.role as any)?.role_group ?? "";
  if (roleGroup !== scopedGroup) return null; // outside supervisor's scope

  return data;
}

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/supervisor/accounts/[userId]
// Accepts any subset of: { full_name, role_id, status, password }
// role_id must stay within scoped group
// ════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await verifySupervisorScope(authUser.id);
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await loadTargetUser(userId, scope.scopedGroup);
    if (!target) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan atau di luar tim Anda" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { full_name, role_id, status, password } = body;

    const admin = createAdminClient();
    const updatePayload: Record<string, unknown> = {};

    if (typeof full_name === "string" && full_name.trim()) {
      updatePayload.full_name = full_name.trim();
    }

    if (role_id !== undefined) {
      const { data: roleRec } = await admin
        .from("roles")
        .select("id, name, role_group")
        .eq("id", role_id)
        .single();

      if (!roleRec) {
        return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
      }
      if (roleRec.role_group !== scope.scopedGroup) {
        return NextResponse.json(
          { error: `Role ini tidak termasuk dalam tim ${scope.scopedGroup}` },
          { status: 403 },
        );
      }
      updatePayload.role_id = roleRec.id;
    }

    if (status === "active" || status === "inactive") {
      updatePayload.status = status;
    }

    if (password) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
      }
      // Read existing metadata so we don't overwrite other fields
      const { data: existingAuth } = await admin.auth.admin.getUserById(userId);
      const existingMeta = existingAuth?.user?.user_metadata ?? {};
      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { ...existingMeta, workshop_password: password },
      });
      if (pwErr) {
        console.error("[PATCH supervisor/accounts/:userId] pw error:", pwErr.message);
        return NextResponse.json({ error: "Gagal mengubah password" }, { status: 500 });
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateErr } = await admin
        .from("users")
        .update(updatePayload)
        .eq("id", userId);

      if (updateErr) {
        console.error("[PATCH supervisor/accounts/:userId]", updateErr.message);
        return NextResponse.json({ error: "Gagal memperbarui akun" }, { status: 500 });
      }
    }

    try {
      await supabase.from("activity_logs").insert({
        user_id: authUser.id,
        action: "UPDATE_TEAM_USER",
        entity_type: "users",
        entity_id: userId,
        new_data: { ...updatePayload, password_changed: !!password },
      });
    } catch (e) { console.warn("[PATCH /api/supervisor/accounts/:userId] activity_log failed:", e); }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/supervisor/accounts/:userId]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/supervisor/accounts/[userId]
// Soft-delete public.users + hard-delete auth.users
// ════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await verifySupervisorScope(authUser.id);
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await loadTargetUser(userId, scope.scopedGroup);
    if (!target) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan atau di luar tim Anda" },
        { status: 404 },
      );
    }

    const admin = createAdminClient();

    const { error: softErr } = await admin
      .from("users")
      .update({ deleted_at: new Date().toISOString(), status: "inactive" })
      .eq("id", userId);

    if (softErr) {
      console.error("[DELETE supervisor/accounts/:userId]", softErr.message);
      return NextResponse.json({ error: "Gagal menghapus akun" }, { status: 500 });
    }

    const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
    if (authDelErr) {
      console.warn("[DELETE supervisor/accounts/:userId] auth delete warn:", authDelErr.message);
    }

    try {
      await supabase.from("activity_logs").insert({
        user_id: authUser.id,
        action: "DELETE_TEAM_USER",
        entity_type: "users",
        entity_id: userId,
      });
    } catch (e) { console.warn("[DELETE /api/supervisor/accounts/:userId] activity_log failed:", e); }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/supervisor/accounts/:userId]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
