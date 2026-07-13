// app/api/supervisor/order-detail/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  legacyToOrderDetail,
  type LegacyOrderRow,
  type TrackingStageRow,
} from "@/lib/legacy/adapter";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    if (!orderId)
      return NextResponse.json({ error: "order_id wajib diisi" }, { status: 400 });

    // ── 1. legacy_order — the single source of truth ───────────────────────────
    const { data: legacyOrder, error: orderError } = await admin
      .from("legacy_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !legacyOrder)
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // ── 2. Tracking pointer ────────────────────────────────────────────────────
    const { data: tracking } = await admin
      .from("tracking_stages")
      .select("id, order_id, current_stage, stage_status, assigned_to, updated_at, updated_by")
      .eq("order_id", orderId)
      .maybeSingle();

    // ── 3. Stage history → mapped into the transitions shape ───────────────────
    const { data: history, error: histErr } = await admin
      .from("stage_history")
      .select(`stage, status, note, created_at, data, attempt_number,
        users!stage_history_changed_by_fkey ( full_name )`)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (histErr) console.error("[OrderDetail] stage_history error:", histErr);

    const transitions = (history ?? []).map((h) => ({
      from_stage: null,
      to_stage: h.stage,
      reason: h.note ?? null,
      transitioned_at: h.created_at,
      users: (h as { users?: { full_name?: string } }).users ?? null,
    }));

    const stageResults = (history ?? []).map((h, i) => ({
      id: `${orderId}-${i}`,
      stage: h.stage,
      attempt_number: (h as { attempt_number?: number }).attempt_number ?? 1,
      data: (h as { data?: unknown }).data ?? {},
      notes: h.note ?? null,
      started_at: h.created_at,
      finished_at: h.created_at,
      users: (h as { users?: { full_name?: string } }).users ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        order: legacyToOrderDetail(
          legacyOrder as LegacyOrderRow,
          tracking as TrackingStageRow | null,
        ),
        transitions,
        stageResults,
        deliveries: [],
        scanEvents: [],
        approvals: [],
      },
    });
  } catch (error) {
    console.error("[Order Detail] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
