// app/api/stages/submit/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { order_id: rawOrderId, stage, data } = await request.json();

    if (!stage || !data) {
      return NextResponse.json(
        { error: "stage dan data wajib diisi" },
        { status: 400 },
      );
    }

    let order_id = rawOrderId as string | null;

    // ── penerimaan_order: customer care creates the order here ─────────────────
    if (stage === "penerimaan_order" && !order_id) {
      const {
        customer_name,
        customer_phone,
        customer_wa,
        product_name,
        target_weight,
        target_karat,
        ring_size,
        model_description,
        delivery_method,
        deadline,
        special_notes,
      } = data;

      if (!customer_name?.trim() || !product_name?.trim()) {
        return NextResponse.json(
          { error: "Nama pelanggan dan nama produk wajib diisi" },
          { status: 400 },
        );
      }
      if (!target_weight || Number(target_weight) <= 0) {
        return NextResponse.json(
          { error: "Target berat harus lebih dari 0" },
          { status: 400 },
        );
      }
      if (target_karat === undefined || target_karat === null || target_karat === "") {
        return NextResponse.json(
          { error: "Target karat wajib diisi" },
          { status: 400 },
        );
      }

      // Find or create customer (match by phone if provided)
      let customerId: string;
      const phoneClean = customer_phone?.trim() || null;

      if (phoneClean) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", phoneClean)
          .is("deleted_at", null)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
        } else {
          const { data: newCustomer, error: customerErr } = await supabase
            .from("customers")
            .insert({
              name: customer_name.trim(),
              phone: phoneClean,
              wa_contact: customer_wa?.trim() || null,
            })
            .select("id")
            .single();

          if (customerErr || !newCustomer) {
            console.error("[Submit] Customer create error:", customerErr);
            return NextResponse.json(
              { error: "Gagal membuat data pelanggan" },
              { status: 500 },
            );
          }
          customerId = newCustomer.id;
        }
      } else {
        const { data: newCustomer, error: customerErr } = await supabase
          .from("customers")
          .insert({
            name: customer_name.trim(),
            wa_contact: customer_wa?.trim() || null,
          })
          .select("id")
          .single();

        if (customerErr || !newCustomer) {
          console.error("[Submit] Customer create error:", customerErr);
          return NextResponse.json(
            { error: "Gagal membuat data pelanggan" },
            { status: 500 },
          );
        }
        customerId = newCustomer.id;
      }

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          product_name: product_name.trim(),
          target_weight: Number(target_weight),
          target_karat: Number(target_karat),
          ring_size: ring_size?.trim() || null,
          model_description: model_description?.trim() || null,
          delivery_method: delivery_method || "pickup_store",
          deadline: deadline || null,
          special_notes: special_notes?.trim() || null,
          current_stage: "penerimaan_order",
          status: "in_progress",
          created_by: authUser.id,
        })
        .select("id, order_number")
        .single();

      if (orderError || !newOrder) {
        console.error("[Submit] Order create error:", orderError);
        return NextResponse.json(
          { error: "Gagal membuat order baru" },
          { status: 500 },
        );
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: authUser.id,
        action: "CREATE_ORDER",
        entity_type: "orders",
        entity_id: newOrder.id,
        new_data: { order_number: newOrder.order_number, customer_id: customerId },
      });

      return NextResponse.json({
        success: true,
        message: "Order berhasil dibuat",
        data: {
          order_id: newOrder.id,
          order_number: newOrder.order_number,
          customer_id: customerId,
        },
      });
    }

    // ── Regular stage submission ────────────────────────────────────────────────
    if (!order_id) {
      return NextResponse.json(
        { error: "order_id wajib diisi" },
        { status: 400 },
      );
    }

    // Cek existing attempt
    const { data: lastAttempt } = await supabase
      .from("stage_results")
      .select("attempt_number")
      .eq("order_id", order_id)
      .eq("stage", stage)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const attemptNumber = (lastAttempt?.attempt_number || 0) + 1;

    // Insert stage result
    const { data: stageResult, error: insertError } = await supabase
      .from("stage_results")
      .insert({
        order_id,
        user_id: authUser.id,
        stage,
        attempt_number: attemptNumber,
        data,
        notes: data.notes || null,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Submit] Insert error:", insertError);
      return NextResponse.json(
        { error: "Gagal menyimpan data" },
        { status: 500 },
      );
    }

    // Catat scan event
    await supabase.from("scan_events").insert({
      order_id,
      user_id: authUser.id,
      stage_result_id: stageResult.id,
      stage,
      action: "submit",
      device_info: "QR Mobile Input",
      scanned_at: new Date().toISOString(),
    });

    // Log aktivitas
    await supabase.from("activity_logs").insert({
      user_id: authUser.id,
      action: "SUBMIT_STAGE",
      entity_type: "stage_results",
      entity_id: stageResult.id,
      new_data: { order_id, stage, data },
    });

    return NextResponse.json({
      success: true,
      message: "Data berhasil disimpan",
      data: {
        stage_result_id: stageResult.id,
        attempt_number: attemptNumber,
        order_id,
      },
    });
  } catch (error) {
    console.error("[Submit] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
