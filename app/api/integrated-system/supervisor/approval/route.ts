import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();

    const { data, error } = await db
      .from("legacy_orders")
      .select("*, tracking:tracking_stages(*)")
      .or("tracking.stage_status.eq.rework,tracking.assigned_to.is.null")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("[GET /api/integrated-system/supervisor/approval]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
