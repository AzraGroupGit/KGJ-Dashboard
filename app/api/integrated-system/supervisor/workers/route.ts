import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data, error } = await db
      .from("users")
      .select("id, full_name, role:roles!users_role_id_fkey(name, role_group)")
      .in("roles.role_group", ["production", "operational"])
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Gagal memuat data pekerja" },
        { status: 500 },
      );
    }

    const workers = (data ?? []).map((w) => {
      const role = Array.isArray(w.role) ? w.role[0] : w.role;
      return {
        id: w.id,
        full_name: w.full_name,
        role_name: role?.name ?? null,
      };
    });

    return NextResponse.json({ data: workers });
  } catch (error) {
    console.error("[GET /api/integrated-system/supervisor/workers]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
