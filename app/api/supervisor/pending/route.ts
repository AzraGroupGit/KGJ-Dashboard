// app/api/supervisor/pending/route.ts — submissions awaiting supervisor approval

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STAGE_LABELS: Record<string, string> = {
  qc_awal: "QC Awal",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Bentuk Cincin",
  pemasangan_permata: "Setting Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  konfirmasi_awal: "Konfirmasi",
  finishing: "Finishing",
  laser: "Laser",
  qc_2: "QC 2",
  pelunasan: "Pelunasan",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  packing: "Packing",
  pengiriman: "Pengiriman",
};

const PRODUCTION_STAGES = new Set([
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "finishing",
]);

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify supervisor
    const { data: profile } = await supabase
      .from("users")
      .select("role:roles!users_role_id_fkey(name)")
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();
    const roleName = (profile?.role as any)?.name;
    if (roleName !== "supervisor" && roleName !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: results, error } = await supabase
      .from("stage_results")
      .select(
        `
        id, order_id, stage, data, started_at, finished_at, attempt_number,
        users!inner ( full_name, role:roles!users_role_id_fkey(name) ),
        orders!inner ( id, order_number, product_name, current_stage, status )
      `,
      )
      .not("finished_at", "is", null)
      .gte("finished_at", since)
      .order("finished_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Pending] Query error:", error);
      return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }

    // Keep only those where stage still matches order's current_stage
    // and supervisor hasn't acted yet
    const pending = (results || [])
      .filter((r: any) => {
        const order = r.orders;
        if (!order) return false;
        if (order.status === "completed" || order.status === "cancelled") return false;
        if (r.stage !== order.current_stage) return false;
        return !r.data?._sv_action; // Not yet approved/rejected
      })
      .map((r: any) => {
        const { _sv_action, _sv_notes, _sv_at, ...cleanData } = r.data || {};
        return {
          id: r.id,
          order_id: r.order_id,
          order_number: r.orders.order_number,
          product_name: r.orders.product_name,
          stage: r.stage,
          stage_label: STAGE_LABELS[r.stage] || r.stage,
          stage_group: PRODUCTION_STAGES.has(r.stage) ? "production" : "operational",
          attempt_number: r.attempt_number,
          worker_name: (r.users as any)?.full_name || "—",
          worker_role: (r.users?.role as any)?.name || "—",
          submitted_at: r.finished_at,
          data: cleanData,
        };
      });

    return NextResponse.json({ success: true, data: pending });
  } catch (error) {
    console.error("[GET /api/supervisor/pending] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
