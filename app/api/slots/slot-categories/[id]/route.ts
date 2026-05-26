import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySupervisorScope } from "@/lib/auth/supervisor";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error: authError } = await verifySupervisorScope();
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { lead_time_min, lead_time_max, max_slots, is_active } = body;

    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {};
    if (lead_time_min !== undefined) updates.lead_time_min = lead_time_min;
    if (lead_time_max !== undefined) updates.lead_time_max = lead_time_max;
    if (max_slots !== undefined) updates.max_slots = max_slots;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("slot_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH /api/slots/slot-categories/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
