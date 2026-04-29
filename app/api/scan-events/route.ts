// app/api/scan-events/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface ScanEventWithRelations {
  id: string;
  order_id: string;
  user_id: string;
  stage_result_id: string | null;
  stage: string;
  action: string;
  device_info: string | null;
  ip_address: string | null;
  scanned_at: string;
  orders: {
    id: string;
    order_number: string;
    product_name: string;
    current_stage: string;
    status: string;
  } | null;
  users: {
    id: string;
    full_name: string;
    email: string;
    role: {
      id: string;
      name: string;
      role_group: string;
    } | null;
  } | null;
  stage_results: {
    id: string;
    attempt_number: number;
    started_at: string;
    finished_at: string | null;
  } | null;
}

interface ScanEventStats {
  total_scans: number;
  today_scans: number;
  this_week_scans: number;
  this_month_scans: number;
  scans_by_action: Record<string, number>;
  scans_by_stage: Record<string, number>;
  top_users: Array<{
    user_id: string;
    full_name: string;
    scan_count: number;
  }>;
  peak_hours: Array<{
    hour: number;
    count: number;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_ACTIONS = [
  "open",
  "submit",
  "edit",
  "read",
  "delete",
  "reject",
] as const;
const VALID_STAGES = [
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
  "selesai",
] as const;

const ACTION_LABELS: Record<string, string> = {
  open: "Membuka",
  submit: "Submit",
  edit: "Edit",
  read: "Baca",
  delete: "Hapus",
  reject: "Tolak",
};

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan Order",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  approval_qc_1: "Approval QC 1",
  finishing: "Finishing",
  laser: "Laser Engraving",
  qc_2: "QC 2",
  approval_qc_2: "Approval QC 2",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3 (Final)",
  approval_qc_3: "Approval QC 3",
  packing: "Packing",
  pelunasan: "Pelunasan & Pembayaran",
  approval_pelunasan: "Approval Pelunasan",
  pengiriman: "Pengiriman & Handover",
  selesai: "Selesai",
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getDateRange(
  startDate?: string,
  endDate?: string,
): { from: string; to: string } {
  const now = new Date();
  const to = endDate ? new Date(endDate) : now;
  const from = startDate
    ? new Date(startDate)
    : new Date(now.setDate(now.getDate() - 30));

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function isValidStage(stage: string): stage is (typeof VALID_STAGES)[number] {
  return VALID_STAGES.includes(stage as (typeof VALID_STAGES)[number]);
}

function isValidAction(
  action: string,
): action is (typeof VALID_ACTIONS)[number] {
  return VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number]);
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

/**
 * GET /api/scan-events
 * Mendapatkan daftar scan events dengan filter
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const order_id = searchParams.get("order_id");
    const user_id = searchParams.get("user_id");
    const stage = searchParams.get("stage");
    const action = searchParams.get("action");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const order_number = searchParams.get("order_number");

    // Validate parameters
    if (stage && !isValidStage(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 },
      );
    }

    if (action && !isValidAction(action)) {
      return NextResponse.json(
        {
          error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Build query
    let query = supabase
      .from("scan_events")
      .select(
        `
        id,
        order_id,
        user_id,
        stage_result_id,
        stage,
        action,
        device_info,
        ip_address,
        scanned_at,
        orders!inner (
          id,
          order_number,
          product_name,
          current_stage,
          status
        ),
        users!inner (
          id,
          full_name,
          email,
          role:roles!users_role_id_fkey (
            id,
            name,
            role_group
          )
        ),
        stage_results (
          id,
          attempt_number,
          started_at,
          finished_at
        )
      `,
        { count: "exact" },
      )
      .order("scanned_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (order_id) {
      query = query.eq("order_id", order_id);
    }

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    if (stage) {
      query = query.eq("stage", stage);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (order_number) {
      // First find order_id from order_number
      const { data: orderData } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", order_number)
        .single();

      if (orderData) {
        query = query.eq("order_id", orderData.id);
      } else {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          message: "Order tidak ditemukan",
        });
      }
    }

    if (start_date || end_date) {
      const { from, to } = getDateRange(
        start_date || undefined,
        end_date || undefined,
      );
      query = query.gte("scanned_at", from).lte("scanned_at", to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /api/scan-events] Query error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data scan events" },
        { status: 500 },
      );
    }

    // Transform data
    const transformedData = (data as unknown as ScanEventWithRelations[])?.map(
      (event) => ({
        id: event.id,
        order_id: event.order_id,
        order_number: event.orders?.order_number,
        product_name: event.orders?.product_name,
        current_order_stage: event.orders?.current_stage,
        order_status: event.orders?.status,
        user_id: event.user_id,
        user_name: event.users?.full_name,
        user_email: event.users?.email,
        user_role: event.users?.role?.name,
        user_role_group: event.users?.role?.role_group,
        stage: event.stage,
        stage_label: STAGE_LABELS[event.stage] || event.stage,
        action: event.action,
        action_label: ACTION_LABELS[event.action] || event.action,
        stage_result_id: event.stage_result_id,
        attempt_number: event.stage_results?.attempt_number,
        stage_duration:
          event.stage_results?.started_at && event.stage_results?.finished_at
            ? (new Date(event.stage_results.finished_at).getTime() -
                new Date(event.stage_results.started_at).getTime()) /
              1000
            : null,
        device_info: event.device_info,
        ip_address: event.ip_address,
        scanned_at: event.scanned_at,
        scanned_at_formatted: new Date(event.scanned_at).toLocaleString(
          "id-ID",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
      }),
    );

    return NextResponse.json({
      success: true,
      data: transformedData,
      total: count || 0,
      limit,
      offset,
      has_more: offset + limit < (count || 0),
    });
  } catch (error) {
    console.error("[GET /api/scan-events] Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/scan-events
 * Membuat scan event baru (biasanya dari QR scan atau manual entry)
 * Body: { order_id, stage, action, device_info?, ip_address?, stage_result_id? }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      order_id,
      stage,
      action,
      device_info,
      ip_address,
      stage_result_id,
    } = body;

    // Validate required fields
    if (!order_id || !stage || !action) {
      return NextResponse.json(
        { error: "order_id, stage, dan action wajib diisi" },
        { status: 400 },
      );
    }

    if (!isValidStage(stage)) {
      return NextResponse.json(
        {
          error: `Stage tidak valid. Pilih salah satu: ${VALID_STAGES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!isValidAction(action)) {
      return NextResponse.json(
        {
          error: `Action tidak valid. Pilih salah satu: ${VALID_ACTIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, current_stage")
      .eq("id", order_id)
      .is("deleted_at", null)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    // Create scan event
    const { data: scanEvent, error: insertError } = await supabase
      .from("scan_events")
      .insert({
        order_id,
        user_id: user.id,
        stage_result_id: stage_result_id || null,
        stage,
        action,
        device_info: device_info || "Web Dashboard",
        ip_address: ip_address || null,
        scanned_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        order_id,
        user_id,
        stage_result_id,
        stage,
        action,
        device_info,
        ip_address,
        scanned_at
      `,
      )
      .single();

    if (insertError) {
      console.error("[POST /api/scan-events] Insert error:", insertError);
      return NextResponse.json(
        { error: "Gagal menyimpan scan event" },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "CREATE_SCAN_EVENT",
      entity_type: "scan_events",
      entity_id: scanEvent.id,
      new_data: { order_id, stage, action },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Scan event berhasil dicatat",
        data: scanEvent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/scan-events] Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ─── GET Stats Handler ────────────────────────────────────────────────────────

/**
 * GET /api/scan-events/stats
 * Mendapatkan statistik scan events
 */
export async function GET_STATS(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const { from, to } = getDateRange(
      start_date || undefined,
      end_date || undefined,
    );

    // Get all scan events in date range
    const { data: events, error: eventsError } = await supabase
      .from("scan_events")
      .select(
        `
        id,
        action,
        stage,
        user_id,
        scanned_at,
        users (
          id,
          full_name
        )
      `,
      )
      .gte("scanned_at", from)
      .lte("scanned_at", to);

    if (eventsError) {
      console.error("[GET /api/scan-events/stats] Error:", eventsError);
      return NextResponse.json(
        { error: "Gagal mengambil statistik" },
        { status: 500 },
      );
    }

    const typedEvents = events as unknown as Array<{
      id: string;
      action: string;
      stage: string;
      user_id: string;
      scanned_at: string;
      users: { id: string; full_name: string } | null;
    }>;

    const totalScans = typedEvents.length;
    const todayScans = typedEvents.filter(
      (e) =>
        new Date(e.scanned_at).toDateString() === new Date().toDateString(),
    ).length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekScans = typedEvents.filter(
      (e) => new Date(e.scanned_at) >= oneWeekAgo,
    ).length;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const thisMonthScans = typedEvents.filter(
      (e) => new Date(e.scanned_at) >= oneMonthAgo,
    ).length;

    // Scans by action
    const scansByAction: Record<string, number> = {};
    typedEvents.forEach((event) => {
      scansByAction[event.action] = (scansByAction[event.action] || 0) + 1;
    });

    // Scans by stage
    const scansByStage: Record<string, number> = {};
    typedEvents.forEach((event) => {
      scansByStage[event.stage] = (scansByStage[event.stage] || 0) + 1;
    });

    // Top users
    const userCounts: Record<string, { full_name: string; count: number }> = {};
    typedEvents.forEach((event) => {
      if (event.users) {
        if (!userCounts[event.user_id]) {
          userCounts[event.user_id] = {
            full_name: event.users.full_name,
            count: 0,
          };
        }
        userCounts[event.user_id].count++;
      }
    });

    const topUsers = Object.entries(userCounts)
      .map(([user_id, data]) => ({
        user_id,
        full_name: data.full_name,
        scan_count: data.count,
      }))
      .sort((a, b) => b.scan_count - a.scan_count)
      .slice(0, 10);

    // Peak hours
    const hourCounts: Record<number, number> = {};
    typedEvents.forEach((event) => {
      const hour = new Date(event.scanned_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const stats: ScanEventStats = {
      total_scans: totalScans,
      today_scans: todayScans,
      this_week_scans: thisWeekScans,
      this_month_scans: thisMonthScans,
      scans_by_action: scansByAction,
      scans_by_stage: scansByStage,
      top_users: topUsers,
      peak_hours: peakHours,
    };

    return NextResponse.json({
      success: true,
      data: stats,
      period: { from, to },
    });
  } catch (error) {
    console.error("[GET /api/scan-events/stats] Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
