import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_SEQUENCE, getStageLabel } from "@/lib/stages";

export async function GET(_request: Request) {
  try {
    const db = createAdminClient();
    const stageLabels = STAGE_SEQUENCE.map((s) => getStageLabel(s));

    const { data: results, error } = await db
      .from("stage_results")
      .select("id, order_id, stage, started_at, finished_at, attempt_number")
      .not("finished_at", "is", null)
      .not("started_at", "is", null)
      .order("finished_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Duration per stage in hours, collected by stage key
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

    const cycleData = STAGE_SEQUENCE.map((stage, i) => {
      const durs = stageDurations[stage];
      if (durs.length === 0) {
        return {
          stage,
          label: stageLabels[i],
          count: 0,
          avg: null,
          min: null,
          max: null,
          median: null,
          p95: null,
        };
      }

      durs.sort((a, b) => a - b);
      const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
      const median =
        durs.length % 2 === 0
          ? (durs[durs.length / 2 - 1] + durs[durs.length / 2]) / 2
          : durs[Math.floor(durs.length / 2)];
      const p95 = durs[Math.floor(durs.length * 0.95)];

      return {
        stage,
        label: stageLabels[i],
        count: durs.length,
        avg: Math.round(avg * 100) / 100,
        min: Math.round(durs[0] * 100) / 100,
        max: Math.round(durs[durs.length - 1] * 100) / 100,
        median: Math.round(median * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
      };
    });

    // Monthly aggregated data for trend chart
    const monthlyBuckets: Record<string, Record<string, number[]>> = {};
    for (const r of results) {
      const m = r.finished_at.slice(0, 7);
      if (!monthlyBuckets[m]) monthlyBuckets[m] = {};
      if (!monthlyBuckets[m][r.stage]) monthlyBuckets[m][r.stage] = [];
      const start = new Date(r.started_at).getTime();
      const end = new Date(r.finished_at).getTime();
      if (end > start) {
        monthlyBuckets[m][r.stage].push((end - start) / (1000 * 60 * 60));
      }
    }

    const monthlyTrend = Object.entries(monthlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stages]) => {
        const agg: Record<string, number | null> = {};
        for (const stage of STAGE_SEQUENCE) {
          const durs = stages[stage];
          if (durs && durs.length > 0) {
            agg[stage] =
              Math.round(
                (durs.reduce((a, b) => a + b, 0) / durs.length) * 100,
              ) / 100;
          } else {
            agg[stage] = null;
          }
        }
        return { month, stages: agg };
      });

    return NextResponse.json({ cycleData, monthlyTrend });
  } catch (err) {
    console.error("[GET /api/analytics/cycle-time]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
