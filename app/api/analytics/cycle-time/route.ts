import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_SEQUENCE, getStageLabel } from "@/lib/stages";

export async function GET(_request: Request) {
  try {
    const db = createAdminClient();

    const { data: transitions, error } = await db
      .from("order_stage_transitions")
      .select("order_id, from_stage, to_stage, transitioned_at")
      .order("order_id", { ascending: true })
      .order("transitioned_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group transitions by order, then compute duration per stage
    const stageDurations: Record<string, number[]> = {};
    for (const stage of STAGE_SEQUENCE) {
      stageDurations[stage] = [];
    }

    const orderGroups: Record<string, any[]> = {};
    for (const t of transitions) {
      if (!orderGroups[t.order_id]) orderGroups[t.order_id] = [];
      orderGroups[t.order_id].push(t);
    }

    for (const orderId of Object.keys(orderGroups)) {
      const txns = orderGroups[orderId];
      for (let i = 0; i < txns.length; i++) {
        const enteredStage = txns[i].to_stage;
        if (!stageDurations[enteredStage]) continue;

        // Duration = time until the next transition leaves this stage
        const nextTxn = txns[i + 1];
        const endTime = nextTxn
          ? new Date(nextTxn.transitioned_at).getTime()
          : Date.now();
        const startTime = new Date(txns[i].transitioned_at).getTime();
        const hours = (endTime - startTime) / (1000 * 60 * 60);

        stageDurations[enteredStage].push(hours);
      }
    }

    const stageLabels = STAGE_SEQUENCE.map((s) => getStageLabel(s));

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

    // Monthly trend from transitions
    const monthlyBuckets: Record<string, Record<string, number[]>> = {};
    for (const orderId of Object.keys(orderGroups)) {
      const txns = orderGroups[orderId];
      for (let i = 0; i < txns.length; i++) {
        const enteredStage = txns[i].to_stage;
        if (!stageDurations[enteredStage]) continue;

        const nextTxn = txns[i + 1];
        const endTime = nextTxn
          ? new Date(nextTxn.transitioned_at).getTime()
          : Date.now();
        const startTime = new Date(txns[i].transitioned_at).getTime();
        const hours = (endTime - startTime) / (1000 * 60 * 60);

        const month = txns[i].transitioned_at.slice(0, 7);
        if (!monthlyBuckets[month]) monthlyBuckets[month] = {};
        if (!monthlyBuckets[month][enteredStage])
          monthlyBuckets[month][enteredStage] = [];
        monthlyBuckets[month][enteredStage].push(hours);
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
