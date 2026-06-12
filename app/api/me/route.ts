// app/api/me/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

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

    const admin = createAdminClient();

    const { data: userData, error: userError } = await admin
      .from("users")
      .select(
        `
          id,
          full_name,
          username,
          status,
          pin_hash,
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

    const roleProps = getRoleProps(userData);

    return NextResponse.json({
      success: true,
      data: {
        id: userData.id,
        full_name: userData.full_name,
        username: userData.username,
        pin_hash: userData.pin_hash,
        role: {
          id: roleProps.id,
          name: roleProps.name,
          role_group: roleProps.role_group,
          permissions: roleProps.permissions,
          allowed_stages: roleProps.allowed_stages,
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
