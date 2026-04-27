// app/api/qr-scan/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface QRCodeWithRole {
  id: string;
  role_id: string;
  workstation_name: string;
  location: string | null;
  is_active: boolean;
  roles: {
    id: string;
    name: string;
    role_group: string;
    allowed_stages: string[] | null;
  } | null;
}

interface OrderWithCustomer {
  id: string;
  order_number: string;
  current_stage: string;
  status: string;
  product_name: string;
  customers: { name: string } | null;
}

interface StageResult {
  id: string;
  user_id: string;
  started_at: string;
}

interface ActiveStageResult extends StageResult {
  users?: {
    full_name: string;
  } | null;
}

interface UserRole {
  roles: {
    name: string;
  } | null;
}

interface ScanRequestBody {
  qr_token: string;
  order_number: string;
  action: "open" | "submit" | "edit" | "read" | "delete" | "reject";
}

interface StageFlow {
  [key: string]: string;
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
type ValidAction = (typeof VALID_ACTIONS)[number];

const STAGE_FLOW: StageFlow = {
  penerimaan_order: "qc_awal",
  qc_awal: "racik_bahan",
  racik_bahan: "lebur_bahan",
  lebur_bahan: "pembentukan_cincin",
  pembentukan_cincin: "pemasangan_permata",
  pemasangan_permata: "pemolesan",
  pemolesan: "qc_1",
  qc_1: "konfirmasi_awal",
  konfirmasi_awal: "finishing",
  finishing: "laser",
  laser: "qc_2",
  qc_2: "pelunasan",
  pelunasan: "kelengkapan",
  kelengkapan: "qc_3",
  qc_3: "packing",
  packing: "pengiriman",
  pengiriman: "selesai",
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function isValidAction(action: string): action is ValidAction {
  return VALID_ACTIONS.includes(action as ValidAction);
}

function getClientIP(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function calculateDuration(startedAt: string, finishedAt: string): number {
  return (
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );
}

// ─── Main Handler ────────────────────────────────────────────────────────────

// ─── GET Handler: Validasi QR Code ──────────────────────────────────────────

/**
 * GET /api/qr-scan?qr_token=...&order_number=...
 *
 * Dipanggil dari halaman login QR untuk validasi awal.
 * Tidak memerlukan autentikasi — hanya mengecek apakah QR valid dan order ada.
 *
 * Response:
 * - QR valid: return info workstation & order
 * - QR invalid: return error
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const qrToken = searchParams.get("qr_token");
    const orderNumber = searchParams.get("order_number");

    // Validasi parameter
    if (!qrToken || !orderNumber) {
      return NextResponse.json(
        {
          error: "QR token dan nomor order wajib diisi",
          code: "MISSING_PARAMS",
        },
        { status: 400 },
      );
    }

    // Validasi QR Code
    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select(
        `
        id,
        role_id,
        workstation_name,
        location,
        is_active,
        roles:roles!qr_codes_role_id_fkey (
          id,
          name,
          role_group,
          allowed_stages
        )
      `,
      )
      .eq("qr_token", qrToken)
      .eq("is_active", true)
      .single<QRCodeWithRole>();

    if (qrError || !qrCode) {
      return NextResponse.json(
        {
          error: "QR Code tidak valid atau tidak aktif",
          code: "INVALID_QR_CODE",
        },
        { status: 404 },
      );
    }

    // Validasi order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, current_stage, status, product_name, customers!orders_customer_id_fkey(name)")
      .eq("order_number", orderNumber)
      .is("deleted_at", null)
      .single<OrderWithCustomer>();

    if (orderError || !order) {
      return NextResponse.json(
        {
          error: "Order tidak ditemukan",
          code: "ORDER_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Cek akses stage (optional — hanya info, tidak memblokir)
    const allowedStages = qrCode.roles?.allowed_stages || [];
    const hasAccess = allowedStages.includes(order.current_stage);

    return NextResponse.json({
      success: true,
      code: "QR_VALID",
      data: {
        workstation: qrCode.workstation_name,
        location: qrCode.location,
        role: qrCode.roles?.name,
        role_group: qrCode.roles?.role_group,
        has_access: hasAccess,
        allowed_stages: allowedStages,
        order: {
          id: order.id,
          order_number: order.order_number,
          product_name: order.product_name,
          customer_name: order.customers?.name || null,
          current_stage: order.current_stage,
          status: order.status,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/qr-scan] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/qr-scan
 * Worker scan QR workstation untuk mulai/selesai mengerjakan order
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authentication
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

    // 2. Validate request body
    let body: ScanRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    const { qr_token, order_number, action } = body;

    if (!qr_token || !order_number || !action) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          code: "MISSING_FIELDS",
          required: ["qr_token", "order_number", "action"],
        },
        { status: 400 },
      );
    }

    if (!isValidAction(action)) {
      return NextResponse.json(
        {
          error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`,
          code: "INVALID_ACTION",
        },
        { status: 400 },
      );
    }

    // 3. Validate QR Code from qr_codes table
    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select(
        `
        id,
        role_id,
        workstation_name,
        location,
        is_active,
        roles:roles!qr_codes_role_id_fkey (
          id,
          name,
          role_group,
          allowed_stages
        )
      `,
      )
      .eq("qr_token", qr_token)
      .eq("is_active", true)
      .single<QRCodeWithRole>();

    if (qrError || !qrCode) {
      console.error("[POST /api/qr-scan] QR validation error:", qrError);
      return NextResponse.json(
        {
          error: "QR Code tidak valid atau tidak aktif",
          code: "INVALID_QR_CODE",
        },
        { status: 404 },
      );
    }

    if (!qrCode.roles) {
      return NextResponse.json(
        {
          error: "QR Code tidak memiliki role yang terdaftar",
          code: "QR_NO_ROLE",
        },
        { status: 400 },
      );
    }

    // 4. Find order by order_number
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, current_stage, status, product_name, customers!orders_customer_id_fkey(name)")
      .eq("order_number", order_number)
      .is("deleted_at", null)
      .single<OrderWithCustomer>();

    if (orderError || !order) {
      return NextResponse.json(
        {
          error: "Order tidak ditemukan",
          code: "ORDER_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // 5. Validate stage access
    const allowedStages = qrCode.roles.allowed_stages || [];
    const currentStage = order.current_stage;

    // For 'read' action, always allow (view only)
    if (action !== "read" && !allowedStages.includes(currentStage)) {
      return NextResponse.json(
        {
          error: `${qrCode.workstation_name} tidak memiliki akses ke stage "${currentStage}"`,
          code: "ACCESS_DENIED",
          current_stage: currentStage,
          allowed_stages: allowedStages,
        },
        { status: 403 },
      );
    }

    const clientIP = getClientIP(request);
    const now = new Date().toISOString();

    // 6. Handle different actions
    switch (action) {
      case "submit":
      case "open":
        return await handleStartWork(
          supabase,
          order,
          qrCode,
          user.id,
          action,
          clientIP,
          now,
        );

      case "edit":
        return await handleEditWork(
          supabase,
          order,
          qrCode,
          user.id,
          clientIP,
          now,
        );

      case "read":
        return await handleReadOrder(
          supabase,
          order,
          qrCode,
          user.id,
          clientIP,
          now,
        );

      case "delete":
        return await handleDeleteOrder(
          supabase,
          order,
          qrCode,
          user.id,
          clientIP,
          now,
        );

      case "reject":
        return await handleRejectOrder(
          supabase,
          order,
          qrCode,
          user.id,
          clientIP,
          now,
        );

      default:
        return NextResponse.json(
          { error: "Unhandled action", code: "UNHANDLED_ACTION" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[POST /api/qr-scan] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan server",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function handleStartWork(
  supabase: any,
  order: OrderWithCustomer,
  qrCode: QRCodeWithRole,
  userId: string,
  action: "open" | "submit",
  clientIP: string | null,
  timestamp: string,
) {
  const currentStage = order.current_stage;

  // Check if there's an active work session for this order and stage
  const { data: activeStage, error: activeError } = await supabase
    .from("stage_results")
    .select(
      `
      id,
      user_id,
      started_at,
      users:users!inner (
        full_name
      )
    `,
    )
    .eq("order_id", order.id)
    .eq("stage", currentStage)
    .is("finished_at", null)
    .maybeSingle();

  if (activeError) {
    console.error("[handleStartWork] Check active stage error:", activeError);
    return NextResponse.json(
      { error: "Gagal memeriksa status pengerjaan", code: "CHECK_FAILED" },
      { status: 500 },
    );
  }

  if (activeStage) {
    return NextResponse.json(
      {
        error: `Order sedang dikerjakan oleh user lain di stage ${currentStage}`,
        code: "WORK_IN_PROGRESS",
        current_handler: activeStage.users?.full_name,
      },
      { status: 409 },
    );
  }

  // Get attempt number
  const { data: previousAttempts } = await supabase
    .from("stage_results")
    .select("attempt_number")
    .eq("order_id", order.id)
    .eq("stage", currentStage)
    .order("attempt_number", { ascending: false })
    .limit(1);

  const attemptNumber = (previousAttempts?.[0]?.attempt_number || 0) + 1;

  // Create new stage result
  const { data: newStage, error: stageError } = await supabase
    .from("stage_results")
    .insert({
      order_id: order.id,
      user_id: userId,
      stage: currentStage,
      attempt_number: attemptNumber,
      started_at: timestamp,
      data: {
        workstation: qrCode.workstation_name,
        location: qrCode.location,
        role: qrCode.roles?.name,
        role_group: qrCode.roles?.role_group,
        scanned_via: "qr_code",
        action: action,
      },
    })
    .select("id")
    .single();

  if (stageError) {
    console.error("[handleStartWork] Create stage error:", stageError);
    return NextResponse.json(
      { error: "Gagal memulai pengerjaan", code: "CREATE_STAGE_FAILED" },
      { status: 500 },
    );
  }

  // Log scan event
  await supabase.from("scan_events").insert({
    order_id: order.id,
    user_id: userId,
    stage_result_id: newStage.id,
    stage: currentStage,
    action: action,
    device_info: "QR Scanner",
    ip_address: clientIP,
    scanned_at: timestamp,
  });

  const actionLabel = action === "submit" ? "Memulai" : "Membuka";

  return NextResponse.json({
    success: true,
    message: `${actionLabel} pengerjaan order ${order.order_number} di ${qrCode.workstation_name}`,
    code: "WORK_STARTED",
    data: {
      order_id: order.id,
      order_number: order.order_number,
      stage: currentStage,
      stage_result_id: newStage.id,
      workstation: qrCode.workstation_name,
      attempt: attemptNumber,
    },
  });
}

async function handleEditWork(
  supabase: any,
  order: OrderWithCustomer,
  qrCode: QRCodeWithRole,
  userId: string,
  clientIP: string | null,
  timestamp: string,
) {
  const currentStage = order.current_stage;

  // Find active stage result
  const { data: activeStage, error: activeError } = await supabase
    .from("stage_results")
    .select("id, user_id, started_at")
    .eq("order_id", order.id)
    .eq("stage", currentStage)
    .is("finished_at", null)
    .maybeSingle();

  if (activeError || !activeStage) {
    return NextResponse.json(
      {
        error: "Tidak ada pengerjaan aktif untuk diedit",
        code: "NO_ACTIVE_WORK",
      },
      { status: 404 },
    );
  }

  // Validate that the same user who started is editing
  if (activeStage.user_id !== userId) {
    return NextResponse.json(
      {
        error: "Hanya user yang memulai yang bisa mengedit",
        code: "EDIT_PERMISSION_DENIED",
      },
      { status: 403 },
    );
  }

  // Log edit event
  await supabase.from("scan_events").insert({
    order_id: order.id,
    user_id: userId,
    stage_result_id: activeStage.id,
    stage: currentStage,
    action: "edit",
    device_info: "QR Scanner",
    ip_address: clientIP,
    scanned_at: timestamp,
  });

  return NextResponse.json({
    success: true,
    message: `Edit pengerjaan order ${order.order_number} di ${qrCode.workstation_name}`,
    code: "WORK_EDITED",
    data: {
      order_id: order.id,
      order_number: order.order_number,
      stage: currentStage,
      stage_result_id: activeStage.id,
    },
  });
}

async function handleReadOrder(
  supabase: any,
  order: OrderWithCustomer,
  qrCode: QRCodeWithRole,
  userId: string,
  clientIP: string | null,
  timestamp: string,
) {
  // Log read event
  await supabase.from("scan_events").insert({
    order_id: order.id,
    user_id: userId,
    stage: order.current_stage,
    action: "read",
    device_info: "QR Scanner",
    ip_address: clientIP,
    scanned_at: timestamp,
  });

  return NextResponse.json({
    success: true,
    message: `Informasi order ${order.order_number} dibaca`,
    code: "ORDER_READ",
    data: {
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customers?.name || null,
      product_name: order.product_name,
      current_stage: order.current_stage,
      status: order.status,
    },
  });
}

async function handleDeleteOrder(
  supabase: any,
  order: OrderWithCustomer,
  qrCode: QRCodeWithRole,
  userId: string,
  clientIP: string | null,
  timestamp: string,
) {
  // Check if user is superadmin
  const { data: userRole, error: roleError } = await supabase
    .from("users")
    .select("role:roles!users_role_id_fkey(name)")
    .eq("id", userId)
    .single();

  if (roleError || (userRole?.role as any)?.name !== "superadmin") {
    return NextResponse.json(
      {
        error: "Hanya superadmin yang bisa menghapus data",
        code: "DELETE_PERMISSION_DENIED",
      },
      { status: 403 },
    );
  }

  // Soft delete order
  await supabase
    .from("orders")
    .update({
      deleted_at: timestamp,
      status: "cancelled",
      updated_at: timestamp,
    })
    .eq("id", order.id);

  // Log delete event
  await supabase.from("scan_events").insert({
    order_id: order.id,
    user_id: userId,
    stage: order.current_stage,
    action: "delete",
    device_info: "QR Scanner",
    ip_address: clientIP,
    scanned_at: timestamp,
  });

  return NextResponse.json({
    success: true,
    message: `Order ${order.order_number} telah dihapus`,
    code: "ORDER_DELETED",
  });
}

async function handleRejectOrder(
  supabase: any,
  order: OrderWithCustomer,
  qrCode: QRCodeWithRole,
  userId: string,
  clientIP: string | null,
  timestamp: string,
) {
  await supabase
    .from("orders")
    .update({
      status: "rejected",
      updated_at: timestamp,
    })
    .eq("id", order.id);

  // Log reject event
  await supabase.from("scan_events").insert({
    order_id: order.id,
    user_id: userId,
    stage: order.current_stage,
    action: "reject",
    device_info: "QR Scanner",
    ip_address: clientIP,
    scanned_at: timestamp,
  });

  return NextResponse.json({
    success: true,
    message: `Order ${order.order_number} ditolak`,
    code: "ORDER_REJECTED",
  });
}
