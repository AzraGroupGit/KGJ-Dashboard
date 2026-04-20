// app/api/cs/stats/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cs/stats
 *
 * Stats ringkasan untuk dashboard CS:
 * - Total lead & closing bulan ini
 * - CR rata-rata bulan ini
 * - Jumlah hari input bulan ini
 * - Status input hari ini (sudah/belum)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id, role, branch_id, branches ( id, name, code )")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "cs" || !profile.branch_id) {
      return NextResponse.json(
        { error: "User bukan CS atau tidak terhubung ke cabang" },
        { status: 403 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 7) + "-01";

    const { data: monthInputs, error: monthError } = await supabase
      .from("cs_inputs")
      .select("input_date, lead_masuk, closing")
      .eq("branch_id", profile.branch_id)
      .gte("input_date", monthStart);

    if (monthError) {
      console.error("[GET /api/cs/stats] month error:", monthError.message);
      return NextResponse.json(
        { error: "Gagal mengambil data bulan ini" },
        { status: 500 },
      );
    }

    const totalLeadMasuk =
      monthInputs?.reduce((sum, r) => sum + r.lead_masuk, 0) ?? 0;
    const totalClosing =
      monthInputs?.reduce((sum, r) => sum + r.closing, 0) ?? 0;
    const averageCR =
      totalLeadMasuk > 0 ? (totalClosing / totalLeadMasuk) * 100 : 0;

    const todayInput = monthInputs?.find((r) => r.input_date === today) || null;

    return NextResponse.json({
      data: {
        branch: profile.branches,
        month: {
          totalLeadMasuk,
          totalClosing,
          averageCR,
          totalDays: monthInputs?.length ?? 0,
        },
        today: {
          hasInput: !!todayInput,
          leadMasuk: todayInput?.lead_masuk ?? null,
          closing: todayInput?.closing ?? null,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/cs/stats] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
