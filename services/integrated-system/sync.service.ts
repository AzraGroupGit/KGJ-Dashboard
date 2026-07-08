import { createAdminClient } from "@/lib/supabase/admin";

const LIVE_SYSTEM_BASE_URL = process.env.LIVE_SYSTEM_BASE_URL || "";

interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

export async function syncNewOrders(since?: string): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };
  const db = createAdminClient();

  const sinceDate = since || new Date().toISOString().split("T")[0];

  try {
    const response = await fetch(
      `${LIVE_SYSTEM_BASE_URL}/api/order-sync/new-orders?since=${sinceDate}`,
    );

    if (!response.ok) {
      result.errors++;
      return result;
    }

    const { orders } = await response.json() as {
      orders: Array<{
        legacy_id: number;
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
            legacy_id: order.legacy_id,
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
          : "order_diterima";

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
      } catch {
        result.errors++;
      }
    }
  } catch {
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
