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

    // ─── VALIDASI DASAR ──────────────────────────────────────────────────

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

    if (leadSerius > leadAll) {
      return NextResponse.json(
        { error: "Lead Serius tidak boleh melebihi Lead All" },
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

    // ─── VALIDASI DATA CS ────────────────────────────────────────────────

    if (csInputId) {
      // 1. Cek apakah data CS ada
      const { data: csInput, error: csInputError } = await supabase
        .from("cs_inputs")
        .select(
          `
          id, 
          user_id, 
          branch_id,
          input_date,
          lead_masuk, 
          closing,
          omset,
          users!cs_inputs_user_id_fkey(full_name),
          branches!cs_inputs_branch_id_fkey(name, code)
        `,
        )
        .eq("id", csInputId)
        .single();

      if (csInputError || !csInput) {
        return NextResponse.json(
          { error: "Data CS tidak ditemukan" },
          { status: 404 },
        );
      }

      // 2. Cek apakah data CS SUDAH DIGUNAKAN oleh marketing input lain
      const { data: existingMktInput, error: existingError } = await supabase
        .from("marketing_inputs")
        .select("id, channel, input_date, created_at")
        .eq("cs_input_id", csInputId)
        .maybeSingle();

      if (existingMktInput) {
        return NextResponse.json(
          {
            error: `Data CS ini sudah digunakan oleh marketing input pada channel "${existingMktInput.channel}" (${existingMktInput.input_date}). Satu data CS hanya bisa dikaitkan dengan satu data marketing.`,
            existingMarketingInput: existingMktInput,
          },
          { status: 409 },
        );
      }

      // 3. Validasi tanggal: CS input date harus sama dengan marketing input date?
      if (csInput.input_date !== inputDate) {
        return NextResponse.json(
          {
            error: `Tanggal data CS (${csInput.input_date}) tidak sesuai dengan tanggal input marketing (${inputDate})`,
            csDate: csInput.input_date,
            marketingDate: inputDate,
          },
          { status: 400 },
        );
      }

      // 4. Validasi lead_masuk vs lead_serius
      if (leadSerius !== csInput.lead_masuk) {
        return NextResponse.json(
          {
            error: `Lead Serius (${leadSerius}) tidak sesuai dengan Lead Masuk CS (${csInput.lead_masuk})`,
            expected: csInput.lead_masuk,
            received: leadSerius,
          },
          { status: 400 },
        );
      }

      // 5. Validasi closing
      if (closing !== csInput.closing) {
        return NextResponse.json(
          {
            error: `Closing (${closing}) tidak sesuai dengan Closing CS (${csInput.closing})`,
            expected: csInput.closing,
            received: closing,
          },
          { status: 400 },
        );
      }

      // 6. Validasi cs_user_id (jika dikirim)
      if (csUserId && csUserId !== csInput.user_id) {
        return NextResponse.json(
          {
            error: `CS User ID tidak sesuai dengan pemilik data CS`,
            expected: csInput.user_id,
            received: csUserId,
          },
          { status: 400 },
        );
      }

      // 7. Cek apakah CS user masih aktif
      const { data: csUser, error: csUserError } = await supabase
        .from("users")
        .select("status, full_name")
        .eq("id", csInput.user_id)
        .single();

      if (!csUserError && csUser && csUser.status !== "active") {
        return NextResponse.json(
          {
            error: `User CS (${csUser.full_name}) sudah tidak aktif`,
          },
          { status: 400 },
        );
      }
    }

    // ─── CEK DUPLIKAT CHANNEL + TANGGAL ─────────────────────────────────

    const { data: existingChannel, error: channelError } = await supabase
      .from("marketing_inputs")
      .select("id, channel, input_date")
      .eq("channel", channel)
      .eq("input_date", inputDate)
      .maybeSingle();

    if (existingChannel) {
      return NextResponse.json(
        {
          error: `Data untuk channel "${channel}" pada tanggal ${inputDate} sudah ada. Gunakan fitur edit untuk mengubah data.`,
          existingId: existingChannel.id,
        },
        { status: 409 },
      );
    }

    // ─── INSERT DATA ─────────────────────────────────────────────────────

    // Hitung ROI
    const roi =
      biayaMarketing > 0
        ? (((csInputId?.omset || 0) - biayaMarketing) / biayaMarketing) * 100
        : 0;

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
        cs_user_id: csUserId || (csInputId ? csInputId?.user_id : null),
        roi: Math.round(roi * 100) / 100,
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
        roi,
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

      // Handle specific errors
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

    // ─── LOG ACTIVITY ────────────────────────────────────────────────────

    await supabase.from("activity_logs").insert({
      user_id: profile.id,
      action: "CREATE",
      entity_type: "marketing_inputs",
      entity_id: inserted.id,
      new_data: {
        channel,
        biaya_marketing: biayaMarketing,
        lead_serius: leadSerius,
        lead_all: leadAll,
        closing,
        cs_input_id: csInputId,
        cs_user_id: csUserId,
        roi: inserted.roi,
      },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        data: inserted,
        action: "created",
        message: csInputId
          ? `Data marketing berhasil disimpan dan dikaitkan dengan data CS dari ${csInputId?.branches?.name || "cabang"}`
          : "Data marketing berhasil disimpan",
      },
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
      .select(
        "id, user_id, channel, biaya_marketing, cs_input_id, input_date, lead_serius, closing",
      )
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

    if (updates.cs_input_id && updates.cs_input_id !== existing.cs_input_id) {
      // Cek apakah CS input baru sudah digunakan oleh marketing input lain
      const { data: usedCsInput, error: usedCsError } = await supabase
        .from("marketing_inputs")
        .select("id, channel, input_date")
        .eq("cs_input_id", updates.cs_input_id)
        .neq("id", id)
        .maybeSingle();

      if (usedCsInput) {
        return NextResponse.json(
          {
            error: `Data CS ini sudah digunakan oleh marketing input pada channel "${usedCsInput.channel}" (${usedCsInput.input_date})`,
            existingMarketingInput: usedCsInput,
          },
          { status: 409 },
        );
      }

      // Optional: Validasi data CS yang baru
      const { data: csInput, error: csInputError } = await supabase
        .from("cs_inputs")
        .select("id, user_id, input_date, lead_masuk, closing")
        .eq("id", updates.cs_input_id)
        .single();

      if (csInputError || !csInput) {
        return NextResponse.json(
          { error: "Data CS baru tidak ditemukan" },
          { status: 404 },
        );
      }

      // Validasi tanggal CS harus sama dengan tanggal marketing input
      if (csInput.input_date !== existing.input_date) {
        return NextResponse.json(
          {
            error: `Tanggal data CS (${csInput.input_date}) tidak sesuai dengan tanggal input marketing (${existing.input_date})`,
          },
          { status: 400 },
        );
      }

      // Jika ada updates.lead_serius, validasi dengan CS
      if (
        updates.lead_serius !== undefined &&
        updates.lead_serius !== csInput.lead_masuk
      ) {
        return NextResponse.json(
          {
            error: `Lead Serius tidak sesuai dengan Lead Masuk CS (${csInput.lead_masuk})`,
          },
          { status: 400 },
        );
      }

      // Jika ada updates.closing, validasi dengan CS
      if (
        updates.closing !== undefined &&
        updates.closing !== csInput.closing
      ) {
        return NextResponse.json(
          {
            error: `Closing tidak sesuai dengan Closing CS (${csInput.closing})`,
          },
          { status: 400 },
        );
      }

      // Set cs_user_id otomatis
      updates.cs_user_id = csInput.user_id;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Validasi jika ada field closing & lead_serius yang diupdate
    // ──────────────────────────────────────────────────────────────────────
    const currentLeadSerius = updates.lead_serius ?? existing.lead_serius;
    const currentClosing = updates.closing ?? existing.closing;

    if (currentClosing > currentLeadSerius) {
      return NextResponse.json(
        { error: "Closing tidak boleh melebihi Lead Serius" },
        { status: 400 },
      );
    }

    // ──────────────────────────────────────────────────────────────────────
    // Cek duplikat channel + tanggal jika channel atau input_date diupdate
    // ──────────────────────────────────────────────────────────────────────
    const newChannel = updates.channel ?? existing.channel;
    const newInputDate = updates.input_date ?? existing.input_date;

    if (updates.channel || updates.input_date) {
      const { data: duplicateCheck } = await supabase
        .from("marketing_inputs")
        .select("id")
        .eq("channel", newChannel)
        .eq("input_date", newInputDate)
        .neq("id", id)
        .maybeSingle();

      if (duplicateCheck) {
        return NextResponse.json(
          {
            error: `Data untuk channel "${newChannel}" pada tanggal ${newInputDate} sudah ada`,
          },
          { status: 409 },
        );
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Update data
    // ──────────────────────────────────────────────────────────────────────
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
        cs_input_id,
        cs_user_id,
        roi,
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
        cs_input_id: existing.cs_input_id,
      },
      new_data: {
        channel: updated.channel,
        biaya_marketing: updated.biaya_marketing,
        cs_input_id: updated.cs_input_id,
      },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      data: updated,
      action: "updated",
      message:
        updates.cs_input_id && updates.cs_input_id !== existing.cs_input_id
          ? "Data marketing berhasil diupdate dan dikaitkan dengan data CS baru"
          : "Data marketing berhasil diupdate",
    });
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
