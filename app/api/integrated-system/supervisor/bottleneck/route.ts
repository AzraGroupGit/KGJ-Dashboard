import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_SEQUENCE, STAGE_LABELS } from "@/services/integrated-system/tracking.service";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();

    const { data: orders, error } = await db
      .from("legacy_orders")
      .select("*, tracking:tracking_stages(*)")
      .neq("tracking.stage_status", "completed")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });

    const all = orders ?? [];
    const stageCounts = STAGE_SEQUENCE.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: all.filter((o) => o.tracking?.[0]?.current_stage === stage).length,
    }));

    const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);
    const oldestInStage = STAGE_SEQUENCE.map((stage) => {
      const items = all.filter((o) => o.tracking?.[0]?.current_stage === stage);
      if (items.length === 0) return { stage, label: STAGE_LABELS[stage], oldestDays: null, count: 0 };
      const oldest = items.reduce((prev, curr) => {
        const prevDate = new Date(prev.last_synced_at ?? prev.created_at);
        const currDate = new Date(curr.last_synced_at ?? curr.created_at);
        return currDate < prevDate ? curr : prev;
      });
      const days = Math.ceil((Date.now() - new Date(oldest.last_synced_at ?? oldest.created_at).getTime()) / 86400000);
      return { stage, label: STAGE_LABELS[stage], oldestDays: days, count: items.length };
    });

    return NextResponse.json({
      data: { stageCounts, maxCount, oldestInStage, totalActive: all.length },
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/supervisor/bottleneck]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
