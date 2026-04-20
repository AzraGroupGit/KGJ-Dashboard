// app/api/reports/export/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "Rp 0";
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString("id-ID");
}

function formatPercentage(value: number | null, total: number | null): string {
  if (!value || !total || total === 0) return "0,0%";
  return `${((value / total) * 100).toFixed(1).replace(".", ",")}%`;
}


function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // Tambahkan BOM untuk mendukung karakter UTF-8 di Excel
    return s.includes(",") ||
      s.includes('"') ||
      s.includes("\n") ||
      s.includes(";")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}

/**
 * GET /api/reports/export
 * Query params: type = cs | marketing | complete, period? (YYYY-MM)
 * Returns a CSV file download. Hanya superadmin.
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
    const type = searchParams.get("type") ?? "complete";
    const period = searchParams.get("period");

    let csvContent = "";
    let filename = "";

    // Generate timestamp untuk filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    if (type === "cs") {
      let query = supabase
        .from("cs_inputs")
        .select(
          `
          input_date,
          lead_masuk,
          closing,
          notes,
          branches!cs_inputs_branch_id_fkey (name, code),
          users!cs_inputs_user_id_fkey (full_name)
        `,
        )
        .order("input_date", { ascending: false });

      if (period) {
        const [year, month] = period.split("-");
        const from = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("input_date", from).lte("input_date", to);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Hitung total untuk summary
      const totalLead =
        data?.reduce((sum, r) => sum + (r.lead_masuk || 0), 0) || 0;
      const totalClosing =
        data?.reduce((sum, r) => sum + (r.closing || 0), 0) || 0;

      const rows =
        data?.map((r, index) => [
          index + 1, // No
          formatDate(r.input_date),
          (r.branches as any)?.name ?? "-",
          (r.branches as any)?.code ?? "-",
          (r.users as any)?.full_name ?? "-",
          formatNumber(r.lead_masuk),
          formatNumber(r.closing),
          formatPercentage(r.closing, r.lead_masuk),
          r.notes ?? "-",
        ]) ?? [];

      // Tambahkan summary di akhir
      rows.push(
        [], // Baris kosong
        [
          "",
          "",
          "",
          "",
          "TOTAL",
          formatNumber(totalLead),
          formatNumber(totalClosing),
          formatPercentage(totalClosing, totalLead),
          "",
        ],
      );

      csvContent = toCSV(
        [
          "No",
          "Tanggal",
          "Cabang",
          "Kode Cabang",
          "Nama CS",
          "Lead Masuk",
          "Closing",
          "Conversion Rate",
          "Catatan",
        ],
        rows,
      );

      filename = `Laporan_CS${period ? "_" + period : ""}_${timestamp}.csv`;
    } else if (type === "marketing") {
      let query = supabase
        .from("marketing_inputs")
        .select(
          `
          input_date,
          channel,
          biaya_marketing,
          lead_serius,
          lead_all,
          closing,
          notes,
          users!marketing_inputs_user_id_fkey (full_name)
        `,
        )
        .order("input_date", { ascending: false });

      if (period) {
        const [year, month] = period.split("-");
        const from = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("input_date", from).lte("input_date", to);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Hitung total untuk summary
      const totalBiaya =
        data?.reduce((sum, r) => sum + (r.biaya_marketing || 0), 0) || 0;
      const totalLeadAll =
        data?.reduce((sum, r) => sum + (r.lead_all || 0), 0) || 0;
      const totalLeadSerius =
        data?.reduce((sum, r) => sum + (r.lead_serius || 0), 0) || 0;
      const totalClosing =
        data?.reduce((sum, r) => sum + (r.closing || 0), 0) || 0;

      const rows =
        data?.map((r, index) => [
          index + 1, // No
          formatDate(r.input_date),
          r.channel,
          (r.users as any)?.full_name ?? "-",
          formatCurrency(r.biaya_marketing),
          formatNumber(r.lead_all),
          formatNumber(r.lead_serius),
          formatNumber(r.closing),
          r.notes ?? "-",
        ]) ?? [];

      // Tambahkan summary di akhir
      rows.push(
        [], // Baris kosong
        [
          "",
          "",
          "",
          "TOTAL",
          formatCurrency(totalBiaya),
          formatNumber(totalLeadAll),
          formatNumber(totalLeadSerius),
          formatNumber(totalClosing),
          "",
        ],
      );

      csvContent = toCSV(
        [
          "No",
          "Tanggal",
          "Channel",
          "Marketing",
          "Biaya Marketing",
          "Total Lead",
          "Lead Serius",
          "Closing",
          "Catatan",
        ],
        rows,
      );

      filename = `Laporan_Marketing${period ? "_" + period : ""}_${timestamp}.csv`;
    } else {
      // Complete export dengan dua sheet terpisah (menggunakan Excel-compatible format)
      const [csResult, mktResult] = await Promise.all([
        supabase
          .from("cs_inputs")
          .select(
            `input_date, lead_masuk, closing, notes,
             branches!cs_inputs_branch_id_fkey (name, code),
             users!cs_inputs_user_id_fkey (full_name)`,
          )
          .order("input_date", { ascending: false }),
        supabase
          .from("marketing_inputs")
          .select(
            `input_date, channel, biaya_marketing, lead_serius, lead_all, closing, notes,
             users!marketing_inputs_user_id_fkey (full_name)`,
          )
          .order("input_date", { ascending: false }),
      ]);

      if (csResult.error) throw csResult.error;
      if (mktResult.error) throw mktResult.error;

      // CS Data dengan summary
      const totalLead =
        csResult.data?.reduce((sum, r) => sum + (r.lead_masuk || 0), 0) || 0;
      const totalClosing =
        csResult.data?.reduce((sum, r) => sum + (r.closing || 0), 0) || 0;

      const csRows =
        csResult.data?.map((r, index) => [
          index + 1,
          formatDate(r.input_date),
          (r.branches as any)?.name ?? "-",
          (r.branches as any)?.code ?? "-",
          (r.users as any)?.full_name ?? "-",
          formatNumber(r.lead_masuk),
          formatNumber(r.closing),
          formatPercentage(r.closing, r.lead_masuk),
          r.notes ?? "-",
        ]) ?? [];

      csRows.push(
        [],
        [
          "",
          "",
          "",
          "",
          "TOTAL",
          formatNumber(totalLead),
          formatNumber(totalClosing),
          formatPercentage(totalClosing, totalLead),
          "",
        ],
      );

      // Marketing Data dengan summary
      const totalBiaya =
        mktResult.data?.reduce((sum, r) => sum + (r.biaya_marketing || 0), 0) ||
        0;
      const totalLeadAll =
        mktResult.data?.reduce((sum, r) => sum + (r.lead_all || 0), 0) || 0;
      const totalLeadSerius =
        mktResult.data?.reduce((sum, r) => sum + (r.lead_serius || 0), 0) || 0;
      const totalClosingMkt =
        mktResult.data?.reduce((sum, r) => sum + (r.closing || 0), 0) || 0;

      const mktRows =
        mktResult.data?.map((r, index) => [
          index + 1,
          formatDate(r.input_date),
          r.channel,
          (r.users as any)?.full_name ?? "-",
          formatCurrency(r.biaya_marketing),
          formatNumber(r.lead_all),
          formatNumber(r.lead_serius),
          formatNumber(r.closing),
          r.notes ?? "-",
        ]) ?? [];

      mktRows.push(
        [],
        [
          "",
          "",
          "",
          "TOTAL",
          formatCurrency(totalBiaya),
          formatNumber(totalLeadAll),
          formatNumber(totalLeadSerius),
          formatNumber(totalClosingMkt),
          "",
        ],
      );

      // Header dengan informasi export
      const exportDate = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const csCSV = toCSV(
        [
          "No",
          "Tanggal",
          "Cabang",
          "Kode Cabang",
          "Nama CS",
          "Lead Masuk",
          "Closing",
          "Conversion Rate",
          "Catatan",
        ],
        csRows,
      );

      const mktCSV = toCSV(
        [
          "No",
          "Tanggal",
          "Channel",
          "Marketing",
          "Biaya Marketing",
          "Total Lead",
          "Lead Serius",
          "Closing",
          "Catatan",
        ],
        mktRows,
      );

      // Format yang lebih informatif
      csvContent =
        `LAPORAN LENGKAP - DIEKSPOR PADA: ${exportDate}\r\n` +
        `================================================================\r\n\r\n` +
        `RINGKASAN DATA CS\r\n` +
        `----------------\r\n` +
        `Total Lead Masuk: ${formatNumber(totalLead)}\r\n` +
        `Total Closing: ${formatNumber(totalClosing)}\r\n` +
        `Conversion Rate Keseluruhan: ${formatPercentage(totalClosing, totalLead)}\r\n` +
        `Total Data: ${csResult.data?.length || 0} entri\r\n\r\n` +
        `RINGKASAN DATA MARKETING\r\n` +
        `-----------------------\r\n` +
        `Total Biaya Marketing: ${formatCurrency(totalBiaya)}\r\n` +
        `Total Lead All: ${formatNumber(totalLeadAll)}\r\n` +
        `Total Lead Serius: ${formatNumber(totalLeadSerius)}\r\n` +
        `Total Closing: ${formatNumber(totalClosingMkt)}\r\n` +
        `Total Data: ${mktResult.data?.length || 0} entri\r\n\r\n` +
        `================================================================\r\n\r\n` +
        `=== DATA CS (DETAIL) ===\r\n` +
        csCSV +
        `\r\n\r\n` +
        `=== DATA MARKETING (DETAIL) ===\r\n` +
        mktCSV;

      filename = `Laporan_Lengkap_${timestamp}.csv`;
    }

    // Tambahkan BOM untuk mendukung karakter UTF-8 di Excel
    const BOM = "\uFEFF";

    return new Response(BOM + csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/export] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat ekspor data" },
      { status: 500 },
    );
  }
}
