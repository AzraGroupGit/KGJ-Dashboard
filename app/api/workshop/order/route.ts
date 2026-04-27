// app/api/workshop/order/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("order_number");

    if (!orderNumber) {
      return NextResponse.json(
        { error: "order_number wajib diisi" },
        { status: 400 },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, product_name, current_stage, status, target_weight, deadline, customer_name",
      )
      .eq("order_number", orderNumber.trim().toUpperCase())
      .is("deleted_at", null)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan. Periksa kembali nomor order." },
        { status: 404 },
      );
    }

    if (order.status === "completed" || order.status === "cancelled") {
      return NextResponse.json(
        {
          error: `Order ini sudah ${order.status === "completed" ? "selesai" : "dibatalkan"}.`,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        order_number: order.order_number,
        product_name: order.product_name,
        current_stage: order.current_stage,
        status: order.status,
        target_weight: order.target_weight,
        deadline: order.deadline,
        customer_name: (order as any).customer_name || null,
      },
    });
  } catch (error) {
    console.error("[GET /api/workshop/order] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
