// app/api/stats/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * GET /api/stats
 * Query params: year (default: current year)
 * Returns monthly, channel, and branch aggregations.
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
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear()),
      10,
    );

    const dateFrom = `${year}-01-01`;
    const dateTo = `${year}-12-31`;

    // Fetch marketing & CS data in parallel
    const [mktResult, csResult] = await Promise.all([
      supabase
        .from("marketing_inputs")
        .select(
          "input_date, omset, biaya_marketing, lead_serius, lead_all, closing, channel",
        )
        .gte("input_date", dateFrom)
        .lte("input_date", dateTo),
      supabase
        .from("cs_inputs")
        .select(
          "input_date, lead_masuk, closing, branches!cs_inputs_branch_id_fkey (id, name, code)",
        )
        .gte("input_date", dateFrom)
        .lte("input_date", dateTo),
    ]);

    if (mktResult.error) {
      console.error("[GET /api/stats] marketing:", mktResult.error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data marketing" },
        { status: 500 },
      );
    }
    if (csResult.error) {
      console.error("[GET /api/stats] cs:", csResult.error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data CS" },
        { status: 500 },
      );
    }

    const mktRows = mktResult.data ?? [];
    const csRows = csResult.data ?? [];

    // ── Monthly aggregation (marketing) ─────────────────────────────────────
    const monthlyMap = new Map<
      number,
      {
        omset: number;
        biaya_marketing: number;
        lead_serius: number;
        lead_all: number;
        closing: number;
      }
    >();

    for (let m = 1; m <= 12; m++) {
      monthlyMap.set(m, {
        omset: 0,
        biaya_marketing: 0,
        lead_serius: 0,
        lead_all: 0,
        closing: 0,
      });
    }

    for (const row of mktRows) {
      const month = new Date(row.input_date).getMonth() + 1;
      const acc = monthlyMap.get(month)!;
      acc.omset += row.omset ?? 0;
      acc.biaya_marketing += row.biaya_marketing ?? 0;
      acc.lead_serius += row.lead_serius ?? 0;
      acc.lead_all += row.lead_all ?? 0;
      acc.closing += row.closing ?? 0;
    }

    const monthly = Array.from(monthlyMap.entries()).map(([month, acc]) => ({
      month,
      bulan: MONTH_NAMES[month - 1],
      omset: acc.omset,
      gross_profit: Math.round(acc.omset * 0.5),
      biaya_marketing: acc.biaya_marketing,
      lead_serius: acc.lead_serius,
      lead_all: acc.lead_all,
      closing: acc.closing,
    }));

    // ── Channel aggregation ──────────────────────────────────────────────────
    const channelMap = new Map<
      string,
      {
        omset: number;
        biaya_marketing: number;
        lead_serius: number;
        lead_all: number;
        closing: number;
      }
    >();

    for (const row of mktRows) {
      const ch = row.channel ?? "Lainnya";
      if (!channelMap.has(ch)) {
        channelMap.set(ch, {
          omset: 0,
          biaya_marketing: 0,
          lead_serius: 0,
          lead_all: 0,
          closing: 0,
        });
      }
      const acc = channelMap.get(ch)!;
      acc.omset += row.omset ?? 0;
      acc.biaya_marketing += row.biaya_marketing ?? 0;
      acc.lead_serius += row.lead_serius ?? 0;
      acc.lead_all += row.lead_all ?? 0;
      acc.closing += row.closing ?? 0;
    }

    const channels = Array.from(channelMap.entries())
      .map(([channel, acc]) => ({
        channel,
        omset: acc.omset,
        biaya_marketing: acc.biaya_marketing,
        lead_serius: acc.lead_serius,
        lead_all: acc.lead_all,
        closing: acc.closing,
        cr_serius:
          acc.lead_serius > 0 ? (acc.closing / acc.lead_serius) * 100 : 0,
        cpls:
          acc.lead_serius > 0
            ? Math.round(acc.biaya_marketing / acc.lead_serius)
            : 0,
        roi:
          acc.biaya_marketing > 0
            ? ((acc.omset * 0.5) / acc.biaya_marketing) * 100
            : 0,
      }))
      .sort((a, b) => b.omset - a.omset);

    // ── CS branch aggregation ────────────────────────────────────────────────
    const branchMap = new Map<
      string,
      {
        name: string;
        code: string;
        lead_masuk: number;
        closing: number;
      }
    >();

    for (const row of csRows) {
      const branchArray = Array.isArray(row.branches)
        ? row.branches
        : [row.branches];
      const branch = branchArray[0] as {
        id: string;
        name: string;
        code: string;
      } | null;
      if (!branch) continue;
      if (!branchMap.has(branch.id)) {
        branchMap.set(branch.id, {
          name: branch.name,
          code: branch.code,
          lead_masuk: 0,
          closing: 0,
        });
      }
      const acc = branchMap.get(branch.id)!;
      acc.lead_masuk += row.lead_masuk ?? 0;
      acc.closing += row.closing ?? 0;
    }

    const branches = Array.from(branchMap.values())
      .map((b) => ({
        ...b,
        conversion_rate:
          b.lead_masuk > 0 ? (b.closing / b.lead_masuk) * 100 : 0,
      }))
      .sort((a, b) => b.lead_masuk - a.lead_masuk);

    // ── Grand totals ─────────────────────────────────────────────────────────
    const totals = {
      omset: mktRows.reduce((s, r) => s + (r.omset ?? 0), 0),
      biaya_marketing: mktRows.reduce(
        (s, r) => s + (r.biaya_marketing ?? 0),
        0,
      ),
      lead_serius: mktRows.reduce((s, r) => s + (r.lead_serius ?? 0), 0),
      lead_all: mktRows.reduce((s, r) => s + (r.lead_all ?? 0), 0),
      closing_mkt: mktRows.reduce((s, r) => s + (r.closing ?? 0), 0),
      lead_masuk_cs: csRows.reduce((s, r) => s + (r.lead_masuk ?? 0), 0),
      closing_cs: csRows.reduce((s, r) => s + (r.closing ?? 0), 0),
    };

    return NextResponse.json({ monthly, channels, branches, totals, year });
  } catch (error) {
    console.error("[GET /api/stats] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
