import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kategori = searchParams.get("kategori");
    const tglOrder = searchParams.get("tgl_order");

    if (!kategori || !tglOrder) {
      return NextResponse.json({ error: "kategori and tgl_order are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: category } = await admin
      .from("slot_categories")
      .select("*")
      .eq("key", kategori)
      .single();

    if (!category) {
      return NextResponse.json({ error: "Kategori not found" }, { status: 404 });
    }

    const { count: used } = await admin
      .from("cs_orders")
      .select("*", { count: "exact", head: true })
      .eq("kategori", kategori)
      .eq("tgl_order", tglOrder)
      .or("status.is.null,status.neq.cancelled");

    const { count: overrides } = await admin
      .from("slot_overrides")
      .select("*", { count: "exact", head: true })
      .eq("category_id", category.id)
      .eq("date", tglOrder);

    const totalSlots = category.max_slots + (overrides || 0);
    const usedCount = used || 0;

    return NextResponse.json({
      success: true,
      data: {
        kategori,
        tgl_order: tglOrder,
        label: category.label,
        max_slots: category.max_slots,
        overrides: overrides || 0,
        total_slots: totalSlots,
        used: usedCount,
        available: totalSlots - usedCount,
        is_full: usedCount >= totalSlots,
      },
    });
  } catch (err) {
    console.error("GET /api/slots/slot-check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
