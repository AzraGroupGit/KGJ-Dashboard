// app/api/roles/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/roles
 * Query params: role_group (optional filter)
 *
 * Return semua role yang tersedia untuk dipilih di form.
 * Semua authenticated user boleh fetch (RLS sudah izinkan SELECT).
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

    const { searchParams } = new URL(request.url);
    const roleGroup = searchParams.get("role_group");

    let query = supabase
      .from("roles")
      .select(`id, name, role_group, description, permissions, allowed_stages`)
      .order("role_group", { ascending: true })
      .order("name", { ascending: true });

    if (roleGroup) {
      query = query.eq("role_group", roleGroup);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/roles]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data role" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("[GET /api/roles] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
