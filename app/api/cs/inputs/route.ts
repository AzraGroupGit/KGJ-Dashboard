// app/api/cs/inputs/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cs/inputs
 * Query params: from, to (YYYY-MM-DD), limit (default 100, max 500)
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

    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("id, role, branch_id")
      .eq("id", user.id)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const userId = searchParams.get("user_id");
    const branchId = searchParams.get("branch_id");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500,
    );

    let query = supabase
      .from("cs_inputs")
      .select(
        `
        id,
        branch_id,
        user_id,
        input_date,
        lead_masuk,
        closing,
        omset,
        notes,
        created_at,
        updated_at,
        users!cs_inputs_user_id_fkey (
          id,
          full_name,
          email,
          role
        ),
        branches!cs_inputs_branch_id_fkey (
          id,
          name,
          code
        )
      `,
      )
      .order("input_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter tanggal
    if (from) query = query.gte("input_date", from);
    if (to) query = query.lte("input_date", to);

    // Filter berdasarkan user_id
    if (userId) {
      query = query.eq("user_id", userId);
    }

    // Filter berdasarkan branch_id
    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    // Jika user adalah CS, hanya bisa melihat data sendiri
    if (currentUser.role === "cs") {
      query = query.eq("user_id", currentUser.id);
    }

    // Jika user adalah marketing, bisa melihat data CS di branch yang sama
    if (currentUser.role === "marketing" && currentUser.branch_id) {
      query = query.eq("branch_id", currentUser.branch_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/cs/inputs]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data input CS" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/cs/inputs] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cs/inputs
 *
 * Upsert input harian untuk cabang user.
 * Hanya bisa input/edit data hari ini — setelah hari berganti, data terkunci.
 *
 * Body: { lead_masuk: number, closing: number, notes?: string }
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

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, branch_id, status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil user tidak ditemukan" },
        { status: 404 },
      );
    }

    if (profile.status !== "active") {
      return NextResponse.json(
        { error: "Akun Anda tidak aktif" },
        { status: 403 },
      );
    }

    if (profile.role !== "cs") {
      return NextResponse.json(
        { error: "Hanya CS yang dapat input data" },
        { status: 403 },
      );
    }

    if (!profile.branch_id) {
      return NextResponse.json(
        { error: "User CS tidak terhubung ke cabang manapun" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const leadMasuk = Number(body.lead_masuk);
    const closing = Number(body.closing);
    const omset = Number(body.omset ?? 0);
    const notes =
      typeof body.notes === "string" && body.notes.trim() !== ""
        ? body.notes.trim()
        : null;

    if (!Number.isInteger(leadMasuk) || leadMasuk < 0) {
      return NextResponse.json(
        { error: "Lead Masuk harus berupa angka bulat positif" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(closing) || closing < 0) {
      return NextResponse.json(
        { error: "Closing harus berupa angka bulat positif" },
        { status: 400 },
      );
    }
    if (closing > leadMasuk) {
      return NextResponse.json(
        { error: "Closing tidak boleh melebihi Lead Masuk" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(omset) || omset < 0) {
      return NextResponse.json(
        { error: "Omset harus berupa angka bulat positif" },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Cek apakah sudah ada row hari ini
    const { data: existing } = await supabase
      .from("cs_inputs")
      .select("id")
      .eq("branch_id", profile.branch_id)
      .eq("input_date", today)
      .maybeSingle();

    if (existing) {
      // Update row yang sudah ada
      const { data: updated, error: updateError } = await supabase
        .from("cs_inputs")
        .update({ lead_masuk: leadMasuk, closing, omset, notes })
        .eq("id", existing.id)
        .select(
          `
          id, branch_id, user_id, input_date, lead_masuk, closing,
          omset, notes, created_at, updated_at,
          branches ( id, name, code )
        `,
        )
        .single();

      if (updateError) {
        console.error("[POST /api/cs/inputs] update error:", updateError);
        return NextResponse.json(
          { error: "Gagal memperbarui data" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { data: updated, action: "updated" },
        { status: 200 },
      );
    }

    // Insert baru
    const { data: inserted, error: insertError } = await supabase
      .from("cs_inputs")
      .insert({
        branch_id: profile.branch_id,
        user_id: profile.id,
        input_date: today,
        lead_masuk: leadMasuk,
        closing,
        omset,
        notes,
      })
      .select(
        `
        id, branch_id, user_id, input_date, lead_masuk, closing,
        omset, notes, created_at, updated_at,
        branches ( id, name, code )
      `,
      )
      .single();

    if (insertError) {
      console.error("[POST /api/cs/inputs] insert error:", insertError);
      return NextResponse.json(
        { error: "Gagal menyimpan data" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { data: inserted, action: "created" },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/cs/inputs] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
