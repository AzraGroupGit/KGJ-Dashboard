// app/api/notifications/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/notifications
 * Query params: limit (default 20)
 * Mengembalikan notifikasi milik user yang sedang login.
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, link, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[GET /api/notifications]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil notifikasi" },
        { status: 500 },
      );
    }

    const unread_count = (data ?? []).filter((n) => !n.is_read).length;

    return NextResponse.json({ data: data ?? [], unread_count });
  } catch (error) {
    console.error("[GET /api/notifications] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/notifications
 * Tandai semua notifikasi milik user saat ini sebagai sudah dibaca.
 */
export async function PATCH() {
  try {
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
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("[PATCH /api/notifications]", error.message);
      return NextResponse.json(
        { error: "Gagal memperbarui notifikasi" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/notifications] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
