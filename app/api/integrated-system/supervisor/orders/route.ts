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
    const search = searchParams.get("search") || undefined;
    const stage = searchParams.get("stage") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    let query = db
      .from("legacy_orders")
      .select("*, tracking:tracking_stages(*)", { count: "exact" });

    if (stage) query = query.eq("tracking.current_stage", stage);
    if (status) query = query.eq("tracking.stage_status", status);

    const { data: orders, error, count } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: "Gagal memuat data order" },
        { status: 500 },
      );
    }

    let result = orders ?? [];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.kode_order?.toLowerCase().includes(s) ||
          o.nama?.toLowerCase().includes(s),
      );
    }

    return NextResponse.json({
      data: result,
      count: count ?? 0,
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/supervisor/orders]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
