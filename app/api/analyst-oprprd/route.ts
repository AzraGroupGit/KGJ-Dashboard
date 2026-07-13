// app/api/analyst-oprprd/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

const PRODUCTION_ROLES = [
  "jewelry_expert_lebur_bahan",
  "jewelry_expert_pembentukan_awal",
  "jewelry_expert_finishing",
  "micro_setting",
  "laser",
];

const SUSUT_STAGES = ["lebur_bahan", "pembentukan_cincin", "pemolesan"];
const QC_STAGES = ["qc_1", "qc_2", "qc_3"];

function computeSusut(stage: string, data: Record<string, unknown> | null): number | null {
  if (stage === "lebur_bahan") {
    const v = parseFloat(data?.shrinkage_percent as string);
    return isNaN(v) ? null : v;
  }
  if (stage === "pembentukan_cincin") {
    const lost = parseFloat(data?.weight_lost as string);
    const input = parseFloat(data?.weight_input as string);
    return !isNaN(lost) && !isNaN(input) && input > 0
      ? (lost / input) * 100
      : null;
  }
  if (stage === "pemolesan") {
    const lost = parseFloat(data?.weight_lost as string);
    const before = parseFloat(data?.weight_before_polish as string);
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

    if (getRoleProps(profile).name !== "superadmin")
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
        .from("stage_history")
        .select("changed_by, stage, data, created_at")
        .eq("status", "completed")
        .gte("created_at", fromISO)
        .lte("created_at", toISO),

      admin
        .from("tracking_stages")
        .select("order_id, updated_at")
        .eq("current_stage", "selesai")
        .gte("updated_at", fromISO)
        .lte("updated_at", toISO),

      admin
        .from("legacy_quality_checklist_results")
        .select("check_key, passed, stage_history_id, created_at")
        .gte("created_at", fromISO)
        .lte("created_at", toISO),
    ]);

    const allStaff =
      staffRes.status === "fulfilled" ? (staffRes.value.data ?? []) : [];
    const stageResults =
      stageResultsRes.status === "fulfilled"
        ? (stageResultsRes.value.data ?? [])
        : [];
    const scanEvents: Array<{ user_id: string; order_id: string; stage: string; scanned_at: string }> = []; // no legacy
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
      completedOrdersRes,
      qcChecklistRes,
    ].forEach((r, i) => {
      const labels = [
        "staff",
        "stage_history",
        "completed_orders",
        "qc_checklist",
      ];
      if (r.status === "fulfilled" && r.value.error) {
        console.error(
          `[analyst-oprprd] ${labels[i]}:`,
          r.value.error.message,
        );
      }
    });

    // ── Fetch stage_history for QC checklist mapping ─────────────────────────
    const srIds = [
      ...new Set(
        qcChecklistRaw
          .map((r) => (r as { stage_history_id: string }).stage_history_id)
          .filter(Boolean),
      ),
    ];
    const stageMap = new Map<string, { stage: string; finished_at: string }>();

    if (srIds.length > 0) {
      const { data: srData } = await admin
        .from("stage_history")
        .select("id, stage, created_at")
        .in("id", srIds);

      (srData || []).forEach((sr) => {
        stageMap.set(sr.id, { stage: sr.stage, finished_at: sr.created_at });
      });
    }

    // ── Expert Performance ──────────────────────────────────────────────────
    const productionStaff = allStaff.filter((u) =>
      PRODUCTION_ROLES.includes(getRoleProps(u).name),
    );

    const scanByUser = new Map<
      string,
      { scans: number; orders: Set<string> }
    >();
    scanEvents.forEach((s) => {
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

    stageResults.forEach((sr) => {
      const uid = (sr as { changed_by: string }).changed_by;
      stagesByUser.set(uid, (stagesByUser.get(uid) ?? 0) + 1);
      if (SUSUT_STAGES.includes(sr.stage)) {
        const susut = computeSusut(sr.stage, sr.data);
        if (susut != null) {
          const acc = susutByUser.get(uid) ?? { sum: 0, count: 0 };
          acc.sum += susut;
          acc.count += 1;
          susutByUser.set(uid, acc);
        }
      }
    });

    const expertPerformance = productionStaff
      .map((u) => {
        const scan = scanByUser.get(u.id);
        const susutAcc = susutByUser.get(u.id);
        return {
          userId: u.id,
          fullName: u.full_name,
          roleName: getRoleProps(u).name || "-",
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

    // ── Stage Efficiency (from stage_history — single-ts, durations are 0) ────
    const stageEffMap = new Map<
      string,
      { totalMin: number; count: number; mins: number[] }
    >();
    stageResults.forEach((sr) => {
      const durMin = 0; // stage_history has one timestamp (created_at), no measurable duration
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

    qcChecklistRaw.forEach((row) => {
      const r = row as { check_key: string; passed: boolean; stage_history_id: string; created_at: string };
      const sr = stageMap.get(r.stage_history_id);
      if (!sr || !QC_STAGES.includes(sr.stage)) return;
      const entry = qcByStage.get(sr.stage) ?? {
        total: 0,
        passed: 0,
        failed: 0,
      };
      entry.total++;
      if (r.passed) entry.passed++;
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
    completedOrders.forEach((o) => {
      const ts = (o as { updated_at: string }).updated_at;
      const day = ts ? ts.split("T")[0] : "";
      if (day) flowMap.set(day, (flowMap.get(day) ?? 0) + 1);
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
      totalOrdersCompleted: completedOrders.length,
      totalStagesCompleted: stageResults.length,
      overallQCPassRate:
        totalQCChecks > 0
          ? Math.round((totalQCPassed / totalQCChecks) * 1000) / 10
          : 0,
      activeProductionStaff: productionStaff.filter(
        (u) =>
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
