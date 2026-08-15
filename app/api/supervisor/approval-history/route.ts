// app/api/supervisor/approval-history/route.ts — supervisor's own approve/reject history

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";
import { STAGE_LABELS } from "@/lib/stages";
import { getBrandPrefix } from "@/lib/legacy/brands";

async function verifySupervisor(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, full_name, role:roles!users_role_id_fkey(name, role_group, allowed_stages)")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  const roleName: string = getRoleProps(data).name;
  const roleGroup: string = getRoleProps(data).role_group;
  const allowedStages: string[] = getRoleProps(data).allowed_stages;

  const isSupervisor =
    roleName === "superadmin" ||
    roleGroup === "management" ||
    allowedStages.some((s) => s.startsWith("approval_"));

  if (!isSupervisor) return null;
  return data;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supervisor = await verifySupervisor(authUser.id);
    if (!supervisor)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supervisorName: string = (supervisor as { full_name?: string })?.full_name ?? "";

    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand") ?? "all";
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);

    const admin = createAdminClient();

    const { data: history, error } = await admin
      .from("stage_history")
      .select(
        `id, order_id, stage, data, created_at,
         legacy_orders!stage_history_order_id_fkey(kode_order, nama)`,
      )
      .not("data", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (error) {
      console.error("[approval-history] query error:", error.message);
      return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }

    type LegacyEmbed = { kode_order: string; nama: string | null } | { kode_order: string; nama: string | null }[] | null;
    type HistoryRow = {
      id: string; order_id: string; stage: string; created_at: string;
      data: Record<string, unknown> | null;
      legacy_orders?: LegacyEmbed;
    };

    const items = (history as HistoryRow[] ?? [])
      .filter((h) => {
        const d = h.data as Record<string, unknown> | null;
        if (!d) return false;
        const action = d._sv_action;
        if (action !== "approve" && action !== "reject") return false;
        // Only this supervisor's decisions (id match, fallback name match)
        if (d._sv_by_id && d._sv_by_id !== authUser.id) return false;
        if (!d._sv_by_id && d._sv_by !== supervisorName) return false;
        return true;
      })
      .map((h) => {
        const d = h.data as Record<string, unknown>;
        const lo = Array.isArray(h.legacy_orders)
          ? (h.legacy_orders as { kode_order: string; nama: string | null }[])[0]
          : (h.legacy_orders as { kode_order: string; nama: string | null } | null);
        const orderNumber = lo?.kode_order ?? "—";
        return {
          id: h.id,
          order_id: h.order_id,
          order_number: orderNumber,
          customer_name: lo?.nama ?? null,
          stage: h.stage,
          stage_label: STAGE_LABELS[h.stage] ?? h.stage,
          action: d._sv_action as string,
          remarks: (d._sv_notes as string) ?? null,
          decided_by: (d._sv_by as string) ?? null,
          decided_at: (d._sv_at as string) ?? h.created_at,
          brand: getBrandPrefix(orderNumber) ?? "—",
        };
      })
      .filter((o) => brand === "all" || o.brand === brand)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: { items },
      total: items.length,
    });
  } catch (err) {
    console.error("[approval-history] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
