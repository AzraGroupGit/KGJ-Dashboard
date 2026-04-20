// app/api/reports/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Helper untuk generate CSV content berdasarkan tipe laporan
 */
async function generateReportContent(
  supabase: any,
  type: string,
  period: string,
): Promise<{ content: string; filename: string } | null> {
  let content = "";
  let filename = "";

  if (type === "monthly") {
    const [year, month] = period.split("-");
    const from = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    // Ambil data CS
    const { data: csData } = await supabase
      .from("cs_inputs")
      .select(
        `
        input_date, lead_masuk, closing, omset, notes,
        branches(name, code),
        users(full_name)
      `,
      )
      .gte("input_date", from)
      .lte("input_date", to)
      .order("input_date", { ascending: true });

    // Ambil data Marketing
    const { data: mktData } = await supabase
      .from("marketing_inputs")
      .select(
        `
        input_date, channel, biaya_marketing, lead_serius, 
        lead_all, closing, notes,
        users(full_name)
      `,
      )
      .gte("input_date", from)
      .lte("input_date", to)
      .order("input_date", { ascending: true });

    // Generate CSV content
    content = generateMonthlyCSV(csData || [], mktData || [], period);
    filename = `Laporan_Bulanan_${period}.csv`;
  } else if (type === "quarterly") {
    // Implementasi untuk quarterly
    const [year, q] = period.split("-");
    const quarter = parseInt(q.replace("Q", ""));
    const startMonth = (quarter - 1) * 3;
    const from = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
    const endMonth = startMonth + 2;
    const lastDay = new Date(parseInt(year), endMonth, 0).getDate();
    const to = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

    const { data: csData } = await supabase
      .from("cs_inputs")
      .select(
        `
        input_date, lead_masuk, closing, omset, notes,
        branches(name, code),
        users(full_name)
      `,
      )
      .gte("input_date", from)
      .lte("input_date", to)
      .order("input_date", { ascending: true });

    const { data: mktData } = await supabase
      .from("marketing_inputs")
      .select(
        `
        input_date, channel, biaya_marketing, lead_serius, 
        lead_all, closing, notes,
        users(full_name)
      `,
      )
      .gte("input_date", from)
      .lte("input_date", to)
      .order("input_date", { ascending: true });

    content = generateMonthlyCSV(csData || [], mktData || [], period);
    filename = `Laporan_Triwulan_${period}.csv`;
  } else if (type === "yearly") {
    const from = `${period}-01-01`;
    const to = `${period}-12-31`;

    const { data: csData } = await supabase
      .from("cs_inputs")
      .select(
        `
        input_date, lead_masuk, closing, omset, notes,
        branches(name, code),
        users(full_name)
      `,
      )
      .gte("input_date", from)
      .lte("input_date", to)
      .order("input_date", { ascending: true });

    const { data: mktData } = await supabase
      .from("marketing_inputs")
      .select(
        `
        input_date, channel, biaya_marketing, lead_serius, 
        lead_all, closing, notes,
        users(full_name)
      `,
      )
      .gte("input_date", from)
      .lte("input_date", to)
      .order("input_date", { ascending: true });

    content = generateMonthlyCSV(csData || [], mktData || [], period);
    filename = `Laporan_Tahunan_${period}.csv`;
  }

  return content ? { content, filename } : null;
}

