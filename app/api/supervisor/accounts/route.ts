// app/api/supervisor/accounts/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

async function verifySupervisorScope(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, full_name, role:roles!users_role_id_fkey(name, role_group)")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const roleName: string = getRoleProps(data).name;
  const _roleGroup: string = getRoleProps(data).role_group;

  if (roleName === "operational_supervisor") {
    return { supervisorId: userId, scopedGroup: "operational" as const, roleName };
  }
  if (roleName === "production_supervisor") {
    return { supervisorId: userId, scopedGroup: "production" as const, roleName };
  }
  // superadmin can also manage both — but this API is supervisor-only
  return null;
}

function mapAccount(u: { id: string; full_name: string; username: string; email: string; phone: string; status: string; last_login: string; created_at: string; role_id: string; role: unknown; pin_hash: string | null }) {
  return {
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    email: u.email,
    phone: u.phone,
    status: u.status,
    last_login: u.last_login,
    created_at: u.created_at,
    role_id: u.role_id,
    role: u.role as Record<string, unknown> | null,
    pin_hash: u.pin_hash ?? null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/supervisor/accounts
// Returns: { accounts, roles } — scoped to supervisor's team group
// ════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await verifySupervisorScope(authUser.id);
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const [accountsResult, rolesResult] = await Promise.allSettled([
      admin
        .from("users")
        .select(
          `id, full_name, username, email, phone, status, last_login, created_at, role_id, pin_hash,
           role:roles!users_role_id_fkey(id, name, role_group, description)`,
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),

      admin
        .from("roles")
        .select("id, name, role_group, description")
        .eq("role_group", scope.scopedGroup)
        .order("name"),
    ]);

    const allAccounts =
      accountsResult.status === "fulfilled" ? accountsResult.value.data ?? [] : [];

    // Filter by scoped role_group in application code
    const accounts = allAccounts.filter(
      (u) => getRoleProps(u).role_group === scope.scopedGroup,
    );

    const roles =
      rolesResult.status === "fulfilled" ? rolesResult.value.data ?? [] : [];

    return NextResponse.json({
      success: true,
      supervisor: { role: scope.roleName, scoped_group: scope.scopedGroup },
      accounts: accounts.map(mapAccount),
      roles,
    });
  } catch (err) {
    console.error("[GET /api/supervisor/accounts]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/supervisor/accounts
// Body: { full_name, username, password, role_id, email?, phone? }
// role_id must belong to supervisor's scoped role_group
// ════════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await verifySupervisorScope(authUser.id);
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { full_name, username, password, role_id, email, phone } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Nama lengkap wajib diisi" }, { status: 400 });
    }
    if (!username?.trim() || username.trim().length < 3) {
      return NextResponse.json({ error: "Username minimal 3 karakter" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    if (!role_id) {
      return NextResponse.json({ error: "Role wajib dipilih" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Validate role belongs to scoped group
    const { data: roleRec, error: roleErr } = await admin
      .from("roles")
      .select("id, name, role_group")
      .eq("id", role_id)
      .single();

    if (roleErr || !roleRec) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    if (roleRec.role_group !== scope.scopedGroup) {
      return NextResponse.json(
        { error: `Role ini tidak termasuk dalam tim ${scope.scopedGroup}` },
        { status: 403 },
      );
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email?.trim().toLowerCase() || null;

    // Cek duplikasi username
    const { data: dupUsername } = await admin
      .from("users")
      .select("id")
      .eq("username", normalizedUsername)
      .is("deleted_at", null)
      .maybeSingle();
    if (dupUsername) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
    }

    // Cek duplikasi email (jika diberikan)
    if (normalizedEmail) {
      const { data: dupEmail } = await admin
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .is("deleted_at", null)
        .maybeSingle();
      if (dupEmail) {
        return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
      }
    }

    const authEmail = normalizedEmail ?? `${normalizedUsername}@noreply.kodagede.id`;

    // Step 1: create auth user
    const { data: authData, error: authCreateErr } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role_id,
        username: normalizedUsername,
        // Save original password so PIN login can restore it after session creation
        workshop_password: password,
      },
    });

    if (authCreateErr || !authData.user) {
      console.error("[POST /api/supervisor/accounts] auth error:", authCreateErr?.message);
      if (authCreateErr?.message?.toLowerCase().includes("already")) {
        return NextResponse.json({ error: "Email atau username sudah terdaftar" }, { status: 409 });
      }
      return NextResponse.json(
        { error: `Gagal membuat akun: ${authCreateErr?.message ?? "unknown error"}` },
        { status: 500 },
      );
    }

    // Step 2: upsert public.users
    const upsertPayload: Record<string, unknown> = {
      id: authData.user.id,
      full_name: full_name.trim(),
      username: normalizedUsername,
      email: authEmail,
      role_id,
      status: "active",
    };
    if (phone?.trim()) upsertPayload.phone = phone.trim();

    const { data: newUser, error: upsertErr } = await admin
      .from("users")
      .upsert(upsertPayload, { onConflict: "id" })
      .select(
        `id, full_name, username, email, phone, status, last_login, created_at, role_id,
         role:roles!users_role_id_fkey(id, name, role_group, description)`,
      )
      .single();

    if (upsertErr || !newUser) {
      console.error("[POST /api/supervisor/accounts] upsert error:", upsertErr?.message);
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Gagal menyimpan profil akun" }, { status: 500 });
    }

    try {
      await supabase.from("activity_logs").insert({
        user_id: authUser.id,
        action: "CREATE_TEAM_USER",
        entity_type: "users",
        entity_id: newUser.id,
        new_data: { username: normalizedUsername, role_name: roleRec.name, role_group: roleRec.role_group },
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch (e) { console.warn("[POST /api/supervisor/accounts] activity_log failed:", e); }

    return NextResponse.json({ success: true, account: mapAccount(newUser as any) }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/supervisor/accounts]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
