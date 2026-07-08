import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const assigned_to = searchParams.get("assigned_to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = db
      .from("legacy_orders")
      .select("*, tracking:tracking_stages(*)", { count: "exact" });

    if (stage) {
      query = query.eq("tracking.current_stage", stage);
    }
    if (status) {
      query = query.eq("tracking.stage_status", status);
    }
    if (assigned_to) {
      query = query.eq("tracking.assigned_to", assigned_to);
    }
    if (search) {
      query = query.or(
        `kode_order.ilike.%${search}%,nama.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[GET /api/integrated-system/orders]", error.message);
      return NextResponse.json(
        { error: "Gagal memuat data order" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[GET /api/integrated-system/orders] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
