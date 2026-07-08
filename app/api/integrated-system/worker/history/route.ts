import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const { data, error, count } = await db
      .from("legacy_orders")
      .select("*, tracking:tracking_stages(*)", { count: "exact" })
      .eq("tracking.assigned_to", user.id)
      .order("last_synced_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      return NextResponse.json({ error: "Gagal memuat riwayat" }, { status: 500 });
    }

    return NextResponse.json({
      data: (data ?? []).filter((o) => o.tracking?.[0]?.stage_status === "completed"),
      count: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/worker/history]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
