import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_SEQUENCE, getStageLabel } from "@/lib/stages";

export async function GET(_request: Request) {
  try {
    const db = createAdminClient();
    const now = new Date();
    const DAYS = 90;
    const startDate = new Date(now.getTime() - DAYS * 86400000);

    // Get all transitions in the date range
    const { data: transitions, error: txErr } = await db
      .from("order_stage_transitions")
      .select("order_id, from_stage, to_stage, transitioned_at")
      .gte("transitioned_at", startDate.toISOString())
      .order("transitioned_at", { ascending: true });

    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }

    // Build per-order transition timeline
    const orderTimelines = new Map<string, Array<{ stage: string; enteredAt: Date; leftAt: Date | null }>>();
    for (const t of transitions) {
      if (!orderTimelines.has(t.order_id)) {
        orderTimelines.set(t.order_id, []);
      }
      const timeline = orderTimelines.get(t.order_id)!;
      // Close previous stage
      if (timeline.length > 0 && timeline[timeline.length - 1].leftAt === null) {
        timeline[timeline.length - 1].leftAt = new Date(t.transitioned_at);
      }
      // Enter new stage
      timeline.push({
        stage: t.to_stage,
        enteredAt: new Date(t.transitioned_at),
        leftAt: null,
      });
    }

    // Close still-open stages at now
    for (const [, timeline] of orderTimelines) {
      if (timeline.length > 0 && timeline[timeline.length - 1].leftAt === null) {
        timeline[timeline.length - 1].leftAt = now;
      }
    }

    // Build daily heatmap: stage -> date -> count
    const heatmap: Record<string, Record<string, number>> = {};
    for (const stage of STAGE_SEQUENCE) {
      heatmap[stage] = {};
    }

    // For each day, count orders in each stage
    for (let d = 0; d < DAYS; d++) {
      const dayStart = new Date(startDate.getTime() + d * 86400000);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dateKey = dayStart.toISOString().slice(0, 10);

      const stageCounts: Record<string, number> = {};
      for (const stage of STAGE_SEQUENCE) {
        stageCounts[stage] = 0;
      }

      for (const [, timeline] of orderTimelines) {
        for (const entry of timeline) {
          if (entry.enteredAt < dayEnd && (entry.leftAt === null || entry.leftAt > dayStart)) {
            stageCounts[entry.stage] = (stageCounts[entry.stage] || 0) + 1;
          }
        }
      }

      for (const stage of STAGE_SEQUENCE) {
        heatmap[stage][dateKey] = stageCounts[stage] || 0;
      }
    }

    // Build summary: total order-days per stage
    const stageSummary = STAGE_SEQUENCE.map((stage) => {
      const days = Object.values(heatmap[stage]);
      const total = days.reduce((a, b) => a + b, 0);
      const avg = days.length > 0 ? total / days.length : 0;
      const peak = days.length > 0 ? Math.max(...days) : 0;
      return {
        stage,
        label: getStageLabel(stage),
        totalOrderDays: total,
        avgDailyOrders: Math.round(avg * 100) / 100,
        peakDailyOrders: peak,
      };
    });

    // Get current active orders per stage (for reference)
    const { data: currentOrders } = await db
      .from("cs_orders")
      .select("current_stage")
      .not("status", "in", "(completed,cancelled)")
      .not("current_stage", "is", null)
      .is("deleted_at", null);

    const currentCounts: Record<string, number> = {};
    for (const o of currentOrders || []) {
      const stage = o.current_stage;
      currentCounts[stage] = (currentCounts[stage] || 0) + 1;
    }

    return NextResponse.json({
      heatmap,
      stageSummary,
      currentCounts,
      dateRange: {
        from: startDate.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
      },
    });
  } catch (err) {
    console.error("[GET /api/analytics/bottleneck-history]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
