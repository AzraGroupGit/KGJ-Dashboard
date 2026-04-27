// app/api/users/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS & TYPES
// ════════════════════════════════════════════════════════════════════════════

const BMS_ROLE_NAMES = ["superadmin", "customer_service", "marketing"] as const;
const ALL_ROLE_GROUPS = [
  "management",
  "operational",
  "production",
  "marketing",
  "customer_service",
] as const;

type RoleGroup = (typeof ALL_ROLE_GROUPS)[number];
type BmsRoleName = (typeof BMS_ROLE_NAMES)[number];

function isBmsRoleName(v: unknown): v is BmsRoleName {
  return (
    typeof v === "string" && (BMS_ROLE_NAMES as readonly string[]).includes(v)
  );
}

function isValidRoleGroup(v: unknown): v is RoleGroup {
  return (
    typeof v === "string" && (ALL_ROLE_GROUPS as readonly string[]).includes(v)
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH HELPER  (export supaya bisa dipakai route lain seperti /api/users/[id])
// ════════════════════════════════════════════════════════════════════════════

export async function requireSuperadmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: currentUser, error } = await supabase
    .from("users")
    .select(`role:roles!users_role_id_fkey (name, role_group)`)
    .eq("id", user.id)
    .single();

  if (error || !currentUser) {
    return {
      error: NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      ),
    };
  }

  const role = currentUser.role as any;
  if (role?.name !== "superadmin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { authUser: user };
}

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE MAPPER  (export juga)
// ════════════════════════════════════════════════════════════════════════════

