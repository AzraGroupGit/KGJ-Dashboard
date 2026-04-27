// app/api/cs/stats/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cs/stats
 *
 * Stats ringkasan untuk dashboard CS:
 * - Total lead & closing bulan ini
 * - CR rata-rata bulan ini
 * - Jumlah hari input bulan ini (hari unik)
 * - Status input hari ini (sudah/belum)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Ambil user yang sedang login
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[GET /api/cs/stats] Auth error:", userError);
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Silakan login kembali",
        },
        { status: 401 },
      );
    }

    // 2. Ambil data user dasar dulu
    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("id, role_id, branch_id, full_name, email, status")
      .eq("id", user.id)
      .single();

    if (userDataError || !userData) {
      console.error("[GET /api/cs/stats] User data error:", userDataError);
      return NextResponse.json(
        {
          success: false,
          error: "Data user tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // Validasi status user
    if (userData.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: "Akun Anda tidak aktif. Silakan hubungi administrator.",
        },
        { status: 403 },
      );
    }

    // 3. Ambil data role secara terpisah
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("name, role_group, permissions")
      .eq("id", userData.role_id)
      .single();

    if (roleError || !roleData) {
      console.error("[GET /api/cs/stats] Role error:", roleError);
      return NextResponse.json(
        {
          success: false,
          error: "Data role tidak ditemukan",
        },
        { status: 403 },
      );
    }

    // 4. Validasi role dengan lebih fleksibel
    const allowedRoles = ["customer_service"];
    const isAllowed =
      allowedRoles.includes(roleData.role_group?.toLowerCase()) ||
      allowedRoles.includes(roleData.name?.toLowerCase());

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akses ditolak. Hanya Customer Service yang dapat mengakses endpoint ini",
          required_role: "customer_service",
          current_role: roleData.name,
          current_role_group: roleData.role_group,
        },
        { status: 403 },
      );
    }

    // 5. Validasi branch_id
    if (!userData.branch_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User tidak terhubung ke cabang manapun. Silakan hubungi administrator.",
        },
        { status: 403 },
      );
    }

    // 6. Ambil data branch
    const { data: branchData, error: branchError } = await supabase
      .from("branches")
      .select("id, name, code, address, phone, status")
      .eq("id", userData.branch_id)
      .single();

    if (branchError || !branchData) {
      console.error("[GET /api/cs/stats] Branch error:", branchError);
      // Branch tidak wajib ada untuk response, tapi kita tetap lanjutkan
    }

    // Validasi status branch
    if (branchData && branchData.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cabang Anda sedang tidak aktif. Silakan hubungi administrator.",
        },
        { status: 403 },
      );
    }

    // 7. Setup periode waktu dengan timezone yang benar
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthStart = `${year}-${month}-01`;
    const today = now.toISOString().split("T")[0];

    // Untuk debugging (opsional)
    console.log(
      `[GET /api/cs/stats] Fetching data for user ${user.id}, branch ${userData.branch_id}, period ${monthStart} to ${today}`,
    );

    // 8. Ambil data cs_inputs bulan ini
    const { data: monthInputs, error: monthError } = await supabase
      .from("cs_inputs")
      .select("input_date, lead_masuk, closing, omset, notes, created_at")
      .eq("branch_id", userData.branch_id)
      .eq("user_id", user.id)
      .gte("input_date", monthStart)
      .lte("input_date", today) // Tambahkan batas atas
      .order("input_date", { ascending: true });

    if (monthError) {
      console.error("[GET /api/cs/stats] Month data error:", monthError);
      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil data statistik bulan ini",
        },
        { status: 500 },
      );
    }

    // 9. Hitung statistik dengan lebih akurat
    const monthData = monthInputs || [];
    const totalLeadMasuk = monthData.reduce(
      (sum, r) => sum + (r.lead_masuk || 0),
      0,
    );
    const totalClosing = monthData.reduce(
      (sum, r) => sum + (r.closing || 0),
      0,
    );
    const totalOmset = monthData.reduce((sum, r) => sum + (r.omset || 0), 0);

    // Hitung conversion rate dengan presisi 2 desimal
    const averageCR =
      totalLeadMasuk > 0
        ? Number(((totalClosing / totalLeadMasuk) * 100).toFixed(2))
        : 0;

    // Hitung jumlah hari unik (bukan jumlah row)
    const uniqueDays = new Set(monthData.map((r) => r.input_date)).size;

    // Cek input hari ini
    const todayInput = monthData.find((r) => r.input_date === today) || null;

    // Hitung target progress (contoh: target 20 closing per bulan)
    const monthlyTargetClosing = 20; // Bisa diambil dari database atau config
    const progressToTarget =
      monthlyTargetClosing > 0
        ? Number(((totalClosing / monthlyTargetClosing) * 100).toFixed(1))
        : 0;

    // Hitung rata-rata per hari (hanya untuk hari yang ada input)
    const avgLeadPerInputDay =
      uniqueDays > 0 ? Math.round(totalLeadMasuk / uniqueDays) : 0;
    const avgClosingPerInputDay =
      uniqueDays > 0 ? Math.round(totalClosing / uniqueDays) : 0;

    // 10. Siapkan response data
    const responseData = {
      success: true,
      data: {
        // Informasi user
        user: {
          id: user.id,
          name: userData.full_name,
          email: userData.email,
          role: roleData.name,
          roleGroup: roleData.role_group,
        },

        // Informasi branch
        branch: branchData
          ? {
              id: branchData.id,
              name: branchData.name,
              code: branchData.code,
              address: branchData.address,
              phone: branchData.phone,
            }
          : null,

        // Periode laporan
        period: {
          month: `${year}-${month}`,
          monthName: getMonthName(month),
          year: year,
          startDate: monthStart,
          endDate: today,
          daysWithInput: uniqueDays,
          totalDaysInMonth: getDaysInMonth(year, parseInt(month)),
        },

        // Ringkasan statistik
        summary: {
          totalLeadMasuk,
          totalClosing,
          totalOmset: formatCurrency(totalOmset),
          totalOmsetRaw: totalOmset,
          conversionRate: averageCR,
          averageLeadPerDay: avgLeadPerInputDay,
          averageClosingPerDay: avgClosingPerInputDay,
          progressToTarget: progressToTarget,
          monthlyTargetClosing: monthlyTargetClosing,
        },

        // Data hari ini
        today: {
          hasInput: !!todayInput,
          date: today,
          dayName: getDayName(today),
          leadMasuk: todayInput?.lead_masuk ?? 0,
          closing: todayInput?.closing ?? 0,
          omset: todayInput?.omset ?? 0,
          omsetFormatted: formatCurrency(todayInput?.omset ?? 0),
          notes: todayInput?.notes ?? null,
          status: todayInput ? "sudah_input" : "belum_input",
        },

        // Rekomendasi & insight
        insights: generateInsights({
          hasInputToday: !!todayInput,
          totalClosing,
          monthlyTargetClosing,
          daysRemaining: getDaysRemainingInMonth(now),
          uniqueDays,
          averageCR,
        }),

        // Data historis (7 hari terakhir)
        recentHistory: getLast7DaysHistory(monthData, today),
      },
    };

    // 11. Return response dengan cache header untuk performance
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0", // Jangan cache data realtime
      },
    });
  } catch (error) {
    console.error("[GET /api/cs/stats] Unexpected error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada server",
        message:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Mendapatkan nama bulan dalam Bahasa Indonesia
 */
function getMonthName(month: string): string {
  const months = [
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
  return months[parseInt(month) - 1];
}

/**
 * Mendapatkan nama hari dalam Bahasa Indonesia
 */
function getDayName(dateString: string): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const date = new Date(dateString);
  return days[date.getDay()];
}

/**
 * Mendapatkan jumlah hari dalam bulan
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Mendapatkan sisa hari dalam bulan ini
 */
function getDaysRemainingInMonth(currentDate: Date): number {
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );
  const timeDiff = lastDayOfMonth.getTime() - currentDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Format currency ke Rupiah
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate insights dan rekomendasi berdasarkan data
 */
function generateInsights({
  hasInputToday,
  totalClosing,
  monthlyTargetClosing,
  daysRemaining,
  uniqueDays,
  averageCR,
}: {
  hasInputToday: boolean;
  totalClosing: number;
  monthlyTargetClosing: number;
  daysRemaining: number;
  uniqueDays: number;
  averageCR: number;
}) {
  const insights = [];
  const recommendations = [];

  // Insight: Status input hari ini
  if (!hasInputToday) {
    recommendations.push({
      type: "urgent",
      message: "Anda belum menginput data hari ini",
      action: "Segera input data lead dan closing hari ini",
      priority: "high",
    });
  }

  // Insight: Target closing
  const closingGap = monthlyTargetClosing - totalClosing;
  if (closingGap > 0 && daysRemaining > 0) {
    const dailyTargetNeeded = Math.ceil(closingGap / daysRemaining);
    insights.push({
      type: "target",
      message: `Masih perlu ${closingGap} closing untuk mencapai target bulan ini`,
      detail: `Target harian: ${dailyTargetNeeded} closing/hari`,
    });
  } else if (totalClosing >= monthlyTargetClosing) {
    insights.push({
      type: "success",
      message: "Selamat! Target closing bulan ini telah tercapai! 🎉",
      detail: `Total closing: ${totalClosing} dari target ${monthlyTargetClosing}`,
    });
  }

  // Insight: Konsistensi input
  if (uniqueDays < 15 && daysRemaining > 10) {
    recommendations.push({
      type: "warning",
      message: "Frekuensi input data masih rendah",
      action:
        "Usahakan input data setiap hari untuk monitoring yang lebih baik",
      priority: "medium",
    });
  }

  // Insight: Conversion rate
  if (averageCR < 30 && averageCR > 0) {
    insights.push({
      type: "warning",
      message: `Conversion rate ${averageCR}% masih di bawah rata-rata`,
      detail: "Perlu evaluasi strategi follow up lead",
    });
  } else if (averageCR > 70) {
    insights.push({
      type: "success",
      message: `Conversion rate ${averageCR}% sangat baik!`,
      detail: "Pertahankan strategi yang sudah berjalan",
    });
  }

  return {
    insights,
    recommendations,
    summary:
      recommendations.length > 0
        ? recommendations[0].message
        : "Data Anda baik. Terus pertahankan konsistensi input!",
  };
}

/**
 * Mendapatkan history 7 hari terakhir
 */
function getLast7DaysHistory(monthData: any[], today: string) {
  const last7Days = [];
  const todayDate = new Date(today);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(todayDate);
    date.setDate(todayDate.getDate() - i);
    const dateString = date.toISOString().split("T")[0];

    const data = monthData.find((d) => d.input_date === dateString);

    last7Days.push({
      date: dateString,
      dayName: getDayName(dateString),
      leadMasuk: data?.lead_masuk ?? 0,
      closing: data?.closing ?? 0,
      omset: data?.omset ?? 0,
      hasInput: !!data,
    });
  }

  return last7Days;
}
