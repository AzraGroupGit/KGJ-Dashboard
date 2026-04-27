// app/api/cs/users/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cs/users
 * Returns active CS users accessible to the caller:
 *  - superadmin  → all active CS users
 *  - marketing   → CS users in the same branch
 *  - customer_service → only themselves
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser, error: profileError } = await supabase
      .from("users")
      .select("id, branch_id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    const roleName = (currentUser.role as any)?.name;

    // Resolve role_id for customer_service
    const { data: csRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "customer_service")
      .single();

    if (!csRole) {
      return NextResponse.json({ data: [] });
    }

    let query = supabase
      .from("users")
      .select(
        `
        id, full_name, email, branch_id,
        branches:branches!users_branch_id_fkey (id, name, code)
      `,
      )
      .eq("role_id", csRole.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (roleName === "marketing" && currentUser.branch_id) {
      query = query.eq("branch_id", currentUser.branch_id);
    } else if (roleName === "customer_service") {
      query = query.eq("id", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/cs/users]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data CS" },
        { status: 500 },
      );
    }

    const mapped = (data ?? []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      branch_id: u.branch_id,
      branch_name: u.branches?.name ?? null,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("[GET /api/cs/users] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
