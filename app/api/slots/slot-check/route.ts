import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kategori = searchParams.get("kategori");
    const deadline = searchParams.get("deadline");

    if (!kategori || !deadline) {
      return NextResponse.json({ error: "kategori and deadline are required" }, { status: 400 });
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
      .eq("deadline", deadline)
      .neq("status", "cancelled");

    const { count: overrides } = await admin
      .from("slot_overrides")
      .select("*", { count: "exact", head: true })
      .eq("category_id", category.id)
      .eq("date", deadline);

    const totalSlots = category.max_slots + (overrides || 0);
    const usedCount = used || 0;

    return NextResponse.json({
      success: true,
      data: {
        kategori,
        deadline,
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
