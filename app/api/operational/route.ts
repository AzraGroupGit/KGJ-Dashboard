// app/api/operational/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // ========== AUTH ==========
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Helper tanggal
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgoISO = threeDaysAgo.toISOString();
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // ========== KONFIRMASI (Menunggu Keputusan Customer) ==========
    const { data: konfirmasiRaw, error: konfirmasiError } = await supabase
      .from("stage_results")
      .select(
        `
        data,
        started_at,
        finished_at,
        orders!inner (
          order_number,
          customers!inner ( name, wa_contact )
        )
      `,
      )
      .eq("stage", "konfirmasi_awal")
      .order("started_at", { ascending: false })
      .limit(30);

    if (konfirmasiError) {
      console.error(
        "[GET /api/operasional] konfirmasi:",
        konfirmasiError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data konfirmasi" },
        { status: 500 },
      );
    }

    const konfirmasi = (konfirmasiRaw || [])
      .filter((row: any) => {
        const decision = row.data?.customer_decision;
        return (
          decision == null ||
          (decision !== "approved" && decision !== "rejected")
        );
      })
      .slice(0, 10)
      .map((row: any) => {
        const startedAt = row.started_at;
        const hoursElapsed = startedAt
          ? (now.getTime() - new Date(startedAt).getTime()) / 3_600_000
          : 0;

        return {
          order_number: row.orders?.order_number ?? null,
          customer_name: row.orders?.customers?.name ?? null,
          wa_contact: row.orders?.customers?.wa_contact ?? null,
          dp_requested_at: row.data?.dp_requested_at ?? null,
          dp_received_at: row.data?.dp_received_at ?? null,
          dp_amount: row.data?.dp_amount ?? null,
          customer_decision: row.data?.customer_decision ?? null,
          confirmation_started_at: row.started_at,
          confirmation_finished_at: row.finished_at,
          hours_elapsed: Math.round(hoursElapsed * 10) / 10,
        };
      });

    // ========== PELUNASAN (Menunggu Pelunasan) ==========
    const { data: pelunasanRaw, error: pelunasanError } = await supabase
      .from("v_payment_status")
      .select("*")
      .order("pelunasan_finished_at", { ascending: false, nullsFirst: true })
      .limit(50);

    if (pelunasanError) {
      console.error(
        "[GET /api/operasional] pelunasan:",
        pelunasanError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data pelunasan" },
        { status: 500 },
      );
    }

    const pelunasan = (pelunasanRaw || [])
      .filter((row: any) => row.payment_status !== "lunas")
      .slice(0, 10);

    // ========== DELIVERY (Menunggu Pickup) ==========
    const { data: deliveryRaw, error: deliveryError } = await supabase
      .from("stage_results")
      .select(
        `
        data,
        started_at,
        finished_at,
        orders!inner (
          order_number,
          delivery_method,
          completed_at,
          customers!inner ( name )
        )
      `,
      )
      .eq("stage", "pengiriman")
      .order("started_at", { ascending: false })
      .limit(50);

    if (deliveryError) {
      console.error("[GET /api/operasional] delivery:", deliveryError.message);
      return NextResponse.json(
        { error: "Gagal mengambil data delivery" },
        { status: 500 },
      );
    }

    const delivery = (deliveryRaw || [])
      .filter(
        (row: any) =>
          row.data?.picked_up_by_customer_at == null &&
          row.orders?.completed_at == null,
      )
      .slice(0, 10)
      .map((row: any) => ({
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

    // ========== ADMIN TASKS (Operasional Lintas Stage) ==========
    const { data: adminTasksRaw, error: adminTasksError } = await supabase
      .from("v_stage_duration")
      .select("*")
      .in("stage", ["pelunasan", "kelengkapan", "packing", "pengiriman"])
      .gte("started_at", threeDaysAgoISO)
      .order("started_at", { ascending: false })
      .limit(50);

    if (adminTasksError) {
      console.error(
        "[GET /api/operasional] admin tasks:",
        adminTasksError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data admin tasks" },
        { status: 500 },
      );
    }

    const fourHoursAgo = new Date(now);
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    const adminTasks = (adminTasksRaw || [])
      .sort((a: any, b: any) => {
        const aActive = a.finished_at == null ? 0 : 1;
        const bActive = b.finished_at == null ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return (
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
      })
      .slice(0, 20)
      .map((row: any) => ({
        order_id: row.order_id,
        order_number: row.order_number,
        stage: row.stage,
        executed_by: row.executed_by,
        executed_by_role: row.executed_by_role,
        duration_minutes: row.duration_minutes,
        is_active: row.finished_at == null,
        started_at: row.started_at,
        is_delayed:
          row.finished_at == null && new Date(row.started_at) < fourHoursAgo,
      }));

    // ========== RACIK BAHAN ==========
    const { data: racikRaw, error: racikError } = await supabase
      .from("stage_results")
      .select(
        `
        data,
        finished_at,
        orders!inner ( order_number, target_weight ),
        users!inner ( full_name )
      `,
      )
      .eq("stage", "racik_bahan")
      .gte("finished_at", sevenDaysAgoISO)
      .order("finished_at", { ascending: false });

    if (racikError) {
      console.error("[GET /api/operasional] racik:", racikError.message);
      return NextResponse.json(
        { error: "Gagal mengambil data racik" },
        { status: 500 },
      );
    }

    const racikFinished = (racikRaw || []).filter(
      (row: any) => row.finished_at != null,
    );

    let deviationSum = 0;
    let deviationCount = 0;
    let bufferSum = 0;
    let bufferCount = 0;

    racikFinished.forEach((row: any) => {
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

    const rataDeviasi = deviationCount > 0 ? deviationSum / deviationCount : 0;
    const rataBuffer = bufferCount > 0 ? bufferSum / bufferCount : 0;

    const racikLogs = racikFinished.slice(0, 5).map((row: any) => ({
      order_number: row.orders?.order_number ?? null,
      staff_name: row.users?.full_name ?? null,
      target_weight: row.orders?.target_weight ?? null,
      total_weight: row.data?.total_weight ?? null,
      shrinkage_buffer: row.data?.shrinkage_buffer ?? null,
      timestamp: row.finished_at,
    }));

    const { data: wiRacik } = await supabase
      .from("work_instructions")
      .select("parameters")
      .eq("stage", "racik_bahan")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const targetShrinkagePercent =
      parseFloat(wiRacik?.parameters?.shrinkage_buffer_percent) || 5.0;

    const { data: antrianRacik } = await supabase
      .from("orders")
      .select("target_weight")
      .eq("current_stage", "racik_bahan")
      .is("deleted_at", null);

    const totalBeratTeoritis = (antrianRacik || []).reduce(
      (sum: number, row: any) => sum + (parseFloat(row.target_weight) || 0),
      0,
    );

    // ========== LASER ==========
    const { data: laserRaw, error: laserError } = await supabase
      .from("stage_results")
      .select(
        `
        data,
        started_at,
        finished_at,
        orders!inner ( order_number )
      `,
      )
      .eq("stage", "laser")
      .gte("started_at", sevenDaysAgoISO)
      .order("started_at", { ascending: false });

    if (laserError) {
      console.error("[GET /api/operasional] laser:", laserError.message);
      return NextResponse.json(
        { error: "Gagal mengambil data laser" },
        { status: 500 },
      );
    }

    const laserRows = laserRaw || [];

    const antrianUkir = laserRows.filter(
      (r: any) => r.finished_at == null,
    ).length;

    let durationSum = 0;
    let durationCount = 0;
    laserRows.forEach((r: any) => {
      if (r.finished_at != null) {
        const dur = parseFloat(r.data?.engraving_duration_seconds);
        if (!isNaN(dur)) {
          durationSum += dur;
          durationCount++;
        }
      }
    });
    const rataWaktu = durationCount > 0 ? durationSum / durationCount : 120;

    const mesinSet = new Set<string>();
    laserRows.forEach((r: any) => {
      if (r.finished_at == null) {
        const mid = r.data?.laser_machine_id;
        if (mid) mesinSet.add(mid);
      }
    });
    const mesinAktif = Array.from(mesinSet);

    const laserRecent = laserRows
      .filter((r: any) => r.finished_at != null)
      .slice(0, 5)
      .map((r: any) => ({
        order_number: r.orders?.order_number ?? null,
        engraved_text: r.data?.engraved_text ?? null,
        ring_identity_number: r.data?.ring_identity_number ?? null,
        font_style: r.data?.font_style ?? null,
        laser_machine_id: r.data?.laser_machine_id ?? null,
        completed_at: r.finished_at,
      }));

    // ========== QC SUMMARY ==========
    const sevenDaysAgoDate = sevenDaysAgoISO.split("T")[0];
    const { data: qcSummaryRaw, error: qcSummaryError } = await supabase
      .from("v_quality_summary")
      .select("*")
      .gte("qc_date", sevenDaysAgoDate)
      .order("qc_date", { ascending: false });

    if (qcSummaryError) {
      console.error(
        "[GET /api/operasional] qc summary:",
        qcSummaryError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil ringkasan QC" },
        { status: 500 },
      );
    }

    const qcSummary = (qcSummaryRaw || []).map((row: any) => ({
      qc_date: row.qc_date,
      qc_type: row.qc_type,
      total_checks: row.total_checks,
      passed: row.passed,
      failed: row.failed,
      pass_rate: row.pass_rate_percent,
    }));

    // ========== QC ACTIVITY ==========
    const { data: qcActivityRaw, error: qcActivityError } = await supabase
      .from("stage_results")
      .select(
        `
        data,
        notes,
        stage,
        finished_at,
        orders!inner ( order_number ),
        users!inner ( full_name )
      `,
      )
      .in("stage", ["qc_awal", "qc_1", "qc_2", "qc_3"])
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(15);

    if (qcActivityError) {
      console.error(
        "[GET /api/operasional] qc activity:",
        qcActivityError.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil aktivitas QC" },
        { status: 500 },
      );
    }

    const qcActivity = (qcActivityRaw || []).map((row: any) => ({
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
        afterSales: {
          konfirmasi,
          pelunasan,
          delivery,
        },
        adminTasks,
        racik: {
          totalBeratTeoritis,
          rataDeviasi,
          rataBuffer,
          targetShrinkagePercent,
          logs: racikLogs,
        },
        laser: {
          mesinAktif,
          antrianUkir,
          rataWaktuPengerjaan: rataWaktu,
          recentResults: laserRecent,
        },
        qc: {
          summary: qcSummary,
          activity: qcActivity,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/operasional] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
