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
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    let query = db.from("legacy_orders").select("*, tracking:tracking_stages(*)", { count: "exact" });
    if (dateFrom) query = query.gte("tgl_order", dateFrom);
    if (dateTo) query = query.lte("tgl_order", dateTo);

    const { data: orders, error, count } = await query.order("created_at", { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });

    return NextResponse.json({ data: orders ?? [], count: count ?? 0 });
  } catch (error) {
    console.error("[GET /api/integrated-system/admin/oprprd/laporan]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
