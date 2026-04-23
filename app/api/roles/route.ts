// app/api/roles/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/roles
 * Query params: role_group (optional)
 * Hanya management yang bisa melihat semua roles.
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

    // Cek role user yang sedang login
    const { data: currentUser, error: currentUserError } = await supabase
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

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const roleGroup = searchParams.get("role_group");

    let query = supabase
      .from("roles")
      .select("*")
      .order("role_group", { ascending: true })
      .order("name", { ascending: true });

    // Filter by role_group jika ada
    if (roleGroup) {
      query = query.eq("role_group", roleGroup);
    }

    // Management bisa lihat semua, role lain hanya lihat roles tertentu
    if (currentUser.roles?.role_group !== "management") {
      // Non-management hanya bisa lihat roles dengan group yang sama
      if (currentUser.roles?.role_group) {
        query = query.eq("role_group", currentUser.roles.role_group);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/roles]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data roles" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/roles] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
