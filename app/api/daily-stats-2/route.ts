// app/api/daily-stats-2/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Config & Initialization
// ============================================================

const STAGE_ORDER = [
  "penerimaan_order",
  "approval_penerimaan_order",
  "racik_bahan",
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "approval_qc_1",
  "finishing",
  "laser",
  "qc_2",
  "approval_qc_2",
  "kelengkapan",
  "qc_3",
  "approval_qc_3",
  "packing",
  "pelunasan",
  "approval_pelunasan",
  "pengiriman",
];

const PRODUCTION_ROLES = [
  "jewelry_expert_lebur_bahan",
  "jewelry_expert_pembentukan_awal",
  "jewelry_expert_finishing",
  "micro_setting",
  "laser",
];

const DEFAULT_TARGET_CYCLE_TIME = 14;

// ============================================================
// Types
// ============================================================

interface DailyStatsResponse {
  kpi: {
    totalOrdersAktif: number;
    potensiKeterlambatan: number;
    nilaiBarangWIP: {
      beratEmas: number;
      jumlahPermata: number;
      estimasiRupiah: number;
      avgKarat: number;
    };
    rataCycleTime: number;
    targetCycleTime: number;
    additional: {
      ordersHariIni: number;
      selesaiHariIni: number;
      totalRework: number;
      criticalRework: number;
      completedCount: number;
    };
    trend: {
      currentWeekOrders: number;
      lastWeekOrders: number;
      trendPercent: number;
    };
  };
  operasional: {
    afterSales: {
      totalKonfirmasi: number;
      totalPelunasan: number;
      totalDelivery: number;
      urgentCount: number;
    };
    adminTasks: { total: number; delayed: number; active: number };
    racik: {
      rataShrinkage: number;
      targetShrinkage: number;
      totalBerat: number;
    };
    laser: { antrian: number; mesinAktif: number };
    qc: { passRateAvg: number; totalChecks: number; failedToday: number };
  };
  produksi: {
    experts: { total: number; aktif: number; totalOrders: number };
    microSetting: { total: number; inProgress: number; waiting: number };
    yield: { rataYield: number; totalTarget: number; totalActual: number };
  };
  recentActivities: Array<{
    id: string;
    type: "scan" | "qc" | "approval" | "rework";
    orderNumber: string;
    stage: string;
    user: string;
    timestamp: string;
    status?: "success" | "warning" | "error";
    notes?: string;
  }>;
  topPerformers: Array<{
    name: string;
    role: string;
    ordersCompleted: number;
    avgTime: number;
  }>;
  stageDistribution: Array<{ stage: string; count: number }>;
}

// ============================================================
// Helpers
// ============================================================

async function calculateAverageCycleTime(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await admin
    .from("orders")
    .select("order_date, completed_at")
    .not("completed_at", "is", null)
    .gte("completed_at", thirtyDaysAgo.toISOString())
    .is("deleted_at", null);

  if (error || !data || data.length === 0) return 0;

  const totalDays = data.reduce((sum: number, order: any) => {
    const start = new Date(order.order_date);
    const end = new Date(order.completed_at);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  }, 0);

  return totalDays / data.length;
}

function estimateWipValue(beratEmas: number, jumlahPermata: number): number {
  return beratEmas * 1200000 + jumlahPermata * 500000;
}

function mapStageToActivityType(
  stage: string,
): "scan" | "qc" | "approval" | "rework" {
  if (stage.startsWith("qc_")) return "qc";
  if (stage.startsWith("approval_") || stage === "pelunasan") return "approval";
  return "scan";
}

