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
      .from("stage_history")
      .select(`id, order_id, stage, attempt_number, note, data, created_at,
        legacy_orders!stage_history_order_id_fkey ( kode_order, nama )`, { count: "exact" })
      .eq("changed_by", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (q) {
      query = query.or(
        `legacy_orders.kode_order.ilike.%${q}%,stage.ilike.%${q}%`,
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
      attempt_number: (r as { attempt_number?: number }).attempt_number ?? 1,
      notes: (r as { note?: string }).note ?? null,
      data: r.data ?? null,
      finished_at: r.created_at,
      order_number: (r.legacy_orders as unknown as { kode_order: string; nama: string })?.kode_order ?? "—",
      customer_name: (r.legacy_orders as unknown as { kode_order: string; nama: string })?.nama ?? "—",
    }));

    return NextResponse.json({ success: true, data: history, total: total ?? 0 });
  } catch (err) {
    console.error("[Worker History] Unexpected:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
