import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_SEQUENCE, STAGE_LABELS, STAGE_GROUP } from "@/lib/stages";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();

    const { data: orders, error } = await db
      .from("legacy_orders")
      .select("*, tracking:tracking_stages(*)")
      .neq("tracking.stage_status", "completed")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });

    const all = orders ?? [];
    const totalOrders = all.length;

    const bottlenecks = STAGE_SEQUENCE
      .filter((s) => !s.startsWith("approval_"))
      .map((stage) => {
        const items = all.filter((o) => o.tracking?.[0]?.current_stage === stage);
        if (items.length === 0) return null;

        const inProgress = items.filter((o) => o.tracking?.[0]?.stage_status === "in_progress").length;
        const waiting = items.filter((o) => o.tracking?.[0]?.stage_status === "rework").length;

        const waitHours = items.map((o) => {
          const syncedAt = new Date(o.last_synced_at ?? o.created_at);
          return (Date.now() - syncedAt.getTime()) / 3600000;
        });

        const avgHours = waitHours.length > 0
          ? waitHours.reduce((a, b) => a + b, 0) / waitHours.length
          : 0;

        const longestHours = waitHours.length > 0 ? Math.max(...waitHours) : 0;

        const delayedOrders = items
          .sort((a, b) => {
            const aTime = new Date(a.last_synced_at ?? a.created_at).getTime();
            const bTime = new Date(b.last_synced_at ?? b.created_at).getTime();
            return aTime - bTime;
          })
          .slice(0, 2)
          .map((o) => {
            const hrs = Math.round((Date.now() - new Date(o.last_synced_at ?? o.created_at).getTime()) / 3600000);
            return { id: o.id, kode_order: o.kode_order, nama: o.nama, hours_waiting: hrs };
          });

        return {
          stage,
          label: STAGE_LABELS[stage] ?? stage,
          stage_group: STAGE_GROUP[stage] ?? "operational",
          order_count: items.length,
          in_progress: inProgress,
          waiting_orders: waiting,
          avg_hours: Math.round(avgHours * 10) / 10,
          longest_hours: Math.round(longestHours * 10) / 10,
          delayed_orders: delayedOrders,
        };
      })
      .filter((b): b is Exclude<typeof b, null> => b !== null)
      .sort((a, b) => b.order_count - a.order_count);

    return NextResponse.json({
      data: {
        total_orders: totalOrders,
        bottlenecks,
      },
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/admin/oprprd/bottleneck]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