// ============================================================
// Main API Handler
// ============================================================

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: currentUser } = await supabase
    .from("users")
    .select("role:roles!users_role_id_fkey(name)")
    .eq("id", user.id)
    .single();

  if ((currentUser?.role as any)?.name !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const todayDateStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // ============================================================
    // Parallel Queries (all use admin client)
    // ============================================================
    const [
      activeOrdersQuery,
      potentiallyLateQuery,
      wipMaterialsQuery,
      todayOrdersQuery,
      completedTodayQuery,
      completed30DaysQuery,
      reworkStatsQuery,
      thisWeekOrdersQuery,
      lastWeekOrdersQuery,
      afterSalesOrdersQuery,
      racikStatsQuery,
      laserStatsQuery,
      qcStatsQuery,
      expertUsersQuery,
      microSettingQuery,
      yieldStatsQuery,
      stageDistributionQuery,
      recentActivitiesQuery,
    ] = await Promise.all([
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["in_progress", "waiting_approval", "approved", "rework"])
        .is("deleted_at", null),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["in_progress", "waiting_approval", "rework"])
        .lte("deadline", todayDateStr)
        .is("deleted_at", null),
      admin
        .from("stage_results")
        .select(
          "order_id, data, stage, orders!stage_results_order_id_fkey(id, target_weight, target_karat, has_gemstone, gemstone_info, status)",
        )
        .in("stage", ["racik_bahan", "pemasangan_permata", "finishing"])
        .order("started_at", { ascending: false }),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayISO)
        .is("deleted_at", null),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", todayISO)
        .is("deleted_at", null),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", thirtyDaysAgoISO)
        .is("deleted_at", null),
      admin
        .from("rework_logs")
        .select("severity")
        .gte("created_at", thirtyDaysAgoISO),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfWeek.toISOString())
        .is("deleted_at", null),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfLastWeek.toISOString())
        .lt("created_at", startOfWeek.toISOString())
        .is("deleted_at", null),
      admin
        .from("orders")
        .select("id, order_number, status, deadline, current_stage")
        .in("current_stage", [
          "approval_penerimaan_order",
          "approval_qc_1",
          "pelunasan",
          "pengiriman",
        ])
        .is("deleted_at", null)
        .limit(100),
      admin
        .from("stage_results")
        .select("data, started_at")
        .eq("stage", "racik_bahan")
        .gte("started_at", thirtyDaysAgoISO),
      admin
        .from("stage_results")
        .select("id, data, started_at, finished_at")
        .eq("stage", "laser")
        .order("started_at", { ascending: false })
        .limit(50),
      admin
        .from("stage_results")
        .select("stage, data, started_at, finished_at")
        .in("stage", ["qc_1", "qc_2", "qc_3"])
        .gte("started_at", todayISO)
        .not("finished_at", "is", null),
      admin
        .from("users")
        .select(
          "id, full_name, status, role:roles!users_role_id_fkey(name, role_group)",
        )
        .is("deleted_at", null),
      admin
        .from("stage_results")
        .select(
          "id, data, started_at, finished_at, orders!stage_results_order_id_fkey(id, order_number, has_gemstone)",
        )
        .eq("stage", "pemasangan_permata")
        .order("started_at", { ascending: false })
        .limit(100),
      admin
        .from("stage_results")
        .select("data, orders!stage_results_order_id_fkey(target_weight)")
        .in("stage", ["racik_bahan", "lebur_bahan", "finishing"])
        .gte("started_at", thirtyDaysAgoISO)
        .not("finished_at", "is", null),
      admin
        .from("orders")
        .select("current_stage")
        .in("status", ["in_progress", "waiting_approval", "approved", "rework"])
        .is("deleted_at", null),
      admin
        .from("scan_events")
        .select(
          "id, action, stage, scanned_at, orders!scan_events_order_id_fkey(order_number), users!scan_events_user_id_fkey(full_name)",
        )
        .order("scanned_at", { ascending: false })
        .limit(30),
    ]);

    // ============================================================
    // KPI Calculations
    // ============================================================
    const totalOrdersAktif = activeOrdersQuery.count || 0;
    const potensiKeterlambatan = potentiallyLateQuery.count || 0;

    let totalBeratEmas = 0,
      totalPermata = 0,
      totalKarat = 0,
      karatCount = 0;
    const processedOrders = new Set<string>();
    (wipMaterialsQuery.data || []).forEach((record: any) => {
      if (processedOrders.has(record.order_id)) return;
      processedOrders.add(record.order_id);
      const order = record.orders;
      if (order) {
        totalBeratEmas += order.target_weight || 0;
        totalKarat += order.target_karat || 0;
        karatCount++;
        if (order.has_gemstone && order.gemstone_info) {
          try {
            const gemstones =
              typeof order.gemstone_info === "string"
                ? JSON.parse(order.gemstone_info)
                : order.gemstone_info;
            totalPermata += Array.isArray(gemstones) ? gemstones.length : 0;
          } catch {
            /* ignore */
          }
        }
      }
    });

    const avgKarat = karatCount > 0 ? totalKarat / karatCount : 0;
    const estimasiRupiah = estimateWipValue(totalBeratEmas, totalPermata);
    const rataCycleTime = await calculateAverageCycleTime(admin);

    const reworkData = reworkStatsQuery.data || [];
    const totalRework = reworkData.length;
    const criticalRework = reworkData.filter(
      (r: any) => r.severity === "critical",
    ).length;

    const currentWeekOrders = thisWeekOrdersQuery.count || 0;
    const lastWeekOrders = lastWeekOrdersQuery.count || 0;
    const trendPercent =
      lastWeekOrders > 0
        ? ((currentWeekOrders - lastWeekOrders) / lastWeekOrders) * 100
        : 0;

    // ============================================================
    // After Sales
    // ============================================================
    const afterSalesData = afterSalesOrdersQuery.data || [];
    let totalKonfirmasi = 0,
      totalPelunasan = 0,
      totalDelivery = 0,
      urgentCount = 0;
    afterSalesData.forEach((record: any) => {
      if (
        record.current_stage === "approval_penerimaan_order" ||
        record.current_stage === "approval_qc_1"
      )
        totalKonfirmasi++;
      if (record.current_stage === "pelunasan") totalPelunasan++;
      if (record.current_stage === "pengiriman") totalDelivery++;
      if (record.deadline) {
        const daysLeft =
          (new Date(record.deadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24);
        if (daysLeft <= 2 && daysLeft > 0) urgentCount++;
      }
    });

    // ============================================================
    // Racik
    // ============================================================
    let totalShrinkage = 0,
      shrinkCount = 0,
      totalRacikBerat = 0;
    (racikStatsQuery.data || []).forEach((record: any) => {
      const d = record.data;
      if (d?.actual_weight && d?.target_weight) {
        totalShrinkage +=
          ((d.target_weight - d.actual_weight) / d.target_weight) * 100;
        shrinkCount++;
        totalRacikBerat += d.actual_weight;
      }
    });
    const rataShrinkage = shrinkCount > 0 ? totalShrinkage / shrinkCount : 0;

    // ============================================================
    // Laser
    // ============================================================
    const laserData = laserStatsQuery.data || [];
    const antrianLaser = laserData.filter((l: any) => !l.finished_at).length;

    // ============================================================
    // QC
    // ============================================================
    const qcData = qcStatsQuery.data || [];
    let totalPassRate = 0,
      passCount = 0,
      failedToday = 0;
    qcData.forEach((record: any) => {
      if (record.data?.overall_result) {
        passCount++;
        if (record.data.overall_result === "passed") totalPassRate++;
      }
      if (record.data?.overall_result === "failed") failedToday++;
    });
    const passRateAvg = passCount > 0 ? (totalPassRate / passCount) * 100 : 0;

    // ============================================================
    // Experts
    // ============================================================
    const allUsers = expertUsersQuery.data || [];
    const expertData = allUsers.filter((u: any) =>
      PRODUCTION_ROLES.includes((u.role as any)?.name),
    );
    const totalExperts = expertData.length;
    const activeExperts = expertData.filter(
      (e: any) => e.status === "active",
    ).length;

    const { count: totalExpertOrders } = await admin
      .from("scan_events")
      .select("order_id", { count: "exact", head: true })
      .eq("action", "submit")
      .in(
        "user_id",
        expertData
          .filter((e: any) => e.status === "active")
          .map((e: any) => e.id),
      )
      .gte("scanned_at", todayISO);

    // ============================================================
    // Micro Setting
    // ============================================================
    const microData = microSettingQuery.data || [];
    const microSettingTotal = microData.filter((m: any) => {
      const order = m.orders;
      return order?.has_gemstone;
    }).length;
    const microInProgress = microData.filter((m: any) => {
      const order = m.orders;
      return !m.finished_at && order?.has_gemstone;
    }).length;

    // ============================================================
    // Yield
    // ============================================================
    let totalYield = 0,
      yieldCount = 0,
      sumTarget = 0,
      sumActual = 0;
    (yieldStatsQuery.data || []).forEach((record: any) => {
      const d = record.data;
      const order = record.orders;
      const target = order?.target_weight;
      if (d?.actual_weight && target) {
        totalYield += (d.actual_weight / target) * 100;
        yieldCount++;
        sumTarget += target;
        sumActual += d.actual_weight;
      }
    });
    const rataYield = yieldCount > 0 ? totalYield / yieldCount : 0;

    // ============================================================
    // Stage Distribution
    // ============================================================
    const stageCounts: Record<string, number> = {};
    STAGE_ORDER.forEach((s) => {
      stageCounts[s] = 0;
    });
    (stageDistributionQuery.data || []).forEach((order: any) => {
      if (
        order.current_stage &&
        stageCounts.hasOwnProperty(order.current_stage)
      ) {
        stageCounts[order.current_stage]++;
      }
    });
    const stageDistribution = STAGE_ORDER.filter((s) => stageCounts[s] > 0).map(
      (s) => ({ stage: s, count: stageCounts[s] }),
    );

    // ============================================================
    // Recent Activities
    // ============================================================
    const recentActivities = (recentActivitiesQuery.data || []).map(
      (activity: any) => ({
        id: activity.id,
        type: mapStageToActivityType(activity.stage),
        orderNumber: activity.orders?.order_number || "-",
        stage: activity.stage,
        user: activity.users?.full_name || "Unknown",
        timestamp: activity.scanned_at,
        status: (activity.action === "reject"
          ? "error"
          : activity.action === "submit"
            ? "success"
            : undefined) as "success" | "error" | undefined,
        notes:
          activity.action === "reject"
            ? "Ditolak, perlu rework"
            : activity.action === "submit"
              ? `Stage ${activity.stage} selesai`
              : undefined,
      }),
    );

    // ============================================================
    // Top Performers (from stage_results aggregation)
    // ============================================================
    const { data: performerData } = await admin
      .from("stage_results")
      .select(
        "user_id, users!stage_results_user_id_fkey(full_name, role:roles!users_role_id_fkey(name))",
      )
      .gte("started_at", thirtyDaysAgoISO)
      .not("finished_at", "is", null);

    const performerMap = new Map<
      string,
      { name: string; role: string; count: number }
    >();
    (performerData || []).forEach((r: any) => {
      const uid = r.user_id;
      if (!performerMap.has(uid)) {
        performerMap.set(uid, {
          name: r.users?.full_name || "Unknown",
          role: (r.users?.role as any)?.name || "-",
          count: 0,
        });
      }
      performerMap.get(uid)!.count++;
    });

    const topPerformers = Array.from(performerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        role: p.role,
        ordersCompleted: p.count,
        avgTime: 2.5,
      }));

    // ============================================================
    // Response
    // ============================================================
    const response: DailyStatsResponse = {
      kpi: {
        totalOrdersAktif,
        potensiKeterlambatan,
        nilaiBarangWIP: {
          beratEmas: Math.round(totalBeratEmas * 100) / 100,
          jumlahPermata: totalPermata,
          estimasiRupiah,
          avgKarat: Math.round(avgKarat * 10) / 10,
        },
        rataCycleTime: Math.round(rataCycleTime * 10) / 10,
        targetCycleTime: DEFAULT_TARGET_CYCLE_TIME,
        additional: {
          ordersHariIni: todayOrdersQuery.count || 0,
          selesaiHariIni: completedTodayQuery.count || 0,
          totalRework,
          criticalRework,
          completedCount: completed30DaysQuery.count || 0,
        },
        trend: {
          currentWeekOrders,
          lastWeekOrders,
          trendPercent: Math.round(trendPercent),
        },
      },
      operasional: {
        afterSales: {
          totalKonfirmasi,
          totalPelunasan,
          totalDelivery,
          urgentCount,
        },
        adminTasks: {
          total: totalKonfirmasi + totalPelunasan,
          delayed: 0,
          active: totalKonfirmasi,
        },
        racik: {
          rataShrinkage: Math.round(rataShrinkage * 100) / 100,
          targetShrinkage: 5.0,
          totalBerat: Math.round(totalRacikBerat * 100) / 100,
        },
        laser: { antrian: antrianLaser, mesinAktif: 3 },
        qc: {
          passRateAvg: Math.round(passRateAvg * 10) / 10,
          totalChecks: qcData.length,
          failedToday,
        },
      },
      produksi: {
        experts: {
          total: totalExperts,
          aktif: activeExperts,
          totalOrders: totalExpertOrders || 0,
        },
        microSetting: {
          total: microSettingTotal,
          inProgress: microInProgress,
          waiting: microSettingTotal - microInProgress,
        },
        yield: {
          rataYield: Math.round(rataYield * 10) / 10,
          totalTarget: Math.round(sumTarget * 100) / 100,
          totalActual: Math.round(sumActual * 100) / 100,
        },
      },
      recentActivities,
      topPerformers,
      stageDistribution,
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Daily Stats API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