function generateMonthlyCSV(
  csData: any[],
  mktData: any[],
  period: string,
): string {
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  // Header informasi
  let csv = `LAPORAN PERIODE: ${period}\n`;
  csv += `Dibuat pada: ${new Date().toLocaleString("id-ID")}\n`;
  csv += `\n=== DATA CUSTOMER SERVICE ===\n`;

  // CS Headers
  const csHeaders = [
    "Tanggal",
    "Cabang",
    "Kode",
    "CS",
    "Lead Masuk",
    "Closing",
    "Conversion Rate",
    "Omset",
    "Catatan",
  ];
  csv += csHeaders.map(escape).join(",") + "\n";

  // CS Rows
  csData.forEach((row) => {
    const cr =
      row.closing > 0 && row.lead_masuk > 0
        ? ((row.closing / row.lead_masuk) * 100).toFixed(1) + "%"
        : "0%";

    csv +=
      [
        row.input_date,
        row.branches?.name || "",
        row.branches?.code || "",
        row.users?.full_name || "",
        row.lead_masuk,
        row.closing,
        cr,
        row.omset || 0,
        row.notes || "",
      ]
        .map(escape)
        .join(",") + "\n";
  });

  // Marketing Headers
  csv += `\n=== DATA MARKETING ===\n`;
  const mktHeaders = [
    "Tanggal",
    "Channel",
    "Marketing",
    "Biaya",
    "Lead All",
    "Lead Serius",
    "Closing",
    "Catatan",
  ];
  csv += mktHeaders.map(escape).join(",") + "\n";

  // Marketing Rows
  mktData.forEach((row) => {
    csv +=
      [
        row.input_date,
        row.channel,
        row.users?.full_name || "",
        row.biaya_marketing,
        row.lead_all,
        row.lead_serius,
        row.closing,
        row.notes || "",
      ]
        .map(escape)
        .join(",") + "\n";
  });

  // Summary
  const totalOmset = csData.reduce((sum, r) => sum + (r.omset || 0), 0);
  const totalBiaya = mktData.reduce(
    (sum, r) => sum + (r.biaya_marketing || 0),
    0,
  );
  const totalLeadMasuk = csData.reduce(
    (sum, r) => sum + (r.lead_masuk || 0),
    0,
  );
  const totalClosing = csData.reduce((sum, r) => sum + (r.closing || 0), 0);

  csv += `\n=== RINGKASAN ===\n`;
  csv += `Total Omset,${totalOmset}\n`;
  csv += `Total Biaya Marketing,${totalBiaya}\n`;
  csv += `Total Lead Masuk,${totalLeadMasuk}\n`;
  csv += `Total Closing,${totalClosing}\n`;

  return csv;
}

/**
 * GET /api/reports
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
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200,
    );

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
      return NextResponse.json(
        { error: "Tipe laporan tidak valid" },
        { status: 400 },
      );
    }

    // 1. Buat record dengan status processing
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        title,
        type,
        period,
        generated_by: user.id,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/reports] insert error:", insertError.message);
      return NextResponse.json(
        { error: "Gagal membuat laporan" },
        { status: 500 },
      );
    }

    try {
      // 2. Generate file content
      const reportData = await generateReportContent(supabase, type, period);

      if (!reportData) {
        throw new Error("Gagal generate konten laporan");
      }

      const { content, filename } = reportData;
      const fileBuffer = Buffer.from(content, "utf-8");
      const filePath = `reports/${report.id}/${filename}`;

      // 3. Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, fileBuffer, {
          contentType: "text/csv",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload gagal: ${uploadError.message}`);
      }

      // 4. Dapatkan public URL
      const { data: urlData } = supabase.storage
        .from("reports")
        .getPublicUrl(filePath);

      // 5. Update record dengan file_url dan status ready
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          file_url: urlData.publicUrl,
          file_size: fileBuffer.length,
          status: "ready",
        })
        .eq("id", report.id);

      if (updateError) {
        throw new Error(`Update gagal: ${updateError.message}`);
      }

      // 6. Ambil data terbaru
      const { data: updatedReport } = await supabase
        .from("reports")
        .select(
          `
          id, title, type, period, file_url, file_size,
          status, generated_at,
          users!reports_generated_by_fkey (full_name)
        `,
        )
        .eq("id", report.id)
        .single();

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "CREATE_REPORT",
        entity_type: "reports",
        entity_id: report.id,
        new_data: { title, type, period },
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ data: updatedReport }, { status: 201 });
    } catch (error) {
      console.error("[POST /api/reports] generation error:", error);

      // Update status menjadi failed
      await supabase
        .from("reports")
        .update({ status: "failed" })
        .eq("id", report.id);

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Gagal generate laporan",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[POST /api/reports] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
