// app/api/operational/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    if ((profile?.role as any)?.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgoISO = threeDaysAgo.toISOString();
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // ========== FETCH ALL SECTIONS IN PARALLEL ==========
    const [
      konfirmasiResult,
      pelunasanResult,
      deliveryResult,
      adminTasksResult,
      racikResult,
      laserResult,
      qcSummaryResult,
      qcActivityResult,
    ] = await Promise.allSettled([
      // 1. KONFIRMASI
      admin
        .from("customer_confirmations")
        .select(
          `
          confirmation_type, confirmation_method, confirmation_status,
          rejection_reason, change_requests, photos_sent_at, confirmed_at, created_at,
          orders!cc_order_id_fkey (order_number, customers(name, wa_contact)),
          stage_results!cc_stage_result_fkey (data)
        `,
        )
        .eq("confirmation_status", "pending")
        .order("created_at", { ascending: false })
        .limit(30),

      // 2. PELUNASAN — query directly from orders + payments
      admin
        .from("orders")
        .select(
          `
          id, order_number, total_price, dp_amount,
          customers!orders_customer_id_fkey (name)
        `,
        )
        .not("status", "in", "(completed,cancelled)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(50),

      // 3. DELIVERY
      admin
        .from("stage_results")
        .select(
          `
          data, started_at, finished_at,
          orders!stage_results_order_id_fkey (
            order_number, delivery_method, completed_at,
            customers!orders_customer_id_fkey (name)
          )
        `,
        )
        .eq("stage", "pengiriman")
        .order("started_at", { ascending: false })
        .limit(50),

      // 4. ADMIN TASKS — query stage_results directly
      admin
        .from("stage_results")
        .select(
          `
          order_id, stage, started_at, finished_at,
          orders!stage_results_order_id_fkey (order_number),
          users!stage_results_user_id_fkey (full_name, role:roles!users_role_id_fkey(name))
        `,
        )
        .in("stage", ["pelunasan", "kelengkapan", "packing", "pengiriman"])
        .gte("started_at", threeDaysAgoISO)
        .order("started_at", { ascending: false })
        .limit(50),

      // 5. RACIK BAHAN
      admin
        .from("stage_results")
        .select(
          `
          data, finished_at,
          orders!stage_results_order_id_fkey (order_number, target_weight),
          users!stage_results_user_id_fkey (full_name)
        `,
        )
        .eq("stage", "racik_bahan")
        .gte("finished_at", sevenDaysAgoISO)
        .order("finished_at", { ascending: false }),

      // 6. LASER
      admin
        .from("stage_results")
        .select(
          `
          data, started_at, finished_at,
          orders!stage_results_order_id_fkey (order_number)
        `,
        )
        .eq("stage", "laser")
        .gte("started_at", sevenDaysAgoISO)
        .order("started_at", { ascending: false }),

      // 7. QC SUMMARY
      admin
        .from("quality_checklist_results")
        .select(`check_key, passed, stage_result_id, created_at`)
        .order("created_at", { ascending: false })
        .limit(500),

      // 8. QC ACTIVITY
      admin
        .from("stage_results")
        .select(
          `
          data, notes, stage, finished_at,
          orders!stage_results_order_id_fkey (order_number),
          users!stage_results_user_id_fkey (full_name)
        `,
        )
        .in("stage", ["qc_1", "qc_2", "qc_3"])
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(15),
    ]);

    // Helper: log errors
    const logError = (label: string, result: PromiseSettledResult<any>) => {
      if (result.status === "fulfilled" && result.value.error) {
        console.error(
          `[GET /api/operational] ${label}:`,
          result.value.error.message,
        );
      }
    };

    logError("konfirmasi", konfirmasiResult);
    logError("pelunasan", pelunasanResult);
    logError("delivery", deliveryResult);
    logError("admin tasks", adminTasksResult);
    logError("racik", racikResult);
    logError("laser", laserResult);
    logError("qc summary", qcSummaryResult);
    logError("qc activity", qcActivityResult);

    // ========== KONFIRMASI ==========
    const { data: waitingApprovalOrders, error: waitingError } = await admin
      .from("orders")
      .select(
        `
        order_number, created_at, current_stage,
        customers!orders_customer_id_fkey (name, wa_contact)
      `,
      )
      .in("status", ["waiting_approval", "in_progress"])
      .in("current_stage", ["approval_penerimaan_order", "approval_qc_1"])
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(30);

    if (waitingError) {
      console.error(
        "[GET /api/operational] konfirmasi (orders):",
        waitingError.message,
      );
    }

    const konfirmasi = (waitingApprovalOrders || [])
      .slice(0, 10)
      .map((row: any) => {
        const hoursElapsed = row.created_at
          ? (now.getTime() - new Date(row.created_at).getTime()) / 3_600_000
          : 0;
        return {
          order_number: row.order_number,
          customer_name: row.customers?.name ?? null,
          wa_contact: row.customers?.wa_contact ?? null,
          dp_requested_at: row.created_at,
          dp_received_at: null,
          dp_amount: null,
          customer_decision: "pending",
          confirmation_started_at: row.created_at,
          confirmation_finished_at: null,
          hours_elapsed: Math.round(hoursElapsed * 10) / 10,
        };
      });

    // ========== PELUNASAN ==========
    const pelunasanRaw =
      pelunasanResult.status === "fulfilled" && !pelunasanResult.value.error
        ? pelunasanResult.value.data || []
        : [];

    const pelunasan = (pelunasanRaw as any[])
      .map((row) => {
        const total = row.total_price || 0;
        const dp = row.dp_amount || 0;
        const remaining = total - dp;
        return {
          order_number: row.order_number,
          customer_name: row.customers?.name ?? null,
          total_price: total,
          dp_paid: dp,
          remaining_amount: remaining > 0 ? remaining : 0,
          payment_status: remaining <= 0 ? "lunas" : "belum_lunas",
          final_payment_method: null,
          pelunasan_finished_at: null,
        };
      })
      .filter((row) => row.payment_status !== "lunas")
      .slice(0, 10);

    // ========== DELIVERY ==========
    const deliveryRaw =
      deliveryResult.status === "fulfilled" && !deliveryResult.value.error
        ? deliveryResult.value.data || []
        : [];

    const delivery = (deliveryRaw as any[])
      .filter(
        (row) =>
          row.data?.picked_up_by_customer_at == null &&
          row.orders?.completed_at == null,
      )
      .slice(0, 10)
      .map((row) => ({
        order_number: row.orders?.order_number ?? null,
        customer_name: row.orders?.customers?.name ?? null,
        delivery_method: row.orders?.delivery_method ?? null,
        shipped_at: row.data?.shipped_to_store_at ?? null,
        customer_notified_at: row.data?.customer_notified_at ?? null,
        picked_up_by_customer_at: row.data?.picked_up_by_customer_at ?? null,
        courier_name: row.data?.courier_name ?? null,
        tracking_number: row.data?.tracking_number ?? null,
        completed_at: row.orders?.completed_at ?? null,
        delivery_finished_at: row.finished_at,
      }));

    // ========== ADMIN TASKS ==========
    const adminTasksRaw =
      adminTasksResult.status === "fulfilled" && !adminTasksResult.value.error
        ? adminTasksResult.value.data || []
        : [];

    const fourHoursAgo = new Date(now);
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    const adminTasks = (adminTasksRaw as any[])
      .sort((a, b) => {
        const aActive = a.finished_at == null ? 0 : 1;
        const bActive = b.finished_at == null ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return (
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
      })
      .slice(0, 20)
      .map((row) => ({
        order_id: row.order_id,
        order_number: row.orders?.order_number,
        stage: row.stage,
        executed_by: row.users?.full_name ?? null,
        executed_by_role: row.users?.role?.name ?? null,
        duration_minutes:
          row.duration_minutes ??
          (row.started_at && !row.finished_at
            ? (now.getTime() - new Date(row.started_at).getTime()) / 60000
            : null),
        is_active: row.finished_at == null,
        started_at: row.started_at,
        is_delayed:
          row.finished_at == null && new Date(row.started_at) < fourHoursAgo,
      }));

    // ========== RACIK BAHAN ==========
    const racikRaw =
      racikResult.status === "fulfilled" && !racikResult.value.error
        ? racikResult.value.data || []
        : [];

    const racikFinished = (racikRaw as any[]).filter(
      (row) => row.finished_at != null,
    );

    let deviationSum = 0,
      deviationCount = 0,
      bufferSum = 0,
      bufferCount = 0;

    racikFinished.forEach((row) => {
      const totalWeight = parseFloat(row.data?.total_weight);
      const targetWeight = parseFloat(row.orders?.target_weight);
      if (!isNaN(totalWeight) && !isNaN(targetWeight) && targetWeight > 0) {
        deviationSum +=
          (Math.abs(totalWeight - targetWeight) / targetWeight) * 100;
        deviationCount++;
      }
      const buffer = parseFloat(row.data?.shrinkage_buffer);
      if (!isNaN(buffer)) {
        bufferSum += buffer;
        bufferCount++;
      }
    });

    const racikLogs = racikFinished.slice(0, 5).map((row) => ({
      order_number: row.orders?.order_number ?? null,
      staff_name: row.users?.full_name ?? null,
      target_weight: row.orders?.target_weight ?? null,
      total_weight: row.data?.total_weight ?? null,
      shrinkage_buffer: row.data?.shrinkage_buffer ?? null,
      timestamp: row.finished_at,
    }));

    // Fetch antrian racik
    const [wiRacikResult, antrianRacikResult] = await Promise.allSettled([
      supabase
        .from("work_instructions")
        .select("parameters")
        .eq("stage", "racik_bahan")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("target_weight")
        .eq("current_stage", "racik_bahan")
        .is("deleted_at", null),
    ]);

    const wiRacik =
      wiRacikResult.status === "fulfilled" ? wiRacikResult.value.data : null;
    const antrianRacik =
      antrianRacikResult.status === "fulfilled"
        ? antrianRacikResult.value.data || []
        : [];
    const targetShrinkagePercent =
      parseFloat((wiRacik as any)?.parameters?.shrinkage_buffer_percent) || 5.0;
    const totalBeratTeoritis = (antrianRacik as any[]).reduce(
      (sum, row) => sum + (parseFloat(row.target_weight) || 0),
      0,
    );

    // ========== LASER ==========
    const laserRaw =
      laserResult.status === "fulfilled" && !laserResult.value.error
        ? laserResult.value.data || []
        : [];

    const antrianUkir = (laserRaw as any[]).filter(
      (r) => r.finished_at == null,
    ).length;

    let durationSum = 0,
      durationCount = 0;
    (laserRaw as any[]).forEach((r) => {
      if (r.finished_at != null) {
        const dur = parseFloat(r.data?.engraving_duration_seconds);
        if (!isNaN(dur)) {
          durationSum += dur;
          durationCount++;
        }
      }
    });

    const mesinSet = new Set<string>();
    (laserRaw as any[]).forEach((r) => {
      if (r.finished_at == null) {
        const mid = r.data?.laser_machine_id;
        if (mid) mesinSet.add(mid);
      }
    });

    const laserRecent = (laserRaw as any[])
      .filter((r) => r.finished_at != null)
      .slice(0, 5)
      .map((r) => ({
        order_number: r.orders?.order_number ?? null,
        engraved_text: r.data?.engraved_text ?? null,
        ring_identity_number: r.data?.ring_identity_number ?? null,
        font_style: r.data?.font_style ?? null,
        laser_machine_id: r.data?.laser_machine_id ?? null,
        completed_at: r.finished_at,
      }));

    // ========== QC SUMMARY ==========
    const qcSummaryRaw =
      qcSummaryResult.status === "fulfilled" && !qcSummaryResult.value.error
        ? qcSummaryResult.value.data || []
        : [];

    if (qcSummaryResult.status === "fulfilled" && qcSummaryResult.value.error) {
      console.error(
        "[GET /api/operational] qc summary:",
        qcSummaryResult.value.error.message,
      );
    }

    // Filter to last 7 days in JS
    const sevenDaysAgoMs = sevenDaysAgo.getTime();
    const filteredQcRaw = (qcSummaryRaw as any[]).filter((row: any) => {
      const rowDate = new Date(row.created_at).getTime();
      return rowDate >= sevenDaysAgoMs;
    });

    const srIds = [
      ...new Set(
        (qcSummaryRaw as any[])
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

    const qcSummaryMap = new Map<
      string,
      { total: number; passed: number; failed: number; date: string }
    >();
    (qcSummaryRaw as any[]).forEach((row: any) => {
      const sr = stageMap.get(row.stage_result_id);
      if (!sr) return;
      const stage = sr.stage;
      // Fallback to created_at if finished_at is null
      const date = (sr.finished_at || row.created_at)?.split("T")[0];
      if (!stage || !date) return;
      const key = `${date}_${stage}`;
      if (!qcSummaryMap.has(key))
        qcSummaryMap.set(key, { total: 0, passed: 0, failed: 0, date });
      const entry = qcSummaryMap.get(key)!;
      entry.total++;
      if (row.passed) entry.passed++;
      else entry.failed++;
    });

    const qcSummary = Array.from(qcSummaryMap.entries()).map(([key, val]) => ({
      qc_date: val.date,
      qc_type: key.split("_").slice(1).join("_"),
      total_checks: val.total,
      passed: val.passed,
      failed: val.failed,
      pass_rate: val.total > 0 ? (val.passed / val.total) * 100 : 0,
    }));

    // ========== QC ACTIVITY ==========
    const qcActivityRaw =
      qcActivityResult.status === "fulfilled" && !qcActivityResult.value.error
        ? qcActivityResult.value.data || []
        : [];

    const qcActivity = (qcActivityRaw as any[]).map((row) => ({
      order_number: row.orders?.order_number ?? null,
      stage: row.stage,
      result: row.data?.overall_result ?? null,
      executed_by: row.users?.full_name ?? null,
      finished_at: row.finished_at,
      notes: row.notes,
      issues_found: row.data?.issues_found ?? null,
    }));

    // ========== RESPONSE ==========
    return NextResponse.json({
      data: {
        afterSales: { konfirmasi, pelunasan, delivery },
        adminTasks,
        racik: {
          totalBeratTeoritis,
          rataDeviasi: deviationCount > 0 ? deviationSum / deviationCount : 0,
          rataBuffer: bufferCount > 0 ? bufferSum / bufferCount : 0,
          targetShrinkagePercent,
          logs: racikLogs,
        },
        laser: {
          mesinAktif: Array.from(mesinSet),
          antrianUkir,
          rataWaktuPengerjaan:
            durationCount > 0 ? durationSum / durationCount : 120,
          recentResults: laserRecent,
        },
        qc: { summary: qcSummary, activity: qcActivity },
      },
    });
  } catch (error) {
    console.error("[GET /api/operational] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
