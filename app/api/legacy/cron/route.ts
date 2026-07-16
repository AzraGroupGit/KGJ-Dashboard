import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncNewOrders, computeSinceWatermark } from "@/lib/legacy/sync-service";

export const maxDuration = 300;

// Pull fallback for the fire-and-forget Yii2 webhook (spec checklist item 4).
// Triggered by Vercel Cron (vercel.json) — Vercel sends
// `Authorization: Bearer ${CRON_SECRET}` automatically when the env var is set.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[GET /api/legacy/cron] CRON_SECRET is not set — rejecting");
    return NextResponse.json({ error: "Cron belum dikonfigurasi" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const since = await computeSinceWatermark(db);
    const result = await syncNewOrders(since, "cron");

    return NextResponse.json({
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
      since,
    });
  } catch (error) {
    console.error("[GET /api/legacy/cron] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
