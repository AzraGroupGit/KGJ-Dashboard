import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncNewOrders } from "@/services/integrated-system/sync.service";

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

    const since = lastSync?.[0]?.created_at
      ? new Date(new Date(lastSync[0].created_at).getTime() - 60000).toISOString().replace("T", " ").split(".")[0]
      : "2026-01-01 00:00:00";

    console.log("[sync] Sending since:", since, "Last sync:", lastSync?.[0]?.created_at);

    const result = await syncNewOrders(since);

    return NextResponse.json({
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
      since,
    });
  } catch (error) {
    console.error("[POST /api/integrated-system/sync] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
