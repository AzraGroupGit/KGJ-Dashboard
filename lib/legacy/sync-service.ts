import { createAdminClient } from "@/lib/supabase/admin";
import { ingestLegacyOrder } from "@/lib/legacy/ingest";
import { type Yii2OrderPayload } from "@/lib/legacy/adapter";

const LIVE_SYSTEM_BASE_URL = process.env.LIVE_SYSTEM_BASE_URL || "";
const LIVE_SYSTEM_API_KEY = process.env.INTEGRATED_SYSTEM_WEBHOOK_SECRET || "";

const FULL_SYNC_SINCE = "2026-01-01 00:00:00";

type Db = ReturnType<typeof createAdminClient>;

interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

async function fetchYii2Orders(since: string): Promise<Yii2OrderPayload[] | null> {
  const url = `${LIVE_SYSTEM_BASE_URL}/api/order-sync/new-orders?since=${encodeURIComponent(since)}`;
  try {
    const response = await fetch(url, {
      headers: { "X-API-Key": LIVE_SYSTEM_API_KEY },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[sync] Fetch failed:", response.status, "Body:", body, "URL:", url);
      return null;
    }

    const responseData = (await response.json()) as {
      orders: Yii2OrderPayload[];
    };
    console.log("[sync] Yii2 returned", responseData.orders?.length ?? 0, "orders, since:", since);
    return responseData.orders ?? [];
  } catch (err) {
    console.error("[sync] Fetch error:", err, "URL:", url);
    return null;
  }
}

// Watermark for the pull fallback (spec checklist item 4). Yii2's `since`
// compares against DATE columns (tgl_update_status / tgl_order, Asia/Jakarta)
// — so overlap must be date-level (1 day), not minutes. Dedupe by kode_order
// in ingestLegacyOrder makes the overlap safe.
export async function computeSinceWatermark(db: Db): Promise<string> {
  const { count: existingCount } = await db
    .from("legacy_orders")
    .select("id", { count: "exact", head: true });

  if (!existingCount) return FULL_SYNC_SINCE;

  const { data: lastSync } = await db
    .from("sync_logs")
    .select("created_at")
    .in("sync_type", ["cron", "manual"])
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  const last = lastSync?.[0]?.created_at;
  if (!last) return FULL_SYNC_SINCE;

  const watermark = new Date(last);
  watermark.setDate(watermark.getDate() - 1);
  return `${watermark.toISOString().split("T")[0]} 00:00:00`;
}

export async function syncNewOrders(
  since?: string,
  syncType: "cron" | "manual" = "cron",
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };
  const db = createAdminClient();

  const sinceDate = since || FULL_SYNC_SINCE;

  const orders = await fetchYii2Orders(sinceDate);
  if (orders === null) {
    result.errors++;
    await logSync(db, syncType, result, "fetch new-orders gagal");
    return result;
  }

  for (const order of orders) {
    try {
      const ingest = await ingestLegacyOrder(db, order);
      if (ingest.action === "inserted" || ingest.stageChanged) {
        console.log("[sync]", ingest.action, order.kode_order, "→ stage:", ingest.stage ?? "unchanged");
        result.synced++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      console.error("[sync] Ingest error:", order.kode_order, err);
      result.errors++;
    }
  }

  await logSync(db, syncType, result, result.errors > 0 ? `${result.errors} order gagal disinkron` : null);
  return result;
}

async function logSync(
  db: Db,
  syncType: "cron" | "manual" | "reconcile",
  result: SyncResult,
  errorMessage: string | null,
) {
  await db.from("sync_logs").insert({
    sync_type: syncType,
    orders_synced: result.synced,
    status: result.errors > 0 ? "partial" : "success",
    error_message: errorMessage,
    created_at: new Date().toISOString(),
  });
}

// ── Soft-delete reconciliation (spec checklist item 3) ────────────────────────
//
// Yii2 excludes soft-deleted orders from new-orders and never fires webhooks
// for them — the ERP is never told about deletions. This job pulls the full
// feed and marks local rows that disappeared as deleted (deleted_at + drop
// the tracking pointer so they vanish from all worklists). Rows that
// reappear are resurrected by ingestLegacyOrder.

export interface ReconcileResult {
  checked: number;
  deleted: number;
  aborted: boolean;
  reason: string | null;
}

const RECONCILE_MAX_DELETE_RATIO = 0.1;
const RECONCILE_MAX_DELETE_FLOOR = 50;

export async function reconcileDeletedOrders(
  since: string = FULL_SYNC_SINCE,
): Promise<ReconcileResult> {
  const db = createAdminClient();

  const orders = await fetchYii2Orders(since);

  // Never mass-delete on a bad/empty feed.
  if (orders === null || orders.length === 0) {
    const reason = orders === null ? "fetch new-orders gagal" : "feed kosong — reconcile dibatalkan";
    await db.from("sync_logs").insert({
      sync_type: "reconcile",
      orders_synced: 0,
      status: "failed",
      error_message: reason,
      created_at: new Date().toISOString(),
    });
    return { checked: 0, deleted: 0, aborted: true, reason };
  }

  const liveCodes = new Set(orders.map((o) => o.kode_order));

  const { data: localRows, error } = await db
    .from("legacy_orders")
    .select("id, kode_order")
    .is("deleted_at", null);

  if (error || !localRows) {
    const reason = `query legacy_orders gagal: ${error?.message ?? "unknown"}`;
    await db.from("sync_logs").insert({
      sync_type: "reconcile",
      orders_synced: 0,
      status: "failed",
      error_message: reason,
      created_at: new Date().toISOString(),
    });
    return { checked: 0, deleted: 0, aborted: true, reason };
  }

  const missing = localRows.filter((row) => !liveCodes.has(row.kode_order));

  // Safety valve: a suspiciously large deletion set means the feed is
  // truncated/broken, not that half the workshop got deleted.
  const maxAllowed = Math.max(
    RECONCILE_MAX_DELETE_FLOOR,
    Math.floor(localRows.length * RECONCILE_MAX_DELETE_RATIO),
  );
  if (missing.length > maxAllowed) {
    const reason = `${missing.length} order akan terhapus (batas ${maxAllowed}) — reconcile dibatalkan`;
    console.error("[reconcile]", reason);
    await db.from("sync_logs").insert({
      sync_type: "reconcile",
      orders_synced: 0,
      status: "failed",
      error_message: reason,
      created_at: new Date().toISOString(),
    });
    return { checked: localRows.length, deleted: 0, aborted: true, reason };
  }

  if (missing.length > 0) {
    const ids = missing.map((row) => row.id);

    await db
      .from("legacy_orders")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);

    // Remove tracking pointers: every worklist starts from tracking_stages,
    // so deleted orders disappear everywhere. stage_history stays for audit.
    await db.from("tracking_stages").delete().in("order_id", ids);

    console.log(
      "[reconcile] Marked deleted:",
      missing.map((row) => row.kode_order).join(", "),
    );
  }

  await db.from("sync_logs").insert({
    sync_type: "reconcile",
    orders_synced: missing.length,
    status: "success",
    error_message:
      missing.length > 0 ? `${missing.length} order ditandai deleted` : null,
    created_at: new Date().toISOString(),
  });

  return {
    checked: localRows.length,
    deleted: missing.length,
    aborted: false,
    reason: null,
  };
}
