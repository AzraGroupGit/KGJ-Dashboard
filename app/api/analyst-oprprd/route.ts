// app/api/analyst-oprprd/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCTION_ROLES = [
  "jewelry_expert_lebur_bahan",
  "jewelry_expert_pembentukan_awal",
  "jewelry_expert_finishing",
  "micro_setting",
  "laser",
];

const SUSUT_STAGES = ["lebur_bahan", "pembentukan_cincin", "pemolesan"];
const QC_STAGES = ["qc_1", "qc_2", "qc_3"]; // Removed qc_awal

function computeSusut(stage: string, data: any): number | null {
  if (stage === "lebur_bahan") {
    const v = parseFloat(data?.shrinkage_percent);
    return isNaN(v) ? null : v;
  }
  if (stage === "pembentukan_cincin") {
    const lost = parseFloat(data?.weight_lost);
    const input = parseFloat(data?.weight_input);
    return !isNaN(lost) && !isNaN(input) && input > 0
      ? (lost / input) * 100
      : null;
  }
  if (stage === "pemolesan") {
    const lost = parseFloat(data?.weight_lost);
    const before = parseFloat(data?.weight_before_polish);
    return !isNaN(lost) && !isNaN(before) && before > 0
      ? (lost / before) * 100
      : null;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if ((profile?.role as any)?.name !== "superadmin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── Period ──────────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");

    let fromDate: Date;
    let toDate: Date;

    if (period && /^\d{4}-\d{2}$/.test(period)) {
      const [yr, mo] = period.split("-").map(Number);
      fromDate = new Date(yr, mo - 1, 1);
      toDate = new Date(yr, mo, 0, 23, 59, 59, 999);
    } else {
      toDate = new Date();
      fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 30);
    }

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    // ── Parallel fetch using admin client ───────────────────────────────────
    const [
      staffRes,
      stageResultsRes,
      scanEventsRes,
      completedOrdersRes,
      qcChecklistRes,
    ] = await Promise.allSettled([
      admin
        .from("users")
        .select(
          "id, full_name, status, role:roles!users_role_id_fkey(name, role_group)",
        )
        .eq("status", "active")
        .is("deleted_at", null),

      admin
        .from("stage_results")
        .select("user_id, stage, data, started_at, finished_at")
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null),

      admin
        .from("scan_events")
        .select("user_id, order_id, stage, scanned_at")
        .gte("scanned_at", fromISO)
        .lte("scanned_at", toISO),

      admin
        .from("orders")
        .select("id, completed_at")
        .eq("status", "completed")
        .gte("completed_at", fromISO)
        .lte("completed_at", toISO),

      admin
        .from("quality_checklist_results")
        .select("check_key, passed, stage_result_id, created_at")
        .gte("created_at", fromISO)
        .lte("created_at", toISO),
    ]);

    const allStaff =
      staffRes.status === "fulfilled" ? (staffRes.value.data ?? []) : [];
    const stageResults =
      stageResultsRes.status === "fulfilled"
        ? (stageResultsRes.value.data ?? [])
        : [];
    const scanEvents =
      scanEventsRes.status === "fulfilled"
        ? (scanEventsRes.value.data ?? [])
        : [];
    const completedOrders =
      completedOrdersRes.status === "fulfilled"
        ? (completedOrdersRes.value.data ?? [])
        : [];
    const qcChecklistRaw =
      qcChecklistRes.status === "fulfilled"
        ? (qcChecklistRes.value.data ?? [])
        : [];

    // Log errors
    [
      staffRes,
      stageResultsRes,
      scanEventsRes,
      completedOrdersRes,
      qcChecklistRes,
    ].forEach((r, i) => {
      const labels = [
        "staff",
        "stage_results",
        "scan_events",
        "completed_orders",
        "qc_checklist",
      ];
      if (r.status === "fulfilled" && (r.value as any).error) {
        console.error(
          `[analyst-oprprd] ${labels[i]}:`,
          (r.value as any).error.message,
        );
      }
    });

    // ── Fetch stage_results for QC checklist mapping ─────────────────────────
    const srIds = [
      ...new Set(
        (qcChecklistRaw as any[])
          .map((r: any) => r.stage_result_id)
          .filter(Boolean),
      ),
    ];
    let stageMap = new Map<string, { stage: string; finished_at: string }>();

    if (srIds.length > 0) {
      const { data: srData } = await admin
        .from("stage_results")
        .select("id, stage, finished_at")
        .in("id", srIds);

      (srData || []).forEach((sr: any) => {
        stageMap.set(sr.id, { stage: sr.stage, finished_at: sr.finished_at });
      });
    }

    // ── Expert Performance ──────────────────────────────────────────────────
    const productionStaff = (allStaff as any[]).filter((u) =>
      PRODUCTION_ROLES.includes((u.role as any)?.name),
    );

    const scanByUser = new Map<
      string,
      { scans: number; orders: Set<string> }
    >();
    (scanEvents as any[]).forEach((s) => {
      const entry = scanByUser.get(s.user_id) ?? {
        scans: 0,
        orders: new Set<string>(),
      };
      entry.scans += 1;
      if (s.order_id) entry.orders.add(s.order_id);
      scanByUser.set(s.user_id, entry);
    });

    const stagesByUser = new Map<string, number>();
    const susutByUser = new Map<string, { sum: number; count: number }>();

    (stageResults as any[]).forEach((sr) => {
      stagesByUser.set(sr.user_id, (stagesByUser.get(sr.user_id) ?? 0) + 1);
      if (SUSUT_STAGES.includes(sr.stage)) {
        const susut = computeSusut(sr.stage, sr.data);
        if (susut != null) {
          const acc = susutByUser.get(sr.user_id) ?? { sum: 0, count: 0 };
          acc.sum += susut;
          acc.count += 1;
          susutByUser.set(sr.user_id, acc);
        }
      }
    });

    const expertPerformance = productionStaff
      .map((u: any) => {
        const scan = scanByUser.get(u.id);
        const susutAcc = susutByUser.get(u.id);
        return {
          userId: u.id,
          fullName: u.full_name,
          roleName: (u.role as any)?.name ?? "-",
          totalScans: scan?.scans ?? 0,
          totalOrders: scan?.orders.size ?? 0,
          stagesCompleted: stagesByUser.get(u.id) ?? 0,
          avgSusut:
            susutAcc && susutAcc.count > 0
              ? Math.round((susutAcc.sum / susutAcc.count) * 100) / 100
              : null,
        };
      })
      .sort((a, b) => b.stagesCompleted - a.stagesCompleted);

    // ── Stage Efficiency (from stage_results) ────────────────────────────────
    const stageEffMap = new Map<
      string,
      { totalMin: number; count: number; mins: number[] }
    >();
    (stageResults as any[]).forEach((sr: any) => {
      if (!sr.finished_at || !sr.started_at) return;
      const durMs =
        new Date(sr.finished_at).getTime() - new Date(sr.started_at).getTime();
      const durMin = durMs / 60_000;
      const entry = stageEffMap.get(sr.stage) ?? {
        totalMin: 0,
        count: 0,
        mins: [],
      };
      entry.totalMin += durMin;
      entry.count += 1;
      entry.mins.push(durMin);
      stageEffMap.set(sr.stage, entry);
    });

    const stageEfficiency = Array.from(stageEffMap.entries())
      .map(([stage, val]) => ({
        stage,
        totalCompleted: val.count,
        avgDurationMinutes:
          val.count > 0
            ? Math.round((val.totalMin / val.count) * 10) / 10
            : null,
        minDurationMinutes:
          val.mins.length > 0
            ? Math.round(Math.min(...val.mins) * 10) / 10
            : null,
        maxDurationMinutes:
          val.mins.length > 0
            ? Math.round(Math.max(...val.mins) * 10) / 10
            : null,
      }))
      .sort((a, b) => b.totalCompleted - a.totalCompleted);

    // ── QC Metrics (from quality_checklist_results) ──────────────────────────
    const qcByStage = new Map<
      string,
      { total: number; passed: number; failed: number }
    >();

    (qcChecklistRaw as any[]).forEach((row: any) => {
      const sr = stageMap.get(row.stage_result_id);
      if (!sr || !QC_STAGES.includes(sr.stage)) return;
      const entry = qcByStage.get(sr.stage) ?? {
        total: 0,
        passed: 0,
        failed: 0,
      };
      entry.total++;
      if (row.passed) entry.passed++;
      else entry.failed++;
      qcByStage.set(sr.stage, entry);
    });

    const qcMetrics = QC_STAGES.map((stage) => {
      const agg = qcByStage.get(stage) ?? { total: 0, passed: 0, failed: 0 };
      return {
        stage,
        totalChecks: agg.total,
        passed: agg.passed,
        failed: agg.failed,
        passRate:
          agg.total > 0 ? Math.round((agg.passed / agg.total) * 1000) / 10 : 0,
      };
    });

    // ── Order Flow (daily completions) ──────────────────────────────────────
    const flowMap = new Map<string, number>();
    (completedOrders as any[]).forEach((o) => {
      const day = (o.completed_at as string).split("T")[0];
      flowMap.set(day, (flowMap.get(day) ?? 0) + 1);
    });

    const orderFlow: { date: string; completed: number }[] = [];
    const cur = new Date(fromDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      const dayStr = cur.toISOString().split("T")[0];
      orderFlow.push({ date: dayStr, completed: flowMap.get(dayStr) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    const totalQCChecks = qcMetrics.reduce((s, q) => s + q.totalChecks, 0);
    const totalQCPassed = qcMetrics.reduce((s, q) => s + q.passed, 0);

    const summary = {
      totalOrdersCompleted: (completedOrders as any[]).length,
      totalStagesCompleted: (stageResults as any[]).length,
      overallQCPassRate:
        totalQCChecks > 0
          ? Math.round((totalQCPassed / totalQCChecks) * 1000) / 10
          : 0,
      activeProductionStaff: productionStaff.filter(
        (u: any) =>
          (scanByUser.get(u.id)?.scans ?? 0) > 0 ||
          (stagesByUser.get(u.id) ?? 0) > 0,
      ).length,
      totalProductionStaff: productionStaff.length,
    };

    return NextResponse.json({
      period: { from: fromISO, to: toISO },
      summary,
      expertPerformance,
      stageEfficiency,
      qcMetrics,
      orderFlow,
    });
  } catch (error) {
    console.error("[GET /api/analyst-oprprd] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
