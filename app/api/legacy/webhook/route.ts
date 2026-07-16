import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestLegacyOrder } from "@/lib/legacy/ingest";
import { type Yii2OrderPayload } from "@/lib/legacy/adapter";

const WEBHOOK_SECRET = process.env.INTEGRATED_SYSTEM_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    // Fail-secure (spec checklist item 5): a missing secret must never mean
    // "accept everything". Misconfiguration is loud, not silent.
    if (!WEBHOOK_SECRET) {
      console.error(
        "[POST /api/legacy/webhook] INTEGRATED_SYSTEM_WEBHOOK_SECRET is not set — rejecting webhook",
      );
      return NextResponse.json(
        { error: "Webhook belum dikonfigurasi" },
        { status: 500 },
      );
    }

    const signature = request.headers.get("x-webhook-signature");
    if (signature !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = await request.json();
    const { order } = payload as { order: Yii2OrderPayload };

    if (!order?.kode_order || !order?.id) {
      return NextResponse.json(
        { error: "Payload tidak valid: kode_order dan id diperlukan" },
        { status: 400 },
      );
    }

    const db = createAdminClient();

    const result = await ingestLegacyOrder(db, order);

    // Observability (spec checklist item 7): log received/applied/skipped.
    await db.from("sync_logs").insert({
      sync_type: "webhook",
      orders_synced: 1,
      status: "success",
      error_message: `${order.kode_order}: ${result.action}${
        result.stageChanged ? ` → ${result.stage}` : " (stage unchanged)"
      }`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        received: true,
        status: result.action,
        stage: result.stage,
        stage_changed: result.stageChanged,
      },
      { status: result.action === "inserted" ? 201 : 200 },
    );
  } catch (error) {
    console.error("[POST /api/legacy/webhook] unexpected:", error);
    try {
      const db = createAdminClient();
      await db.from("sync_logs").insert({
        sync_type: "webhook",
        orders_synced: 0,
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
        created_at: new Date().toISOString(),
      });
    } catch {
      // sync_logs logging is best-effort
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
