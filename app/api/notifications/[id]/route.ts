// app/api/notifications/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/[id]
 * Tandai satu notifikasi sebagai sudah dibaca.
 * Hanya bisa dilakukan oleh pemilik notifikasi.
 */
export async function PATCH(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user.id); // pastikan hanya bisa update milik sendiri

    if (error) {
      console.error("[PATCH /api/notifications/:id]", error.message);
      return NextResponse.json(
        { error: "Gagal memperbarui notifikasi" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/notifications/:id] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
