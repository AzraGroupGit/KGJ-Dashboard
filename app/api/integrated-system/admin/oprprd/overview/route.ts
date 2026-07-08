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

    let query = db.from("legacy_orders").select("*, tracking:tracking_stages(*)", { count: "exact" });
    if (stage) query = query.eq("tracking.current_stage", stage);
    if (status) query = query.eq("tracking.stage_status", status);

    const { data: orders, error, count } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });

    let filtered = orders ?? [];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((o) => (o.kode_order?.toLowerCase().includes(s)) || (o.nama?.toLowerCase().includes(s)));
    }

    const total = filtered.length;
    const inProgress = filtered.filter((o) => o.tracking?.[0]?.stage_status === "in_progress").length;
    const completed = filtered.filter((o) => o.tracking?.[0]?.stage_status === "completed").length;
    const rework = filtered.filter((o) => o.tracking?.[0]?.stage_status === "rework").length;

    const stageCounts: Record<string, number> = {};
    for (const o of filtered) {
      const s = o.tracking?.[0]?.current_stage ?? "unknown";
      stageCounts[s] = (stageCounts[s] || 0) + 1;
    }

    const recentOrders = [...filtered]
      .sort((a, b) => new Date(b.tgl_order ?? 0).getTime() - new Date(a.tgl_order ?? 0).getTime())
      .slice(0, 5);

    return NextResponse.json({
      data: { total, inProgress, completed, rework, totalCount: count ?? 0, stageCounts, recentOrders },
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/admin/oprprd/overview]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
