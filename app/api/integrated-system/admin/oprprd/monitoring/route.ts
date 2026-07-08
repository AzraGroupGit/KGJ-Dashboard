import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const stage = searchParams.get("stage") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let query = db.from("legacy_orders").select("*, tracking:tracking_stages(*)", { count: "exact" });
    if (stage) query = query.eq("tracking.current_stage", stage);
    if (status) query = query.eq("tracking.stage_status", status);
    if (search) query = query.or(`kode_order.ilike.%${search}%,nama.ilike.%${search}%`);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });

    return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
  } catch (error) {
    console.error("[GET /api/integrated-system/admin/oprprd/monitoring]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
