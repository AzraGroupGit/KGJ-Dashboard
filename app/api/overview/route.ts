// app/api/overview/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    CREATE_ORDER: `Order baru dibuat`,
    SUBMIT_STAGE: `Stage disubmit`,
    APPROVE_STAGE: `Stage disetujui supervisor`,
    REJECT_STAGE: `Stage ditolak supervisor`,
  };
  return (
    map[action] ??
    `${userName} melakukan ${action.toLowerCase().replace(/_/g, " ")}`
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

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

    // ========== PARALLEL FETCHES ==========
    const [
      todayRes,
      prevRes,
      activityRes,
      activeOrdersRes,
      completedOrdersRes,
      approvalOrdersRes,
    ] = await Promise.all([
      // BMS: today's CS inputs
      supabase
        .from("cs_inputs")
        .select("lead_masuk, closing, omset")
        .eq("input_date", dateStr),

      // BMS: yesterday's CS inputs
      supabase
        .from("cs_inputs")
        .select("lead_masuk, closing, omset")
        .eq("input_date", prev),

      // Activity feed
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

      // OPRPRD: Active production orders
      admin
        .from("orders")
        .select("id", { count: "exact" })
        .in("current_stage", [
          "racik_bahan",
          "lebur_bahan",
          "pembentukan_cincin",
          "pemasangan_permata",
          "pemolesan",
          "qc_1",
          "finishing",
          "laser",
          "qc_2",
          "kelengkapan",
          "qc_3",
          "packing",
        ])
        .not("status", "in", "(completed,cancelled)")
        .is("deleted_at", null),

      // OPRPRD: Completed orders in last 7 days with deadlines
      admin
        .from("orders")
        .select("completed_at, deadline")
        .eq("status", "completed")
        .gte("completed_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .is("deleted_at", null),

      // OPRPRD: Orders waiting approval (backlog)
      admin
        .from("orders")
        .select("id", { count: "exact" })
        .in("current_stage", [
          "approval_penerimaan_order",
          "approval_qc_1",
          "approval_qc_2",
          "approval_qc_3",
          "approval_pelunasan",
        ])
        .is("deleted_at", null),
    ]);

    // ── BMS metrics ──────────────────────────────────────────────────────────
    const todayCS = todayRes.data ?? [];
    const prevCS = prevRes.data ?? [];

    const lead_masuk = todayCS.reduce((s, r) => s + (r.lead_masuk ?? 0), 0);
    const closing = todayCS.reduce((s, r) => s + (r.closing ?? 0), 0);
    const omset = todayCS.reduce((s, r) => s + (r.omset ?? 0), 0);
    const cr = lead_masuk > 0 ? (closing / lead_masuk) * 100 : 0;

    const prevLead = prevCS.reduce((s, r) => s + (r.lead_masuk ?? 0), 0);
    const prevClosing = prevCS.reduce((s, r) => s + (r.closing ?? 0), 0);

    // ── OPRPRD metrics ───────────────────────────────────────────────────────
    const produksi = activeOrdersRes.data?.length ?? activeOrdersRes.count ?? 0;

    // Total active orders as target
    const { count: totalActive } = await admin
      .from("orders")
      .select("id", { count: "exact" })
      .not("status", "in", "(completed,cancelled)")
      .is("deleted_at", null);
    const target = totalActive ?? 0;

    // On-time calculation
    const completedOrders = completedOrdersRes.data || [];
    let onTimeCount = 0;
    completedOrders.forEach((o: any) => {
      if (
        o.deadline &&
        o.completed_at &&
        new Date(o.completed_at) <= new Date(o.deadline)
      ) {
        onTimeCount++;
      }
    });
    const onTimePct =
      completedOrders.length > 0
        ? Math.round((onTimeCount / completedOrders.length) * 100)
        : 0;

    // Backlog
    const backlog =
      approvalOrdersRes.data?.length ?? approvalOrdersRes.count ?? 0;

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
    }

    if (backlog > 5) {
      alerts.push({
        id: "backlog-high",
        level: "warning",
        message: `${backlog} order menunggu persetujuan supervisor — perlu tindakan.`,
      });
    }

    if (onTimePct < 50 && completedOrders.length > 0) {
      alerts.push({
        id: "ontime-low",
        level: "danger",
        message: `On-time delivery rendah: ${onTimePct}% dalam 7 hari terakhir.`,
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
        produksi,
        target,
        on_time_pct: onTimePct,
        backlog,
      },
      activity,
      alerts,
    });
  } catch (error) {
    console.error("[GET /api/overview] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
