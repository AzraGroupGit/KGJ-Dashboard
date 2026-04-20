// app/api/reports/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/reports
 * Query params: type (monthly|quarterly|yearly), status, limit
 * Hanya superadmin.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUser?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    let query = supabase
      .from("reports")
      .select(
        `
        id, title, type, period, file_url, file_size,
        status, generated_at,
        users!reports_generated_by_fkey (full_name)
      `,
      )
      .order("generated_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/reports]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data laporan" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/reports] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/reports
 * Body: { type, period, title }
 * Hanya superadmin. Membuat catatan laporan baru dengan status 'ready'.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUser?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, period, title } = body;

    if (!type || !period || !title) {
      return NextResponse.json(
        { error: "type, period, dan title wajib diisi" },
        { status: 400 },
      );
    }

    if (!["monthly", "quarterly", "yearly"].includes(type)) {
      return NextResponse.json({ error: "Tipe laporan tidak valid" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        title,
        type,
        period,
        generated_by: user.id,
        status: "ready",
      })
      .select(
        `
        id, title, type, period, file_url, file_size,
        status, generated_at,
        users!reports_generated_by_fkey (full_name)
      `,
      )
      .single();

    if (error) {
      console.error("[POST /api/reports]", error.message);
      return NextResponse.json(
        { error: "Gagal membuat laporan" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "CREATE_REPORT",
      entity_type: "reports",
      entity_id: data.id,
      new_data: { title, type, period },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reports] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
