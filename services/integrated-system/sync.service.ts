import { createAdminClient } from "@/lib/supabase/admin";

const LIVE_SYSTEM_BASE_URL = process.env.LIVE_SYSTEM_BASE_URL || "";
const LIVE_SYSTEM_API_KEY = process.env.INTEGRATED_SYSTEM_WEBHOOK_SECRET || "";

function mapStatusToStage(idStatus: number | undefined): string {
  switch (idStatus) {
    case 9: return "penerimaan_order";
    case 10: return "racik_bahan";
    case 12: return "pembentukan_cincin";
    case 24: return "finishing";
    case 14: return "pengiriman";
    case 15: return "selesai";
    default: return "penerimaan_order";
  }
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
      orders: Array<{
        id: number;
        kode_order: string;
        nama: string;
        email?: string;
        no_hp?: string;
        alamat?: string;
        tgl_order?: string;
        tgl_selesai?: string;
        id_status?: number;
        catatan?: string;
      }>;
    };

    const { orders } = responseData;
    console.log("[sync] Yii2 returned", orders?.length ?? 0, "orders, URL:", `${LIVE_SYSTEM_BASE_URL}/api/order-sync/new-orders?since=${encodeURIComponent(sinceDate)}`);

    for (const order of orders) {
      try {
        const { data: existing } = await db
          .from("legacy_orders")
          .select("id")
          .eq("kode_order", order.kode_order)
          .maybeSingle();

        if (existing) {
          result.skipped++;
          continue;
        }

        const { data: inserted, error: insertError } = await db
          .from("legacy_orders")
          .insert({
            legacy_id: order.id,
            kode_order: order.kode_order,
            nama: order.nama,
            email: order.email ?? null,
            no_hp: order.no_hp ?? null,
            alamat: order.alamat ?? null,
            tgl_order: order.tgl_order ?? null,
            tgl_selesai: order.tgl_selesai ?? null,
            id_status: order.id_status ?? null,
            catatan: order.catatan ?? null,
            last_synced_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError || !inserted) {
          result.errors++;
          continue;
        }

        const stage = order.tgl_selesai
          ? "selesai"
          : mapStatusToStage(order.id_status);

        await db.from("tracking_stages").insert({
          order_id: inserted.id,
          current_stage: stage,
          stage_status: stage === "selesai" ? "completed" : "in_progress",
          updated_at: new Date().toISOString(),
        });

        await db.from("stage_history").insert({
          order_id: inserted.id,
          stage,
          status: "completed",
          created_at: new Date().toISOString(),
        });

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
