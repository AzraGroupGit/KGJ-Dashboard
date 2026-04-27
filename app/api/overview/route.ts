// app/api/overview/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function detectModule(entityType: string): "bms" | "oprprd" {
  const bmsTypes = new Set([
    "cs_inputs",
    "marketing_inputs",
    "branches",
    "reports",
    "users",
    "roles",
  ]);
  return bmsTypes.has(entityType) ? "bms" : "oprprd";
}

function formatActivity(action: string, userName: string): string {
  const map: Record<string, string> = {
    CREATE_USER: `${userName} membuat akun user baru`,
    UPDATE_USER: `${userName} memperbarui data user`,
    DELETE_USER: `${userName} menghapus akun user`,
    CREATE_BRANCH: `${userName} menambahkan cabang baru`,
    UPDATE_BRANCH: `${userName} memperbarui data cabang`,
    CREATE_REPORT: `${userName} membuat laporan baru`,
    DELETE_REPORT: `${userName} menghapus laporan`,
    CS_INPUT: `${userName} menginput data leads & closing`,
    MKT_INPUT: `${userName} menginput data marketing`,
    LOGIN: `${userName} masuk ke sistem`,
  };
  return (
    map[action] ??
    `${userName} melakukan ${action.toLowerCase().replace(/_/g, " ")}`
  );
}

/**
 * GET /api/superadmin/snapshot
 * Query params: date (YYYY-MM-DD, default: today)
 * Returns today's BMS snapshot + recent activity + auto-generated alerts.
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
      .select("role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if ((currentUser?.role as any)?.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr =
      searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const prev = prevDay(dateStr);

    // Fetch in parallel: today + yesterday CS inputs + recent activity
    const [todayRes, prevRes, activityRes] = await Promise.all([
      supabase
        .from("cs_inputs")
        .select("lead_masuk, closing, omset")
        .eq("input_date", dateStr),
      supabase
        .from("cs_inputs")
        .select("lead_masuk, closing, omset")
        .eq("input_date", prev),
      supabase
        .from("activity_logs")
        .select(
          `
          id, action, entity_type, created_at,
          users!activity_logs_user_id_fkey (full_name, email)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const todayCS = todayRes.data ?? [];
    const prevCS = prevRes.data ?? [];

    // ── BMS metrics ──────────────────────────────────────────────────────────
    const lead_masuk = todayCS.reduce((s, r) => s + (r.lead_masuk ?? 0), 0);
    const closing = todayCS.reduce((s, r) => s + (r.closing ?? 0), 0);
    const omset = todayCS.reduce((s, r) => s + (r.omset ?? 0), 0);
    const cr = lead_masuk > 0 ? (closing / lead_masuk) * 100 : 0;

    const prevLead = prevCS.reduce((s, r) => s + (r.lead_masuk ?? 0), 0);
    const prevClosing = prevCS.reduce((s, r) => s + (r.closing ?? 0), 0);

    // ── Activity ─────────────────────────────────────────────────────────────
    const activity = (activityRes.data ?? []).map((row: any) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users;
      const name = u?.full_name ?? u?.email?.split("@")[0] ?? "Sistem";
      return {
        id: row.id,
        time: new Date(row.created_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        module: detectModule(row.entity_type ?? ""),
        message: formatActivity(row.action, name),
      };
    });

    // ── Auto-generated alerts ─────────────────────────────────────────────────
    const alerts: {
      id: string;
      level: "warning" | "danger" | "info";
      message: string;
    }[] = [];

    if (lead_masuk === 0) {
      alerts.push({
        id: "no-lead",
        level: "info",
        message: "Belum ada data lead masuk dari CS hari ini.",
      });
    } else if (cr < 15) {
      alerts.push({
        id: "cr-low",
        level: "warning",
        message: `Conversion rate hari ini ${cr.toFixed(1)}% — di bawah ambang batas minimal 15%.`,
      });
    } else if (cr >= 30) {
      alerts.push({
        id: "cr-good",
        level: "info",
        message: `Conversion rate hari ini ${cr.toFixed(1)}% — performa sangat baik!`,
      });
    }

    if (closing > prevClosing && prevClosing > 0) {
      alerts.push({
        id: "closing-up",
        level: "info",
        message: `Closing hari ini (${closing}) naik dibanding kemarin (${prevClosing}).`,
      });
    }

    return NextResponse.json({
      bms: {
        lead_masuk,
        closing,
        omset,
        cr: Math.round(cr * 10) / 10,
        lead_delta: lead_masuk - prevLead,
        closing_delta: closing - prevClosing,
      },
      oprprd: {
        produksi: 0,
        target: 0,
        on_time_pct: 0,
        backlog: 0,
      },
      activity,
      alerts,
    });
  } catch (error) {
    console.error("[GET /api/superadmin/snapshot] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
