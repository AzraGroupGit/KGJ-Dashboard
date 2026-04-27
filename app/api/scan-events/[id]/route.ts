// app/api/scan-events/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface OrderWithCustomer {
  id: string;
  order_number: string;
  product_name: string;
  current_stage: string;
  status: string;
  customers: Customer | null;
}

interface Role {
  id: string;
  name: string;
  role_group: string;
}

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  roles: Role | null;
}

interface StageResult {
  id: string;
  attempt_number: number;
  started_at: string;
  finished_at: string | null;
  data: Record<string, unknown> | null;
}

interface ScanEventDetail {
  id: string;
  order_id: string;
  user_id: string;
  stage_result_id: string | null;
  stage: string;
  action: string;
  device_info: string | null;
  ip_address: string | null;
  scanned_at: string;
  orders: OrderWithCustomer | null;
  users: UserWithRole | null;
  stage_results: StageResult | null;
}

interface CurrentUserWithRole {
  roles: {
    name: string;
  } | null;
}

interface RouteParams {
  params: {
    id: string;
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

/**
 * GET /api/scan-events/[id]
 * Mendapatkan detail scan event berdasarkan ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "ID scan event diperlukan", code: "MISSING_ID" },
        { status: 400 },
      );
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Format ID tidak valid", code: "INVALID_ID_FORMAT" },
        { status: 400 },
      );
    }

    const { data: scanEvent, error: fetchError } = await supabase
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
          status,
          customers (
            id,
            name,
            phone
          )
        ),
        users!inner (
          id,
          full_name,
          email,
          roles (
            id,
            name,
            role_group
          )
        ),
        stage_results (
          id,
          attempt_number,
          started_at,
          finished_at,
          data
        )
      `,
      )
      .eq("id", id)
      .single<ScanEventDetail>();

    if (fetchError) {
      console.error("[GET /api/scan-events/:id] Error:", fetchError);

      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Scan event tidak ditemukan", code: "NOT_FOUND" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Gagal mengambil data scan event", code: "FETCH_ERROR" },
        { status: 500 },
      );
    }

    if (!scanEvent) {
      return NextResponse.json(
        { error: "Scan event tidak ditemukan", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Transform data for better response structure
    const transformedData = {
      id: scanEvent.id,
      order_id: scanEvent.order_id,
      order_number: scanEvent.orders?.order_number,
      product_name: scanEvent.orders?.product_name,
      current_order_stage: scanEvent.orders?.current_stage,
      order_status: scanEvent.orders?.status,
      customer: scanEvent.orders?.customers
        ? {
            id: scanEvent.orders.customers.id,
            name: scanEvent.orders.customers.name,
            phone: scanEvent.orders.customers.phone,
          }
        : null,
      user_id: scanEvent.user_id,
      user_name: scanEvent.users?.full_name,
      user_email: scanEvent.users?.email,
      user_role: scanEvent.users?.roles?.name,
      user_role_group: scanEvent.users?.roles?.role_group,
      stage_result_id: scanEvent.stage_result_id,
      stage: scanEvent.stage,
      action: scanEvent.action,
      attempt_number: scanEvent.stage_results?.attempt_number,
      stage_started_at: scanEvent.stage_results?.started_at,
      stage_finished_at: scanEvent.stage_results?.finished_at,
      stage_duration:
        scanEvent.stage_results?.started_at &&
        scanEvent.stage_results?.finished_at
          ? (new Date(scanEvent.stage_results.finished_at).getTime() -
              new Date(scanEvent.stage_results.started_at).getTime()) /
            1000
          : null,
      stage_data: scanEvent.stage_results?.data,
      device_info: scanEvent.device_info,
      ip_address: scanEvent.ip_address,
      scanned_at: scanEvent.scanned_at,
      scanned_at_formatted: new Date(scanEvent.scanned_at).toLocaleString(
        "id-ID",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        },
      ),
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error("[GET /api/scan-events/:id] Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

// ─── DELETE Handler ───────────────────────────────────────────────────────────

/**
 * DELETE /api/scan-events/[id]
 * Menghapus scan event (hanya untuk superadmin)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "ID scan event diperlukan", code: "MISSING_ID" },
        { status: 400 },
      );
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Format ID tidak valid", code: "INVALID_ID_FORMAT" },
        { status: 400 },
      );
    }

    // Check if user is superadmin
    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("roles!inner(name)")
      .eq("id", user.id)
      .single<CurrentUserWithRole>();

    if (userError || !currentUser) {
      console.error(
        "[DELETE /api/scan-events/:id] User check error:",
        userError,
      );
      return NextResponse.json(
        { error: "User tidak ditemukan", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (currentUser.roles?.name !== "superadmin") {
      return NextResponse.json(
        {
          error: "Forbidden - Hanya superadmin yang dapat menghapus",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    // Check if scan event exists before deletion
    const { data: existingScanEvent, error: checkError } = await supabase
      .from("scan_events")
      .select("id, order_id, action, scanned_at")
      .eq("id", id)
      .single();

    if (checkError) {
      console.error("[DELETE /api/scan-events/:id] Check error:", checkError);

      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Scan event tidak ditemukan", code: "NOT_FOUND" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Gagal memeriksa scan event", code: "CHECK_ERROR" },
        { status: 500 },
      );
    }

    // Perform deletion
    const { error: deleteError } = await supabase
      .from("scan_events")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[DELETE /api/scan-events/:id] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Gagal menghapus scan event", code: "DELETE_ERROR" },
        { status: 500 },
      );
    }

    // Log activity
    const { error: logError } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "DELETE_SCAN_EVENT",
      entity_type: "scan_events",
      entity_id: id,
      old_data: existingScanEvent,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    if (logError) {
      console.error("[DELETE /api/scan-events/:id] Log error:", logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "Scan event berhasil dihapus",
      deleted_id: id,
    });
  } catch (error) {
    console.error("[DELETE /api/scan-events/:id] Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
