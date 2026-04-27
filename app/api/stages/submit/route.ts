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

    const { order_id, stage, data } = await request.json();

    if (!order_id || !stage || !data) {
      return NextResponse.json(
        { error: "order_id, stage, dan data wajib diisi" },
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
      data: { stage_result_id: stageResult.id, attempt_number: attemptNumber },
    });
  } catch (error) {
    console.error("[Submit] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
