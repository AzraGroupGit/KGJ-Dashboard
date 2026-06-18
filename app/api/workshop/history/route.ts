import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  approval_penerimaan_order: "Approval Penerimaan Order",
  racik_bahan: "Persiapan Bahan",
  approval_racik_bahan: "Approval Persiapan Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  cek_kadar: "Cek Kadar",
  pemasangan_permata: "Micro Setting",
  pemolesan: "Pemolesan Awal",
  qc_1: "Quality Control Awal",
  approval_qc_1: "Approval QC Awal",
  laser: "Laser Engraving",
  finishing: "Finishing",
  approval_produksi: "Approval Produksi",
  qc_2: "Quality Control Akhir",
  approval_qc_2: "Approval QC Akhir",
  konfirmasi: "Konfirmasi Customer Care",
  packing: "Packing & Persiapan Kirim",
  pengiriman: "Pengiriman",
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const admin = createAdminClient();

    let query = admin
      .from("stage_results")
      .select(`id, order_id, stage, attempt_number, notes, data, finished_at,
        cs_orders!stage_results_order_id_fkey ( order_number, customer_name )`)
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false });

    if (q) {
      query = query.or(
        `cs_orders.order_number.ilike.%${q}%,stage.ilike.%${q}%`,
      );
    }

    const { count: total } = await query;
    const { data: results, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("[Worker History] Error:", error);
      return NextResponse.json({ error: "Gagal memuat riwayat" }, { status: 500 });
    }

    const history = (results || []).map((r) => ({
      id: r.id,
      order_id: r.order_id,
      stage: r.stage,
      stage_label: STAGE_LABELS[r.stage] ?? r.stage,
      attempt_number: r.attempt_number,
      notes: r.notes ?? null,
      data: r.data ?? null,
      finished_at: r.finished_at,
      order_number: (r.cs_orders as unknown as Array<{ order_number: string; customer_name: string }>)?.[0]?.order_number ?? "—",
      customer_name: (r.cs_orders as unknown as Array<{ order_number: string; customer_name: string }>)?.[0]?.customer_name ?? "—",
    }));

    return NextResponse.json({ success: true, data: history, total: total ?? 0 });
  } catch (err) {
    console.error("[Worker History] Unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
