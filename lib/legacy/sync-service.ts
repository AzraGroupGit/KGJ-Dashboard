import { createAdminClient } from "@/lib/supabase/admin";
import { mapStatusToStage } from "@/lib/legacy/status";
import { notifySupervisors } from "@/lib/notifications";
import { buildLegacyOrderRow, buildLegacyOrderUpdate, type Yii2OrderPayload } from "@/lib/legacy/adapter";

const LIVE_SYSTEM_BASE_URL = process.env.LIVE_SYSTEM_BASE_URL || "";
const LIVE_SYSTEM_API_KEY = process.env.INTEGRATED_SYSTEM_WEBHOOK_SECRET || "";

// Stages that should auto-advance to their approval gate on ingest.
const APPROVAL_GATE_MAP: Record<string, string> = {
  penerimaan_order: "approval_penerimaan_order",
  racik_bahan: "approval_racik_bahan",
  qc_1: "approval_qc_1",
  qc_2: "approval_qc_2",
  pembentukan_cincin: "approval_produksi",
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

interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

export async function syncNewOrders(since?: string): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };
  const db = createAdminClient();

  const sinceDate = since || "2026-01-01 00:00:00";

  try {
    const response = await fetch(
      `${LIVE_SYSTEM_BASE_URL}/api/order-sync/new-orders?since=${encodeURIComponent(sinceDate)}`,
      { headers: { "X-API-Key": LIVE_SYSTEM_API_KEY } },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[sync] Fetch failed:", response.status, "Body:", body, "URL:", LIVE_SYSTEM_BASE_URL);
      result.errors++;
      return result;
    }

    const responseData = await response.json() as {
      orders: Yii2OrderPayload[];
    };

    const { orders } = responseData;
    console.log("[sync] Yii2 returned", orders?.length ?? 0, "orders, URL:", `${LIVE_SYSTEM_BASE_URL}/api/order-sync/new-orders?since=${encodeURIComponent(sinceDate)}`);

    for (const order of orders) {
      try {
        const { data: existing } = await db
          .from("legacy_orders")
          .select("id, id_status")
          .eq("kode_order", order.kode_order)
          .maybeSingle();

        if (existing) {
          // Status changed → update rather than skip.
          const incomingStatus = order.id_status ?? null;
          if (incomingStatus !== null && existing.id_status !== incomingStatus) {
            const stage = order.tgl_selesai
              ? "selesai"
              : mapStatusToStage(incomingStatus);

            await db
              .from("legacy_orders")
              .update(buildLegacyOrderUpdate(order))
              .eq("id", existing.id);

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

            console.log("[sync] Updated:", order.kode_order, "→ stage:", stage);
            result.synced++;
          } else {
            console.log("[sync] Skipped:", order.kode_order, "(already exists, no status change)");
            result.skipped++;
          }
          continue;
        }

        const { data: inserted, error: insertError } = await db
          .from("legacy_orders")
          .insert(buildLegacyOrderRow(order))
          .select("id")
          .single();

        if (insertError || !inserted) {
          console.error("[sync] Insert error for:", order.kode_order, insertError);
          result.errors++;
          continue;
        }

        console.log("[sync] Inserted:", order.kode_order, "→ stage:", mapStatusToStage(order.id_status));

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

        if (stageStatus === "waiting_approval" && stage.startsWith("approval_")) {
          notifySupervisors(
            "operational_supervisor",
            "Order Baru — Menunggu Persetujuan",
            `Order ${order.kode_order} (${order.nama ?? "—"}) menunggu approval.`,
            "info",
            `/dashboard/supervisor/approval`,
          );
        }

        result.synced++;
      } catch (err) {
        console.error("[sync] Order insert error:", err);
        result.errors++;
      }
    }
  } catch (err) {
    console.error("[sync] Fatal error:", err);
    result.errors++;
  }

  await db.from("sync_logs").insert({
    sync_type: "cron",
    orders_synced: result.synced,
    status: result.errors > 0 ? "partial" : "success",
    error_message: result.errors > 0 ? `${result.errors} order gagal disinkron` : null,
    created_at: new Date().toISOString(),
  });

  return result;
}
