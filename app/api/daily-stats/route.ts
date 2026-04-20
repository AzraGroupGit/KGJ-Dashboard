// app/api/daily-stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_ABBR = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function makeLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_ABBR[d.getDay()]} ${d.getDate()}`;
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function last7Days(dateStr: string): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ─── Aggregate helpers (mirrors /api/stats aggregation logic) ─────────────────

function sumField<T extends Record<string, unknown>>(
  rows: T[],
  field: keyof T,
): number {
  return rows.reduce((s, r) => s + ((r[field] as number) ?? 0), 0);
}

// ─── GET /api/daily-stats?date=YYYY-MM-DD ─────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ── Auth (same pattern as /api/stats) ────────────────────────────────────
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

    // ── Date params ──────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const dateStr =
      searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const prev = prevDay(dateStr);
    const days7 = last7Days(dateStr); // ["2026-04-14", ..., "2026-04-20"]

    // ── 1. Fetch marketing_inputs for selected day + prev day + 7 days ───────
    //    Single query spanning the full 7-day window, then filter in JS —
    //    same approach as /api/stats (fetch once, aggregate in-memory).
    const rangeStart = days7[0]; // earliest date in the 7-day window
    const rangeEnd = dateStr; // today

    const [mktResult, csResult] = await Promise.all([
      supabase
        .from("marketing_inputs")
        .select(
          "input_date, biaya_marketing, lead_serius, lead_all, closing, channel",
        )
        .gte("input_date", rangeStart)
        .lte("input_date", rangeEnd),
      supabase
        .from("cs_inputs")
        .select(
          "input_date, omset, lead_masuk, closing, branches!cs_inputs_branch_id_fkey (id, name, code)",
        )
        .gte("input_date", rangeStart)
        .lte("input_date", rangeEnd),
    ]);

    if (mktResult.error) {
      console.error(
        "[GET /api/daily-stats] marketing:",
        mktResult.error.message,
      );
      return NextResponse.json(
        { error: "Gagal mengambil data marketing" },
        { status: 500 },
      );
    }
    if (csResult.error) {
      console.error("[GET /api/daily-stats] cs:", csResult.error.message);
      return NextResponse.json(
        { error: "Gagal mengambil data CS" },
        { status: 500 },
      );
    }

    const allMkt = mktResult.data ?? [];
    const allCs = csResult.data ?? [];

    // ── 2. Filter rows by day ─────────────────────────────────────────────────
    const mktToday = allMkt.filter((r) => r.input_date === dateStr);
    const mktPrev = allMkt.filter((r) => r.input_date === prev);
    const csToday = allCs.filter((r) => r.input_date === dateStr);
    const csPrev = allCs.filter((r) => r.input_date === prev);

    // ── 3. Totals for selected day ────────────────────────────────────────────
    //    Mirrors totals block in /api/stats, scoped to one day
    const dayTotals = {
      omset: sumField(csToday, "omset"),
      gross_profit: Math.round(sumField(csToday, "omset") * 0.5),
      biaya_marketing: sumField(mktToday, "biaya_marketing"),
      lead_serius: sumField(mktToday, "lead_serius"),
      lead_all: sumField(mktToday, "lead_all"),
      closing: sumField(mktToday, "closing"), // marketing closing
      lead_masuk_cs: sumField(csToday, "lead_masuk"),
      closing_cs: sumField(csToday, "closing"),
    };

    // Use CS lead_masuk as the primary "lead_masuk" (consistent with dashboard)
    const lead_masuk = dayTotals.lead_masuk_cs;
    const closing = dayTotals.closing_cs;
    const omset = dayTotals.omset;
    const gross_profit = dayTotals.gross_profit;
    const lead_serius = dayTotals.lead_serius;

    // ── 4. Totals for previous day (for delta badges) ─────────────────────────
    const prevLead = sumField(csPrev, "lead_masuk");
    const prevClose = sumField(csPrev, "closing");
    const prevOmset = sumField(csPrev, "omset");

    // ── 5. Staff / branch breakdown ───────────────────────────────────────────
    //    Mirror branch aggregation from /api/stats but keyed per branch per day
    const branchMap = new Map<
      string,
      { name: string; code: string; lead_masuk: number; closing: number }
    >();

    for (const row of csToday) {
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

    // Also pull marketing channel data for today
    const channelMap = new Map<
      string,
      {
        biaya_marketing: number;
        lead_serius: number;
        closing: number;
      }
    >();
    for (const row of mktToday) {
      const ch = row.channel ?? "Lainnya";
      if (!channelMap.has(ch)) {
        channelMap.set(ch, {
          biaya_marketing: 0,
          lead_serius: 0,
          closing: 0,
        });
      }
      const acc = channelMap.get(ch)!;
      acc.biaya_marketing += row.biaya_marketing ?? 0;
      acc.lead_serius += row.lead_serius ?? 0;
      acc.closing += row.closing ?? 0;
    }

    // Build staff array from branchMap —
    // staff here represents per-branch CS performance for the day
    const staff = Array.from(branchMap.entries())
      .map(([id, b]) => {
        const cr = b.lead_masuk > 0 ? (b.closing / b.lead_masuk) * 100 : 0;
        return {
          id,
          name: b.name, // branch name as the "staff" label
          branch: b.code,
          lead_masuk: b.lead_masuk,
          lead_serius: 0, // cs_inputs doesn't track lead_serius per branch
          closing: b.closing,
          omset: 0, // omset from cs_inputs is not per-branch in current schema
          follow_up: 0, // not available in current schema
          last_activity: null, // not available in current schema
          cr,
        };
      })
      .sort((a, b) => b.closing - a.closing);

    // ── 6. 7-day trend ────────────────────────────────────────────────────────
    //    Aggregate allMkt + allCs per day — same as monthly in /api/stats
    const trend = days7.map((day) => {
      const csDay = allCs.filter((r) => r.input_date === day);
      const dayOmset = sumField(csDay, "omset");
      return {
        date: day,
        label: makeLabel(day),
        lead_masuk: sumField(csDay, "lead_masuk"),
        closing: sumField(csDay, "closing"),
        omset: dayOmset,
        gross_profit: Math.round(dayOmset * 0.5),
      };
    });

    // ── 7. Build response ─────────────────────────────────────────────────────
    return NextResponse.json({
      date: dateStr,
      totals: {
        lead_masuk,
        lead_serius,
        closing,
        omset,
        gross_profit,
        // Delta vs previous day
        lead_masuk_delta: lead_masuk - prevLead,
        closing_delta: closing - prevClose,
        omset_delta: Math.round((omset - prevOmset) / 1_000_000), // in Juta
      },
      staff,
      trend,
    });
  } catch (error) {
    console.error("[GET /api/daily-stats] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
