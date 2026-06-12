// app/api/workshop/orders/route.ts
// Returns cs_orders currently at the authenticated worker's allowed stage(s).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoleProps } from "@/lib/auth/session";


import { createAdminClient } from "@/lib/supabase/admin";
import { STAGE_SEQUENCE } from "@/lib/stages";

const APPROVAL_STAGES = new Set<string>(STAGE_SEQUENCE.filter(s => s.startsWith("approval_")));

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: userData } = await admin
      .from("users")
      .select(
        "id, role:roles!users_role_id_fkey(name, role_group, allowed_stages)",
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!userData)
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );

    const roleName: string = getRoleProps(userData).name;
    const roleGroup: string = getRoleProps(userData).role_group;
    const dbAllowedStages: string[] = getRoleProps(userData).allowed_stages;

    // Resolve which stages this worker can process
    let workerStages: string[];
    if (roleName === "superadmin") {
      workerStages = [];
    } else if (dbAllowedStages.length > 0) {
      workerStages = dbAllowedStages;
    } else if (["production", "operational", "management"].includes(roleGroup)) {
      workerStages = [];
    } else {
      return NextResponse.json(
        { error: "Role tidak memiliki akses ke tahap manapun" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const isSupervisor =
      workerStages.length > 0 &&
      workerStages.some((s) => APPROVAL_STAGES.has(s));

    let query = admin
      .from("cs_orders")
      .select(
        `id, order_number, current_stage, status, deadline, updated_at,
         customer_name, customer_wa`,
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (isSupervisor) {
      query = query.in("status", ["in_progress", "waiting_approval", "rework"]);
    } else {
      query = query.in("status", ["in_progress", "rework"]);
    }

    if (workerStages.length > 0) {
      query = query.in("current_stage", workerStages);
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%`,
      );
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("[GET /api/workshop/orders] Query error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data order" },
        { status: 500 },
      );
    }

    const result = (orders ?? []).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      current_stage: o.current_stage,
      status: o.status,
      deadline: o.deadline,
      updated_at: o.updated_at,
      customer_name: o.customer_name ?? null,
      customer_wa: o.customer_wa ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (err) {
    console.error("[GET /api/workshop/orders] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
