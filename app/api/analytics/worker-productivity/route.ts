import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStageLabel } from "@/lib/stages";
import { getRoleProps } from "@/lib/auth/session";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    // Exclude non-production roles
    const EXCLUDED_ROLES = new Set([
      "operational_supervisor",
      "production_supervisor",
      "superadmin",
      "marketing",
      "customer_service",
    ]);

    // Get all active workers with their roles
    const { data: workers, error: workersErr } = await db
      .from("users")
      .select(`id, full_name, role:roles!users_role_id_fkey(name, role_group)`)
      .is("deleted_at", null);

    if (workersErr) {
      return NextResponse.json({ error: workersErr.message }, { status: 500 });
    }

    const filtered = (workers || []).filter(
      (w) => !EXCLUDED_ROLES.has(getRoleProps(w).name),
    );

    const workerIds = filtered.map((w) => w.id);

    // Get all stage results by these workers
    const { data: stageResults } = await db
      .from("stage_results")
      .select(
        `id, order_id, stage, started_at, finished_at, data,
         user_id`,
      )
      .in("user_id", workerIds)
      .not("started_at", "is", null)
      .order("finished_at", { ascending: false });

    // Get material transactions for susut calculation
    const { data: materialTx } = await db
      .from("material_transactions")
      .select("order_id, type, amount, gramasi, created_by")
      .in("created_by", workerIds)
      .is("deleted_at", null);

    type StageRec = { id: string; order_id: string; stage: string; started_at: string | null; finished_at: string | null; data: Record<string, unknown> | null; user_id: string };
    const stageByWorker = new Map<string, StageRec[]>();
    for (const sr of (stageResults ?? []) as StageRec[]) {
      if (!stageByWorker.has(sr.user_id)) {
        stageByWorker.set(sr.user_id, []);
      }
      stageByWorker.get(sr.user_id)!.push(sr);
    }

    type TxRec = { order_id: string; type: string; amount: number; gramasi: number | null; created_by: string };
    const txByWorker = new Map<string, TxRec[]>();
    for (const tx of (materialTx ?? []) as TxRec[]) {
      if (!txByWorker.has(tx.created_by)) {
        txByWorker.set(tx.created_by, []);
      }
      txByWorker.get(tx.created_by)!.push(tx);
    }

    const workersData = (filtered || []).map((w) => {
      const results = stageByWorker.get(w.id) || [];
      const materialTxns = txByWorker.get(w.id) || [];

      // Completed stages count
      const completed = results.filter(
        (r) => r.finished_at != null,
      );
      const uniqueOrders = new Set(completed.map((r) => r.order_id));

      // Duration stats
      const durations = completed
        .map((r) => {
          if (!r.started_at || !r.finished_at) return null;
          const d =
            (new Date(r.finished_at).getTime() -
              new Date(r.started_at).getTime()) /
            3600000;
          return d > 0 ? d : null;
        })
        .filter(Boolean) as number[];

      // Group by stage
      const stageCounts: Record<string, number> = {};
      for (const r of completed) {
        stageCounts[r.stage] = (stageCounts[r.stage] || 0) + 1;
      }

      // Top stages
      const topStages = Object.entries(stageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([stage, count]) => ({
          stage,
          label: getStageLabel(stage),
          count,
        }));

      // Susut
      const susutValues = materialTxns
        .filter((tx) => tx.type === "susut" && tx.amount != null)
        .map((tx) => Number(tx.amount));
      const avgSusut =
        susutValues.length > 0
          ? susutValues.reduce((a, b) => a + b, 0) / susutValues.length
          : null;

      const avgDuration =
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : null;

      const totalScans = results.length;
      const totalCompleted = completed.length;
      const totalOrders = uniqueOrders.size;

      return {
        userId: w.id,
        fullName: w.full_name,
        roleName: getRoleProps(w).name,
        roleGroup: getRoleProps(w).role_group,
        totalScans,
        totalCompleted,
        totalOrders,
        avgDuration: avgDuration ? Math.round(avgDuration * 100) / 100 : null,
        avgSusut: avgSusut ? Math.round(avgSusut * 100) / 100 : null,
        topStages,
      };
    });

    // Sort by total scans
    workersData.sort((a, b) => b.totalScans - a.totalScans);

    return NextResponse.json({ workers: workersData });
  } catch (err) {
    console.error("[GET /api/analytics/worker-productivity]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
