import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySupervisorScope } from "@/lib/auth/supervisor";

export async function GET(req: Request) {
  try {
    const { user, error: authError } = await verifySupervisorScope();
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const supabase = createAdminClient();

    const { data: categories, error } = await supabase
      .from("slot_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const categoriesWithUsage = await Promise.all(
      (categories || []).map(async (cat) => {
        const { count: used, error: countError } = await supabase
          .from("cs_orders")
          .select("*", { count: "exact", head: true })
          .eq("kategori", cat.key)
          .eq("deadline", date)
          .neq("status", "cancelled");

        if (countError) throw countError;

        const { count: overrides, error: ovError } = await supabase
          .from("slot_overrides")
          .select("*", { count: "exact", head: true })
          .eq("category_id", cat.id)
          .eq("date", date);

        if (ovError) throw ovError;

        const totalSlots = cat.max_slots + (overrides || 0);
        return {
          ...cat,
          used: used || 0,
          overrides: overrides || 0,
          total_slots: totalSlots,
          available: totalSlots - (used || 0),
        };
      }),
    );

    return NextResponse.json({ success: true, data: categoriesWithUsage });
  } catch (err) {
    console.error("GET /api/slots/slot-categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
