import { NextResponse } from "next/server";
import { syncNewOrders } from "@/services/integrated-system/sync.service";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = createAdminClient();

    const { data: lastSync } = await db
      .from("sync_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    const since = lastSync?.[0]?.created_at
      ? new Date(new Date(lastSync[0].created_at).getTime() - 300000).toISOString().replace("T", " ").split(".")[0]
      : new Date(Date.now() - 300000).toISOString().replace("T", " ").split(".")[0];

    const result = await syncNewOrders(since);

    return NextResponse.json({ synced: result.synced, skipped: result.skipped, errors: result.errors });
  } catch (error) {
    console.error("[cron sync]", error);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
