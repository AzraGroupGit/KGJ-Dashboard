// app/api/supervisor/order-detail/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      return NextResponse.json(
        { error: "order_id wajib diisi" },
        { status: 400 },
      );

    // Fetch order with customer
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        `
        id, order_number, product_name, target_weight, target_karat,
        ring_size, model_description, special_notes, engraved_text,
        delivery_method, order_date, deadline, total_price, dp_amount,
        rhodium_specification, current_stage, status, created_at, updated_at,
        ring_identity_number,
        customers!orders_customer_id_fkey ( name, phone, wa_contact, email, address )
      `,
      )
      .eq("id", orderId)
      .is("deleted_at", null)
      .single();

    if (orderError || !order)
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );

    // Fetch gemstones
    const { data: gemstones } = await admin
      .from("order_gemstones")
      .select(
        "gemstone_type, shape, weight_ct, weight_grams, clarity, color, quantity, source, certificate_no",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    // Fetch stage history
    const { data: transitions } = await admin
      .from("order_stage_transitions")
      .select("from_stage, to_stage, reason, transitioned_at")
      .eq("order_id", orderId)
      .order("transitioned_at", { ascending: true });

    // Fetch latest stage_results with worker info
    const { data: stageResults } = await admin
      .from("stage_results")
      .select(
        `
        id, stage, attempt_number, data, notes, started_at, finished_at,
        users!stage_results_user_id_fkey ( full_name )
      `,
      )
      .eq("order_id", orderId)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(10);

    // Fetch payments
    const { data: payments } = await admin
      .from("payments")
      .select("type, amount, method, reference_no, paid_at")
      .eq("order_id", orderId)
      .order("paid_at", { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        order: {
          ...order,
          customer: (order as any).customers,
        },
        gemstones: gemstones || [],
        transitions: transitions || [],
        stageResults: stageResults || [],
        payments: payments || [],
      },
    });
  } catch (error) {
    console.error("[Order Detail] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
