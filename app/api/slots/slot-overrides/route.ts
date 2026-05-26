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
    const date = searchParams.get("date");
    const category_id = searchParams.get("category_id");

    const supabase = createAdminClient();
    let query = supabase
      .from("slot_overrides")
      .select("*, added_by:users!slot_overrides_added_by_fkey(full_name)");

    if (date) query = query.eq("date", date);
    if (category_id) query = query.eq("category_id", category_id);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/slots/slot-overrides error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await verifySupervisorScope();
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { category_id, date, note } = body;

    if (!category_id || !date) {
      return NextResponse.json({ error: "category_id and date are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("slot_overrides")
      .insert({
        category_id,
        date,
        added_by: user.id,
        note: note || null,
      })
      .select("*, added_by:users!slot_overrides_added_by_fkey(full_name)")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/slots/slot-overrides error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
