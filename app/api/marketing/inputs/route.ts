// app/api/marketing/inputs/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/marketing/inputs
 * Query params: from, to (YYYY-MM-DD), channel, limit (default 100, max 500)
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const channel = searchParams.get("channel");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500,
    );

    let query = supabase
      .from("marketing_inputs")
      .select(
        `
        id,
        channel,
        user_id,
        input_date,
        biaya_marketing,
        lead_serius,
        lead_all,
        closing,
        notes,
        created_at,
        updated_at,
        users!marketing_inputs_user_id_fkey (
          id,
          full_name,
          email
        )
      `,
      )
      .order("input_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (from) query = query.gte("input_date", from);
    if (to) query = query.lte("input_date", to);
    if (channel && channel !== "all") query = query.eq("channel", channel);

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/marketing/inputs]", error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data marketing" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/marketing/inputs] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/marketing/inputs
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
      .select("id, role, status")
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

    if (profile.role !== "marketing") {
      return NextResponse.json(
        { error: "Hanya marketing yang dapat input data" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const channel = body.channel?.trim();
    const biayaMarketing = Number(body.biaya_marketing);
    const leadSerius = Number(body.lead_serius);
    const leadAll = Number(body.lead_all);
    const closing = Number(body.closing);
    const inputDate = body.input_date || new Date().toISOString().split("T")[0];
    const notes =
      typeof body.notes === "string" && body.notes.trim() !== ""
        ? body.notes.trim()
        : null;
    const csInputId = body.cs_input_id || null;
    const csUserId = body.cs_user_id || null;

    // Validasi
    if (!channel) {
      return NextResponse.json(
        { error: "Channel marketing harus diisi" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(biayaMarketing) || biayaMarketing < 0) {
      return NextResponse.json(
        { error: "Biaya marketing harus berupa angka bulat positif" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(leadSerius) || leadSerius < 0) {
      return NextResponse.json(
        { error: "Lead serius harus berupa angka bulat positif" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(leadAll) || leadAll < 0) {
      return NextResponse.json(
        { error: "Lead all harus berupa angka bulat positif" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(closing) || closing < 0) {
      return NextResponse.json(
        { error: "Closing harus berupa angka bulat positif" },
        { status: 400 },
      );
    }

    if (closing > leadSerius) {
      return NextResponse.json(
        { error: "Closing tidak boleh melebihi Lead Serius" },
        { status: 400 },
      );
    }

    // Jika cs_input_id diisi, verifikasi bahwa data CS tersebut ada
    if (csInputId) {
      const { data: csInput, error: csInputError } = await supabase
        .from("cs_inputs")
        .select("id, user_id, lead_masuk, closing")
        .eq("id", csInputId)
        .single();

      if (csInputError || !csInput) {
        return NextResponse.json(
          { error: "Data CS tidak ditemukan" },
          { status: 404 },
        );
      }

      // Optional: Validasi bahwa lead_serius dan closing sesuai dengan data CS
      if (leadSerius !== csInput.lead_masuk) {
        return NextResponse.json(
          { error: "Lead Serius tidak sesuai dengan data CS" },
          { status: 400 },
        );
      }

      if (closing !== csInput.closing) {
        return NextResponse.json(
          { error: "Closing tidak sesuai dengan data CS" },
          { status: 400 },
        );
      }
    }

    // Insert data
    const { data: inserted, error: insertError } = await supabase
      .from("marketing_inputs")
      .insert({
        channel,
        user_id: profile.id,
        input_date: inputDate,
        biaya_marketing: biayaMarketing,
        lead_serius: leadSerius,
        lead_all: leadAll,
        closing,
        notes,
        cs_input_id: csInputId,
        cs_user_id: csUserId,
      })
      .select(
        `
        id,
        channel,
        user_id,
        input_date,
        biaya_marketing,
        lead_serius,
        lead_all,
        closing,
        notes,
        cs_input_id,
        cs_user_id,
        created_at,
        updated_at,
        users!marketing_inputs_user_id_fkey (
          id,
          full_name,
          email
        )
      `,
      )
      .single();

    if (insertError) {
      console.error("[POST /api/marketing/inputs] insert error:", insertError);
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: `Data channel "${channel}" untuk tanggal ${inputDate} sudah ada.`,
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal menyimpan data marketing" },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "CREATE",
      entity_type: "marketing_inputs",
      entity_id: inserted.id,
      new_data: {
        channel,
        biayaMarketing,
        cs_input_id: csInputId,
        cs_user_id: csUserId,
      },
    });

    return NextResponse.json(
      { data: inserted, action: "created" },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/marketing/inputs] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/marketing/inputs
 */
export async function PUT(request: Request) {
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
      .select("id, role, status")
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

    if (profile.role !== "marketing") {
      return NextResponse.json(
        { error: "Hanya marketing yang dapat update data" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID data diperlukan" },
        { status: 400 },
      );
    }

    // Cek kepemilikan data
    const { data: existing, error: existingError } = await supabase
      .from("marketing_inputs")
      .select("id, user_id, channel, biaya_marketing")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    if (existing.user_id !== profile.id) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk mengupdate data ini" },
        { status: 403 },
      );
    }

    // Validasi jika ada field yang diupdate
    if (updates.closing !== undefined && updates.lead_serius !== undefined) {
      if (updates.closing > updates.lead_serius) {
        return NextResponse.json(
          { error: "Closing tidak boleh melebihi Lead Serius" },
          { status: 400 },
        );
      }
    }

    // Update data
    const { data: updated, error: updateError } = await supabase
      .from("marketing_inputs")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        id,
        channel,
        user_id,
        input_date,
        biaya_marketing,
        lead_serius,
        lead_all,
        closing,
        notes,
        created_at,
        updated_at,
        users!marketing_inputs_user_id_fkey (
          id,
          full_name,
          email
        )
      `,
      )
      .single();

    if (updateError) {
      console.error("[PUT /api/marketing/inputs] update error:", updateError);
      return NextResponse.json(
        { error: "Gagal mengupdate data" },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "UPDATE",
      entity_type: "marketing_inputs",
      entity_id: id,
      old_data: {
        channel: existing.channel,
        biaya_marketing: existing.biaya_marketing,
      },
      new_data: {
        channel: updated.channel,
        biaya_marketing: updated.biaya_marketing,
      },
    });

    return NextResponse.json({ data: updated, action: "updated" });
  } catch (error) {
    console.error("[PUT /api/marketing/inputs] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/marketing/inputs
 */
export async function DELETE(request: Request) {
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
      .select("id, role, status")
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID data diperlukan" },
        { status: 400 },
      );
    }

    // Cek kepemilikan data
    const { data: existing, error: existingError } = await supabase
      .from("marketing_inputs")
      .select("id, user_id, channel, biaya_marketing")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    if (existing.user_id !== profile.id) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk menghapus data ini" },
        { status: 403 },
      );
    }

    // Delete data
    const { error: deleteError } = await supabase
      .from("marketing_inputs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "[DELETE /api/marketing/inputs] delete error:",
        deleteError,
      );
      return NextResponse.json(
        { error: "Gagal menghapus data" },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "DELETE",
      entity_type: "marketing_inputs",
      entity_id: id,
      old_data: {
        channel: existing.channel,
        biaya_marketing: existing.biaya_marketing,
      },
    });

    return NextResponse.json({ success: true, action: "deleted" });
  } catch (error) {
    console.error("[DELETE /api/marketing/inputs] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
