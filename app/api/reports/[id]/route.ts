// app/api/reports/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/reports/[id]
 * Hanya superadmin.
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if ((currentUser?.role as any)?.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("reports").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/reports/:id]", error.message);
      return NextResponse.json(
        { error: "Gagal menghapus laporan" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "DELETE_REPORT",
      entity_type: "reports",
      entity_id: id,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/reports/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
