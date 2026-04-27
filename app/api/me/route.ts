// app/api/me/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        full_name,
        username,
        status,
        role:roles!users_role_id_fkey (
          id,
          name,
          role_group,
          permissions,
          allowed_stages
        )
      `,
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    if (userData.status !== "active") {
      return NextResponse.json(
        { error: "Akun tidak aktif" },
        { status: 403 },
      );
    }

    const roleObj = userData.role as any;

    return NextResponse.json({
      success: true,
      data: {
        id: userData.id,
        full_name: userData.full_name,
        username: userData.username,
        role: {
          id: roleObj?.id,
          name: roleObj?.name,
          role_group: roleObj?.role_group,
          permissions: roleObj?.permissions || {},
          allowed_stages: roleObj?.allowed_stages || [],
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/me] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
