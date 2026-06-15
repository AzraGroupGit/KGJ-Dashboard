import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { STAGE_SEQUENCE } from "@/lib/stages";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data: results, error } = await db
      .from("stage_results")
      .select("stage, started_at, finished_at")
      .not("finished_at", "is", null)
      .not("started_at", "is", null)
      .order("finished_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stageDurations: Record<string, number[]> = {};
    for (const stage of STAGE_SEQUENCE) {
      stageDurations[stage] = [];
    }

    for (const r of results) {
      const start = new Date(r.started_at).getTime();
      const end = new Date(r.finished_at).getTime();
      if (end <= start) continue;
      const hours = (end - start) / (1000 * 60 * 60);
      if (stageDurations[r.stage]) {
        stageDurations[r.stage].push(hours);
      }
    }

    const stageStats = STAGE_SEQUENCE.map((stage) => {
      const durs = stageDurations[stage];
      if (durs.length === 0) {
        return { stage, avg: null, median: null, p75: null, p95: null, count: 0 };
      }
      durs.sort((a, b) => a - b);
      const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
      const median =
        durs.length % 2 === 0
          ? (durs[durs.length / 2 - 1] + durs[durs.length / 2]) / 2
          : durs[Math.floor(durs.length / 2)];
      const p75 = durs[Math.floor(durs.length * 0.75)];
      const p95 = durs[Math.floor(durs.length * 0.95)];
      return {
        stage,
        avg: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        p75: Math.round(p75 * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        count: durs.length,
      };
    });

    return NextResponse.json({ stageStats });
  } catch (err) {
    console.error("[GET /api/analytics/stage-durations]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
