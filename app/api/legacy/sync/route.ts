import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncNewOrders } from "@/lib/legacy/sync-service";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data: lastSync } = await db
      .from("sync_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    // If the legacy_orders table is empty (fresh DB or wiped data), disregard
    // sync_logs and fetch from a broad start date to rebuild the full dataset.
    const { count: existingCount } = await db
      .from("legacy_orders")
      .select("id", { count: "exact", head: true });

    const since = existingCount === 0
      ? "2026-01-01 00:00:00"
      : lastSync?.[0]?.created_at
        ? new Date(new Date(lastSync[0].created_at).getTime() - 300000).toISOString().replace("T", " ").split(".")[0]
        : "2026-01-01 00:00:00";

    const result = await syncNewOrders(since);

    return NextResponse.json({
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
      since,
    });
  } catch (error) {
    console.error("[POST /api/legacy/sync] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
