import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySupervisorScope } from "@/lib/auth/supervisor";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error: authError } = await verifySupervisorScope();
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createAdminClient();
    const { error } = await supabase.from("slot_overrides").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/slots/slot-overrides/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
