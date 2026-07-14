import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapStatusToStage } from "@/lib/legacy/status";
import { notifySupervisors } from "@/lib/notifications";
import { buildLegacyOrderRow, buildLegacyOrderUpdate, type Yii2OrderPayload } from "@/lib/legacy/adapter";

const WEBHOOK_SECRET = process.env.INTEGRATED_SYSTEM_WEBHOOK_SECRET;

// Stages that should auto-advance to their approval gate on ingest (Yii2
// already handled intake — the order is ready for supervisor review).
const APPROVAL_GATE_MAP: Record<string, string> = {
  penerimaan_order: "approval_penerimaan_order",
  racik_bahan: "approval_racik_bahan",
  qc_1: "approval_qc_1",
  qc_2: "approval_qc_2",
  pembentukan_cincin: "approval_produksi", // this skips to the production approval
};

function resolveIngestionStage(rawStage: string): { stage: string; status: string } {
  const gate = APPROVAL_GATE_MAP[rawStage];
  if (gate) {
    return { stage: gate, status: "waiting_approval" };
  }
  return {
    stage: rawStage,
    status: rawStage === "selesai" ? "completed" : "in_progress",
  };
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-webhook-signature");
    const payload = await request.json();

    if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const db = createAdminClient();

    const { order } = payload as { order: Yii2OrderPayload };

    if (!order?.kode_order || !order?.id) {
      return NextResponse.json(
        { error: "Payload tidak valid: kode_order dan id diperlukan" },
        { status: 400 },
      );
    }

    const { data: existing } = await db
      .from("legacy_orders")
      .select("id, id_status")
      .eq("kode_order", order.kode_order)
      .maybeSingle();

    if (existing) {
      // If id_status changed, update the order and advance tracking.
      const incomingStatus = order.id_status ?? null;
      if (incomingStatus !== null && existing.id_status !== incomingStatus) {
        const stage = order.tgl_selesai
          ? "selesai"
          : mapStatusToStage(incomingStatus);

        await db
          .from("legacy_orders")
          .update(buildLegacyOrderUpdate(order))
          .eq("id", existing.id);

        // Only advance if the stage actually changed.
        const { data: tracking } = await db
          .from("tracking_stages")
          .select("current_stage")
          .eq("order_id", existing.id)
          .maybeSingle();

        if (!tracking || tracking.current_stage !== stage) {
          if (tracking) {
            await db
              .from("tracking_stages")
              .update({
                current_stage: stage,
                stage_status: stage === "selesai" ? "completed" : "in_progress",
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", existing.id);
          } else {
            await db.from("tracking_stages").insert({
              order_id: existing.id,
              current_stage: stage,
              stage_status: stage === "selesai" ? "completed" : "in_progress",
              updated_at: new Date().toISOString(),
            });
          }

          await db.from("stage_history").insert({
            order_id: existing.id,
            stage,
            status: "completed",
            created_at: new Date().toISOString(),
          });
        }

        await db.from("sync_logs").insert({
          sync_type: "webhook",
          orders_synced: 1,
          status: "success",
          created_at: new Date().toISOString(),
        });

        return NextResponse.json({ received: true, status: "updated", stage }, { status: 200 });
      }

      return NextResponse.json({ received: true, status: "existing" });
    }

    const { data: inserted, error: insertError } = await db
      .from("legacy_orders")
      .insert(buildLegacyOrderRow(order))
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[POST /api/legacy/webhook] insert error:", insertError);
      return NextResponse.json(
        { error: "Gagal menyimpan order" },
        { status: 500 },
      );
    }

    const rawStage = order.tgl_selesai
      ? "selesai"
      : mapStatusToStage(order.id_status);

    const { stage, status: stageStatus } = resolveIngestionStage(rawStage);

    await db.from("tracking_stages").insert({
      order_id: inserted.id,
      current_stage: stage,
      stage_status: stageStatus,
      updated_at: new Date().toISOString(),
    });

    await db.from("stage_history").insert({
      order_id: inserted.id,
      stage,
      status: "completed",
      created_at: new Date().toISOString(),
    });

    // Notify supervisor if the order landed at an approval gate.
    if (stageStatus === "waiting_approval" && stage.startsWith("approval_")) {
      notifySupervisors(
        "operational_supervisor",
        "Order Baru — Menunggu Persetujuan",
        `Order ${order.kode_order} (${order.nama ?? "—"}) menunggu approval.`,
        "info",
        `/dashboard/supervisor/approval`,
      );
    }

    await db.from("sync_logs").insert({
      sync_type: "webhook",
      orders_synced: 1,
      status: "success",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ received: true, stage }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/legacy/webhook] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