export function mapUserResponse(dbUser: any) {
  const roleObj = dbUser.role;
  const roleName = roleObj?.name ?? null;

  return {
    // Common fields
    id: dbUser.id,
    email: dbUser.email,
    full_name: dbUser.full_name,
    username: dbUser.username,
    phone: dbUser.phone,
    branch_id: dbUser.branch_id,
    branches: dbUser.branches ?? null,
    status: dbUser.status,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,

    // Role info (dual format untuk kompat BMS & OPRPRD)
    role: roleName, // string — untuk frontend BMS
    role_id: dbUser.role_id,
    roles: roleObj, // object — untuk frontend OPRPRD

    // Status dual format
    is_active: dbUser.status === "active",
    last_login: dbUser.last_login,
    last_login_at: dbUser.last_login,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/users
// Query params:
//   - role_group: 'management' | 'operational' | 'production' | 'marketing' | 'customer_service'
//                 (bisa comma-separated: 'operational,production')
//   - role_name:  filter spesifik nama role (customer_service, marketing, qc_1, dll)
//   - status:     'active' | 'inactive'
//   - is_active:  'true' | 'false' (alias status, untuk kompat OPRPRD)
//   - limit:      default 100, max 500
// ════════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireSuperadmin(supabase);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);

    const roleGroupParam = searchParams.get("role_group");
    const roleGroups = roleGroupParam
      ? roleGroupParam
          .split(",")
          .map((g) => g.trim())
          .filter(isValidRoleGroup)
      : null;

    const roleName = searchParams.get("role_name");
    const status = searchParams.get("status");
    const isActive = searchParams.get("is_active");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500,
    );

    let query = supabase
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
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status === "active" || status === "inactive") {
      query = query.eq("status", status);
    } else if (isActive === "true") {
      query = query.eq("status", "active");
    } else if (isActive === "false") {
      query = query.eq("status", "inactive");
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/users]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data user" },
        { status: 500 },
      );
    }

    // Filter role_group & role_name di aplikasi
    let filtered = data ?? [];
    if (roleGroups && roleGroups.length > 0) {
      filtered = filtered.filter((u: any) =>
        roleGroups.includes(u.role?.role_group),
      );
    }
    if (roleName) {
      filtered = filtered.filter((u: any) => u.role?.name === roleName);
    }

    return NextResponse.json({
      data: filtered.map(mapUserResponse),
      count: filtered.length,
    });
  } catch (error) {
    console.error("[GET /api/users] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/users — mendukung 2 mode
//
// MODE 1 (BMS): { full_name, email, password, role, branch_id? }
//   role: 'superadmin' | 'customer_service' | 'marketing'
//
// MODE 2 (OPRPRD): { username, full_name, email?, phone?, password, role_id }
//   role_id: UUID dari tabel roles (harus non-BMS)
//
// Deteksi: field `role` (string) → MODE 1, field `role_id` → MODE 2
// ════════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireSuperadmin(supabase);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const {
      full_name,
      email,
      password,
      role,
      role_id,
      username,
      phone,
      branch_id,
    } = body;

    // Validasi dasar
    if (!full_name?.trim() || !password) {
      return NextResponse.json(
        { error: "Nama lengkap dan password wajib diisi" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 },
      );
    }

    const isBmsMode = typeof role === "string";
    const isOprprdMode = typeof role_id === "string" && !isBmsMode;

    if (!isBmsMode && !isOprprdMode) {
      return NextResponse.json(
        {
          error:
            "Harus menyertakan 'role' (untuk BMS) atau 'role_id' (untuk Operasional/Produksi)",
        },
        { status: 400 },
      );
    }

    // Resolve role
    let finalRoleId: string;
    let finalRoleName: string;
    let finalRoleGroup: string;

    if (isBmsMode) {
      if (!isBmsRoleName(role)) {
        return NextResponse.json(
          {
            error:
              "Role harus salah satu: superadmin, customer_service, marketing",
          },
          { status: 400 },
        );
      }
      if (!email?.trim()) {
        return NextResponse.json(
          { error: "Email wajib diisi untuk user BMS" },
          { status: 400 },
        );
      }
      if (role === "customer_service" && !branch_id) {
        return NextResponse.json(
          { error: "Cabang wajib dipilih untuk role Customer Service" },
          { status: 400 },
        );
      }

      const { data: roleRec } = await supabase
        .from("roles")
        .select("id, name, role_group")
        .eq("name", role)
        .single();

      if (!roleRec) {
        return NextResponse.json(
          { error: `Role '${role}' tidak ditemukan di database` },
          { status: 500 },
        );
      }
      finalRoleId = roleRec.id;
      finalRoleName = roleRec.name;
      finalRoleGroup = roleRec.role_group;
    } else {
      // OPRPRD mode
      if (!username?.trim() || username.trim().length < 3) {
        return NextResponse.json(
          { error: "Username minimal 3 karakter" },
          { status: 400 },
        );
      }

      const { data: roleRec } = await supabase
        .from("roles")
        .select("id, name, role_group")
        .eq("id", role_id)
        .single();

      if (!roleRec) {
        return NextResponse.json(
          { error: "Role tidak valid" },
          { status: 400 },
        );
      }

      if ((BMS_ROLE_NAMES as readonly string[]).includes(roleRec.name)) {
        return NextResponse.json(
          {
            error:
              "Untuk role BMS, gunakan field 'role' (string), bukan 'role_id'",
          },
          { status: 400 },
        );
      }

      finalRoleId = roleRec.id;
      finalRoleName = roleRec.name;
      finalRoleGroup = roleRec.role_group;
    }

    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedUsername = username?.trim() || null;

    // Cek duplikasi
    if (normalizedEmail) {
      const { data: dup } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .is("deleted_at", null)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { error: "Email sudah digunakan" },
          { status: 409 },
        );
      }
    }

    if (normalizedUsername) {
      const { data: dup } = await supabase
        .from("users")
        .select("id")
        .eq("username", normalizedUsername)
        .is("deleted_at", null)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { error: "Username sudah digunakan" },
          { status: 409 },
        );
      }
    }

    const admin = createAdminClient();

    // Generate auth email — kalau user tidak punya email asli, pakai dummy
    const authEmail = normalizedEmail ?? `${normalizedUsername}@internal.local`;

    // Step 1: Buat auth user. Trigger handle_new_user otomatis insert ke public.users
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          role_id: finalRoleId,
          ...(normalizedUsername ? { username: normalizedUsername } : {}),
        },
      });

    if (authError || !authData.user) {
      console.error("[POST /api/users] auth error:", authError?.message);
      if (authError?.message?.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: "Email atau username sudah terdaftar" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal membuat akun auth" },
        { status: 500 },
      );
    }

    // Step 2: Upsert public.users dengan data lengkap
    // Gunakan authEmail (bukan normalizedEmail) karena users.email adalah NOT NULL —
    // untuk user tanpa email asli, authEmail sudah berisi dummy @internal.local.
    const updatePayload: Record<string, unknown> = {
      full_name: full_name.trim(),
      role_id: finalRoleId,
      email: authEmail,
    };

    if (normalizedUsername) updatePayload.username = normalizedUsername;
    if (phone?.trim()) updatePayload.phone = phone.trim();
    updatePayload.branch_id =
      isBmsMode && role === "customer_service" ? branch_id : null;

    // Pakai upsert agar tetap berjalan meski trigger handle_new_user tidak
    // sempat meng-insert baris public.users (misalnya saat role_id belum ada).
    const { data: updated, error: updateError } = await admin
      .from("users")
      .upsert(
        { id: authData.user.id, ...updatePayload, status: "active" },
        { onConflict: "id" },
      )
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
      .single();

    if (updateError || !updated) {
      console.error("[POST /api/users] upsert error:", updateError?.message);
      await admin.auth.admin.deleteUser(authData.user.id); // rollback
      return NextResponse.json(
        { error: "Gagal menyimpan profil user" },
        { status: 500 },
      );
    }

    try {
      await supabase.from("activity_logs").insert({
        user_id: auth.authUser.id,
        action: "CREATE_USER",
        entity_type: "users",
        entity_id: updated.id,
        new_data: {
          email: normalizedEmail,
          username: normalizedUsername,
          role_name: finalRoleName,
          role_group: finalRoleGroup,
        },
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch {}

    return NextResponse.json(
      { data: mapUserResponse(updated) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/users] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
