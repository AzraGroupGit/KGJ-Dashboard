import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();

    const { data: orders, error } = await db
      .from("legacy_orders")
      .select("*, tracking:tracking_stages(*)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });

    const all = orders ?? [];
    const total = all.length;
    const completed = all.filter((o) => o.tracking?.[0]?.stage_status === "completed").length;
    const inProgress = all.filter((o) => o.tracking?.[0]?.stage_status === "in_progress").length;
    const rework = all.filter((o) => o.tracking?.[0]?.stage_status === "rework").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const stageDistribution: Record<string, number> = {};
    for (const o of all) {
      const s = o.tracking?.[0]?.current_stage ?? "unknown";
      stageDistribution[s] = (stageDistribution[s] || 0) + 1;
    }

    return NextResponse.json({
      data: { total, completed, inProgress, rework, completionRate, stageDistribution },
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/admin/oprprd/analisis]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
