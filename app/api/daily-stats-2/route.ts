// app/api/daily-stats-2/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase/client";

// ============================================================
// Config & Initialization
// ============================================================

// Stage order untuk perhitungan cycle time
const STAGE_ORDER = [
  "penerimaan_order",
  "qc_awal",
  "racik_bahan",
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "konfirmasi_awal",
  "finishing",
  "laser",
  "qc_2",
  "pelunasan",
  "kelengkapan",
  "qc_3",
  "packing",
  "pengiriman",
];

// Target cycle time dalam hari (bisa di-config per tipe produk)
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
    adminTasks: {
      total: number;
      delayed: number;
      active: number;
    };
    racik: {
      rataShrinkage: number;
      targetShrinkage: number;
      totalBerat: number;
    };
    laser: {
      antrian: number;
      mesinAktif: number;
    };
    qc: {
      passRateAvg: number;
      totalChecks: number;
      failedToday: number;
    };
  };
  produksi: {
    experts: {
      total: number;
      aktif: number;
      totalOrders: number;
    };
    microSetting: {
      total: number;
      inProgress: number;
      waiting: number;
    };
    yield: {
      rataYield: number;
      totalTarget: number;
      totalActual: number;
    };
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
  stageDistribution: Array<{
    stage: string;
    count: number;
  }>;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Hitung cycle time rata-rata dari order yang completed dalam 30 hari terakhir
 */
async function calculateAverageCycleTime(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("orders")
    .select("order_date, completed_at")
    .not("completed_at", "is", null)
    .gte("completed_at", thirtyDaysAgo.toISOString())
    .is("deleted_at", null);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const totalDays = data.reduce((sum: number, order: any) => {
    const start = new Date(order.order_date);
    const end = new Date(order.completed_at);
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return totalDays / data.length;
}

/**
 * Estimasi nilai rupiah WIP berdasarkan berat emas dan jumlah permata
 * (Ini adalah simplifikasi - dalam real system bisa dari tabel pricing)
 */
function estimateWipValue(beratEmas: number, jumlahPermata: number): number {
  const EMAS_PER_GRAM = 1200000; // Rp 1.2jt/gram (contoh)
  const PERMATA_AVG = 500000; // Rp 500rb/permata (contoh)

  return beratEmas * EMAS_PER_GRAM + jumlahPermata * PERMATA_AVG;
}

/**
 * Format stage untuk activity feed
 */
function mapStageToActivityType(
  stage: string,
): "scan" | "qc" | "approval" | "rework" {
  if (stage.startsWith("qc_")) return "qc";
  if (stage.includes("konfirmasi") || stage.includes("pelunasan"))
    return "approval";
  return "scan";
}

// ============================================================
// Main API Handler
// ============================================================

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // ============================================================
    // Parallel Queries untuk Performa
    // ============================================================

    const [
      // KPI Queries
      activeOrdersQuery,
      potentiallyLateQuery,
      wipMaterialsQuery,
      todayOrdersQuery,
      completedTodayQuery,
      completed30DaysQuery,
      reworkStatsQuery,
      thisWeekOrdersQuery,
      lastWeekOrdersQuery,

      // Operational Queries
      afterSalesQuery,
      racikStatsQuery,
      laserStatsQuery,
      qcStatsQuery,
      qcFailedTodayQuery,

      // Production Queries
      expertStatsQuery,
      microSettingQuery,
      yieldStatsQuery,

      // Stage Distribution
      stageDistributionQuery,

      // Recent Activities
      recentActivitiesQuery,

      // Top Performers
      topPerformersQuery,
    ] = await Promise.all([
      // Active orders count
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["in_progress", "waiting_approval", "approved", "rework"])
        .is("deleted_at", null),

      // Potentially late orders
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["in_progress", "waiting_approval", "rework"])
        .lt("deadline", todayISO)
        .is("deleted_at", null),

      // WIP materials (dari stage_results terbaru per order)
      supabase
        .from("stage_results")
        .select(
          `
          order_id,
          data,
          stage,
          orders!inner(
            id,
            target_weight,
            target_karat,
            has_gemstone,
            gemstone_info,
            status
          )
        `,
        )
        .in("stage", ["racik_bahan", "pemasangan_permata", "finishing"])
        .order("started_at", { ascending: false }),

      // Orders created today
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayISO)
        .is("deleted_at", null),

      // Orders completed today
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", todayISO)
        .is("deleted_at", null),

      // Completed orders in last 30 days
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", thirtyDaysAgo.toISOString())
        .is("deleted_at", null),

      // Rework stats
      supabase
        .from("rework_logs")
        .select("severity, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString()),

      // This week orders
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfWeek.toISOString())
        .is("deleted_at", null),

      // Last week orders
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfLastWeek.toISOString())
        .lt("created_at", startOfWeek.toISOString())
        .is("deleted_at", null),

      // After sales: konfirmasi, pelunasan, delivery
      supabase
        .from("stage_results")
        .select(
          `
          stage,
          data,
          started_at,
          orders!inner(
            id,
            order_number,
            status,
            deadline
          )
        `,
        )
        .in("stage", ["konfirmasi_awal", "pelunasan", "pengiriman"])
        .order("started_at", { ascending: false })
        .limit(100),

      // Racik stats (shrinkage)
      supabase
        .from("stage_results")
        .select(
          `
          data,
          started_at
        `,
        )
        .eq("stage", "racik_bahan")
        .gte("started_at", thirtyDaysAgo.toISOString()),

      // Laser stats
      supabase
        .from("stage_results")
        .select(
          `
          id,
          data,
          started_at,
          finished_at
        `,
        )
        .eq("stage", "laser")
        .order("started_at", { ascending: false })
        .limit(50),

      // QC stats
      supabase
        .from("stage_results")
        .select(
          `
          stage,
          data,
          started_at,
          finished_at
        `,
        )
        .in("stage", ["qc_awal", "qc_1", "qc_2", "qc_3"])
        .gte("started_at", todayISO)
        .not("finished_at", "is", null),

      // QC failed today
      supabase
        .from("stage_results")
        .select("id", { count: "exact", head: true })
        .in("stage", ["qc_awal", "qc_1", "qc_2", "qc_3"])
        .gte("started_at", todayISO)
        .eq("data->>overall_result", "failed"),

      // Expert stats (users with production roles)
      supabase
        .from("users")
        .select(
          `
          id,
          full_name,
          is_active,
          roles!inner(
            id,
            name,
            role_group
          )
        `,
        )
        .eq("roles.role_group", "production")
        .is("deleted_at", null),

      // Micro setting stats
      supabase
        .from("stage_results")
        .select(
          `
          id,
          data,
          started_at,
          finished_at,
          orders!inner(
            id,
            order_number,
            has_gemstone
          )
        `,
        )
        .eq("stage", "pemasangan_permata")
        .order("started_at", { ascending: false })
        .limit(100),

      // Yield stats
      supabase
        .from("stage_results")
        .select(
          `
          data,
          orders!inner(
            target_weight
          )
        `,
        )
        .in("stage", ["racik_bahan", "lebur_bahan", "finishing"])
        .gte("started_at", thirtyDaysAgo.toISOString())
        .not("finished_at", "is", null),

      // Stage distribution
      supabase
        .from("orders")
        .select("current_stage")
        .in("status", ["in_progress", "waiting_approval", "approved", "rework"])
        .is("deleted_at", null),

      // Recent activities (scan events + approvals + rework)
      supabase
        .from("scan_events")
        .select(
          `
          id,
          action,
          stage,
          scanned_at,
          stage_result_id,
          orders!inner(
            order_number
          ),
          users!inner(
            full_name
          )
        `,
        )
        .order("scanned_at", { ascending: false })
        .limit(30),

      // Top performers (from staff productivity view)
      supabase
        .from("v_staff_productivity")
        .select("*")
        .gte("work_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("total_submits", { ascending: false })
        .limit(10),
    ]);

    // ============================================================
    // Process & Aggregate Data
    // ============================================================

    // --- KPI Calculations ---
    const totalOrdersAktif = activeOrdersQuery.count || 0;
    const potensiKeterlambatan = potentiallyLateQuery.count || 0;

    // WIP Value calculation
    let totalBeratEmas = 0;
    let totalPermata = 0;
    let totalKarat = 0;
    let karatCount = 0;

    const processedOrders = new Set();
    wipMaterialsQuery.data?.forEach((record) => {
      if (processedOrders.has(record.order_id)) return;
      processedOrders.add(record.order_id);

      const order = Array.isArray(record.orders)
        ? record.orders[0]
        : record.orders;
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
            // ignore parse error
          }
        }
      }
    });

    const avgKarat = karatCount > 0 ? totalKarat / karatCount : 0;
    const estimasiRupiah = estimateWipValue(totalBeratEmas, totalPermata);

    // Cycle time
    const rataCycleTime = await calculateAverageCycleTime();
    const targetCycleTime = DEFAULT_TARGET_CYCLE_TIME;

    // Rework stats
    const totalRework = reworkStatsQuery.data?.length || 0;
    const criticalRework =
      reworkStatsQuery.data?.filter((r) => r.severity === "critical").length ||
      0;

    // Trend
    const currentWeekOrders = thisWeekOrdersQuery.count || 0;
    const lastWeekOrders = lastWeekOrdersQuery.count || 0;
    const trendPercent =
      lastWeekOrders > 0
        ? ((currentWeekOrders - lastWeekOrders) / lastWeekOrders) * 100
        : 0;

    // --- Operational Calculations ---
    const afterSalesData = afterSalesQuery.data || [];

    let totalKonfirmasi = 0;
    let totalPelunasan = 0;
    let totalDelivery = 0;
    let urgentCount = 0;

    afterSalesData.forEach((record) => {
      if (record.stage === "konfirmasi_awal") totalKonfirmasi++;
      if (record.stage === "pelunasan") totalPelunasan++;
      if (record.stage === "pengiriman") totalDelivery++;

      // Check urgent: order status in_progress but approaching deadline
      const order = Array.isArray(record.orders)
        ? record.orders[0]
        : record.orders;
      if (order?.deadline) {
        const deadline = new Date(order.deadline);
        const daysLeft =
          (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 2 && daysLeft > 0) urgentCount++;
      }
    });

    // Racik (shrinkage)
    let totalShrinkage = 0;
    let shrinkCount = 0;
    let totalRacikBerat = 0;

    racikStatsQuery.data?.forEach((record) => {
      const data = record.data;
      if (data?.actual_weight && data?.target_weight) {
        const shrinkage =
          ((data.target_weight - data.actual_weight) / data.target_weight) *
          100;
        totalShrinkage += shrinkage;
        shrinkCount++;
        totalRacikBerat += data.actual_weight;
      }
    });

    const rataShrinkage = shrinkCount > 0 ? totalShrinkage / shrinkCount : 0;

    // Laser
    const laserData = laserStatsQuery.data || [];
    const antrianLaser = laserData.filter((l) => !l.finished_at).length;
    const mesinAktif = 3; // Asumsi: 3 mesin laser aktif (bisa dari config)

    // QC Stats
    const qcData = qcStatsQuery.data || [];
    let totalPassRate = 0;
    let passCount = 0;

    qcData.forEach((record) => {
      if (record.data?.overall_result) {
        passCount++;
        if (record.data.overall_result === "passed") totalPassRate++;
      }
    });

    const passRateAvg = passCount > 0 ? (totalPassRate / passCount) * 100 : 0;
    const totalChecks = qcData.length;
    const failedToday = qcFailedTodayQuery.count || 0;

    // --- Production Calculations ---

    // Experts
    const expertData = expertStatsQuery.data || [];
    const totalExperts = expertData.length;
    const activeExperts = expertData.filter((e) => e.is_active).length;

    // Get orders assigned to experts today
    const expertOrdersQuery = await supabase
      .from("scan_events")
      .select("order_id", { count: "exact", head: true })
      .eq("action", "submit")
      .in(
        "user_id",
        expertData.filter((e) => e.is_active).map((e) => e.id),
      )
      .gte("scanned_at", todayISO);

    const totalExpertOrders = expertOrdersQuery.count || 0;

    // Micro Setting
    const microData = microSettingQuery.data || [];
    const microSettingTotal = microData.filter((m) => {
      const order = Array.isArray(m.orders) ? m.orders[0] : m.orders;
      return order?.has_gemstone;
    }).length;
    const microInProgress = microData.filter((m) => {
      const order = Array.isArray(m.orders) ? m.orders[0] : m.orders;
      return !m.finished_at && order?.has_gemstone;
    }).length;

    // Yield
    let totalYield = 0;
    let yieldCount = 0;
    let sumTarget = 0;
    let sumActual = 0;

    yieldStatsQuery.data?.forEach((record) => {
      const data = record.data;
      const order = Array.isArray(record.orders)
        ? record.orders[0]
        : record.orders;
      const target = order?.target_weight;

      if (data?.actual_weight && target) {
        const yieldPercent = (data.actual_weight / target) * 100;
        totalYield += yieldPercent;
        yieldCount++;
        sumTarget += target;
        sumActual += data.actual_weight;
      }
    });

    const rataYield = yieldCount > 0 ? totalYield / yieldCount : 0;

    // --- Stage Distribution ---
    const stageCounts: Record<string, number> = {};
    STAGE_ORDER.forEach((stage) => {
      stageCounts[stage] = 0;
    });

    stageDistributionQuery.data?.forEach((order) => {
      if (
        order.current_stage &&
        stageCounts.hasOwnProperty(order.current_stage)
      ) {
        stageCounts[order.current_stage]++;
      }
    });

    const stageDistribution = STAGE_ORDER.filter(
      (stage) => stageCounts[stage] > 0,
    ).map((stage) => ({
      stage,
      count: stageCounts[stage],
    }));

    // --- Recent Activities ---
    // --- Recent Activities ---
    const recentActivities = (recentActivitiesQuery.data || []).map(
      (activity: any) => {
        let type: "scan" | "qc" | "approval" | "rework" =
          mapStageToActivityType(activity.stage);
        let status: "success" | "warning" | "error" | undefined;
        let notes: string | undefined;

        if (activity.action === "reject") {
          type = "rework";
          status = "error";
          notes = "Ditolak, perlu rework";
        } else if (activity.action === "submit") {
          status = "success";
          notes = `Stage ${activity.stage} selesai`;
        }

        // Type assertion untuk handle nested relations dari Supabase
        const orderData = activity.orders as any;
        const userData = activity.users as any;

        return {
          id: activity.id,
          type,
          orderNumber: orderData?.order_number || "-",
          stage: activity.stage,
          user: userData?.full_name || "Unknown",
          timestamp: activity.scanned_at,
          status,
          notes,
        };
      },
    );

    // --- Top Performers ---
    // Aggregate per user dari v_staff_productivity
    const userPerformance: Record<
      string,
      {
        name: string;
        role: string;
        totalSubmits: number;
        ordersHandled: Set<string>;
      }
    > = {};

    topPerformersQuery.data?.forEach((record) => {
      if (!userPerformance[record.user_id]) {
        userPerformance[record.user_id] = {
          name: record.full_name,
          role: record.role_name,
          totalSubmits: 0,
          ordersHandled: new Set(),
        };
      }
      userPerformance[record.user_id].totalSubmits += record.total_submits || 0;
      // Note: orders_handled is a count in view, kita tidak bisa track unique per hari tanpa query tambahan
    });

    const topPerformers = Object.values(userPerformance)
      .sort((a, b) => b.totalSubmits - a.totalSubmits)
      .slice(0, 5)
      .map((perf) => ({
        name: perf.name,
        role: perf.role,
        ordersCompleted: perf.totalSubmits,
        avgTime: 2.5, // Placeholder - perlu query stage_duration view untuk akurat
      }));

    // ============================================================
    // Build Final Response
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
        targetCycleTime,
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
          delayed: 0, // Bisa ditambahkan dari query terpisah
          active: totalKonfirmasi,
        },
        racik: {
          rataShrinkage: Math.round(rataShrinkage * 100) / 100,
          targetShrinkage: 5.0, // Default target, bisa dari config
          totalBerat: Math.round(totalRacikBerat * 100) / 100,
        },
        laser: {
          antrian: antrianLaser,
          mesinAktif,
        },
        qc: {
          passRateAvg: Math.round(passRateAvg * 10) / 10,
          totalChecks,
          failedToday,
        },
      },
      produksi: {
        experts: {
          total: totalExperts,
          aktif: activeExperts,
          totalOrders: totalExpertOrders,
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

// ============================================================
// Optional: Revalidate configuration
// ============================================================

export const dynamic = "force-dynamic";
export const revalidate = 0; // No cache, always fetch fresh data
