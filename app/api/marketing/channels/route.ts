// app/api/marketing/channels/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/marketing/channels
 * Get all active marketing channels
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

    const { data, error } = await supabase
      .from("marketing_channels")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("[GET /api/marketing/channels]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data channel" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/marketing/channels] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
