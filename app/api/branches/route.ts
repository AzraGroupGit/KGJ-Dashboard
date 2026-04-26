// app/api/branches/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/branches
 * Query params: status
 * Semua role bisa akses (untuk populate dropdown).
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("branches")
      .select(
        `
        id, code, name, address, phone, email, pic,
        status, created_at, updated_at,
        cs_inputs(lead_masuk, closing)
      `,
      )
      .order("name", { ascending: true });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/branches]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data cabang" },
        { status: 500 },
      );
    }

    const branchesWithTotals = (data ?? []).map((branch) => {
      const inputs = (branch.cs_inputs as { lead_masuk: number; closing: number }[] | null) ?? [];
      return {
        ...branch,
        cs_inputs: undefined,
        total_leads: inputs.reduce((s, ci) => s + (ci.lead_masuk || 0), 0),
        total_closing: inputs.reduce((s, ci) => s + (ci.closing || 0), 0),
      };
    });

    return NextResponse.json({ data: branchesWithTotals });
  } catch (error) {
    console.error("[GET /api/branches] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/branches
 * Body: { name, code, address, phone?, email?, pic?, status? }
 * Hanya superadmin.
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
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if ((currentUser?.role as any)?.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, address, phone, email, pic, status } = body;

    if (!name || !code || !address) {
      return NextResponse.json(
        { error: "name, code, dan address wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("branches")
      .insert({
        name,
        code: code.toUpperCase(),
        address,
        phone: phone || null,
        email: email || null,
        pic: pic || null,
        status: status || "active",
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/branches]", error.message);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Kode cabang sudah digunakan" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal menyimpan data cabang" },
        { status: 500 },
      );
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "CREATE_BRANCH",
      entity_type: "branches",
      entity_id: data.id,
      new_data: { name, code, address },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/branches] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}