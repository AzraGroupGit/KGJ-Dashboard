// app/api/workshop/orders/route.ts
// Returns orders currently at the authenticated worker's allowed stage(s).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLE_STAGE_ACCESS: Record<string, string[]> = {
  jewelry_expert_lebur_bahan:      ["lebur_bahan"],
  jewelry_expert_pembentukan_awal: ["pembentukan_cincin", "pemolesan"],
  jewelry_expert_finishing:        ["finishing", "pemolesan"],
  micro_setting:                   ["pemasangan_permata"],
  racik:                           ["racik_bahan"],
  qc_1:                            ["qc_1"],
  qc_2:                            ["qc_2"],
  qc_3:                            ["qc_3"],
  laser:                           ["laser"],
  packing:                         ["packing"],
  kelengkapan:                     ["kelengkapan"],
  after_sales:                     ["pengiriman"],
  customer_care:                   ["penerimaan_order", "konfirmasi_awal", "pelunasan"],
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: userData } = await admin
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name, role_group, allowed_stages)")
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!userData)
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const roleName: string = (userData.role as any)?.name ?? "";
    const roleGroup: string = (userData.role as any)?.role_group ?? "";
    const dbAllowedStages: string[] = (userData.role as any)?.allowed_stages ?? [];

    // Resolve which stages this worker can process
    let workerStages: string[];
    if (roleName === "superadmin") {
      // superadmin sees everything — return early with broader query
      workerStages = [];
    } else if (dbAllowedStages.length > 0) {
      workerStages = dbAllowedStages;
    } else if (ROLE_STAGE_ACCESS[roleName]) {
      workerStages = ROLE_STAGE_ACCESS[roleName];
    } else if (["production", "operational", "management"].includes(roleGroup)) {
      workerStages = [];
    } else {
      return NextResponse.json({ error: "Role tidak memiliki akses ke tahap manapun" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    let query = admin
      .from("orders")
      .select(`
        id, order_number, product_name, current_stage, status,
        target_weight, target_karat, deadline, updated_at,
        customers!orders_customer_id_fkey ( name, phone )
      `)
      .is("deleted_at", null)
      .in("status", ["in_progress", "rework"])
      .order("updated_at", { ascending: false })
      .limit(limit);

    // Filter to worker's stages (empty array = superadmin, no filter)
    if (workerStages.length > 0) {
      query = query.in("current_stage", workerStages);
    }

    // Optional text search on order_number or product_name
    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,product_name.ilike.%${search}%`,
      );
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("[GET /api/workshop/orders] Query error:", error);
      return NextResponse.json({ error: "Gagal mengambil data order" }, { status: 500 });
    }

    const result = (orders ?? []).map((o: any) => ({
      id:            o.id,
      order_number:  o.order_number,
      product_name:  o.product_name,
      current_stage: o.current_stage,
      status:        o.status,
      target_weight: o.target_weight,
      target_karat:  o.target_karat,
      deadline:      o.deadline,
      updated_at:    o.updated_at,
      customer_name: o.customers?.name ?? null,
      customer_phone: o.customers?.phone ?? null,
    }));

    return NextResponse.json({ success: true, data: result, total: result.length });
  } catch (err) {
    console.error("[GET /api/workshop/orders] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
