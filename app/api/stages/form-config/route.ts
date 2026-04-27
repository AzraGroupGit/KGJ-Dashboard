// app/api/stages/form-config/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Definisi field untuk setiap stage
const STAGE_FIELD_CONFIGS: Record<
  string,
  Array<{
    name: string;
    label: string;
    type: "text" | "number" | "select" | "textarea" | "boolean" | "file";
    required: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
    unit?: string;
    min?: number;
    max?: number;
  }>
> = {
  penerimaan_order: [
    {
      name: "product_name",
      label: "Nama Produk",
      type: "text",
      required: true,
      placeholder: "Contoh: Cincin Berlian 18K",
    },
    {
      name: "customer_name",
      label: "Nama Pelanggan",
      type: "text",
      required: true,
      placeholder: "Nama lengkap pelanggan",
    },
    {
      name: "target_weight",
      label: "Target Berat",
      type: "number",
      required: false,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "deadline",
      label: "Target Selesai",
      type: "text",
      required: false,
      placeholder: "Contoh: 2026-05-30",
    },
    {
      name: "notes",
      label: "Catatan / Spesifikasi",
      type: "textarea",
      required: false,
      placeholder: "Detail pesanan, ukuran, keinginan khusus...",
    },
  ],
  qc_awal: [
    {
      name: "berat_actual",
      label: "Berat Actual",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "kondisi_bahan",
      label: "Kondisi Bahan",
      type: "select",
      required: true,
      options: [
        { value: "baik", label: "Baik" },
        { value: "cacat", label: "Cacat" },
        { value: "perlu_perbaikan", label: "Perlu Perbaikan" },
      ],
    },
    {
      name: "catatan_qc",
      label: "Catatan QC",
      type: "textarea",
      required: false,
      placeholder: "Catatan hasil pemeriksaan...",
    },
  ],
  racik_bahan: [
    {
      name: "berat_racikan",
      label: "Berat Racikan",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
    },
    {
      name: "jumlah_komponen",
      label: "Jumlah Komponen",
      type: "number",
      required: true,
      min: 1,
    },
    {
      name: "kode_aloy",
      label: "Kode Aloy",
      type: "text",
      required: true,
      placeholder: "Contoh: ALY-001",
    },
  ],
  lebur_bahan: [
    {
      name: "suhu_lebur",
      label: "Suhu Lebur",
      type: "number",
      required: true,
      unit: "°C",
      min: 800,
      max: 1200,
    },
    {
      name: "durasi_lebur",
      label: "Durasi Lebur",
      type: "number",
      required: true,
      unit: "menit",
      min: 1,
    },
    {
      name: "berat_setelah_lebur",
      label: "Berat Setelah Lebur",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
    },
    { name: "catatan", label: "Catatan", type: "textarea", required: false },
  ],
  pembentukan_cincin: [
    {
      name: "ukuran_cincin",
      label: "Ukuran Cincin",
      type: "text",
      required: true,
      placeholder: "Contoh: 12",
    },
    {
      name: "bentuk",
      label: "Bentuk",
      type: "select",
      required: true,
      options: [
        { value: "bulat", label: "Bulat" },
        { value: "oval", label: "Oval" },
        { value: "kotak", label: "Kotak" },
        { value: "custom", label: "Custom" },
      ],
    },
    {
      name: "presisi_bentuk",
      label: "Presisi Bentuk",
      type: "boolean",
      required: false,
    },
  ],
  pemasangan_permata: [
    {
      name: "jenis_permata",
      label: "Jenis Permata",
      type: "select",
      required: true,
      options: [
        { value: "berlian", label: "Berlian" },
        { value: "safir", label: "Safir" },
        { value: "ruby", label: "Ruby" },
        { value: "zamrud", label: "Zamrud" },
        { value: "lainnya", label: "Lainnya" },
      ],
    },
    {
      name: "jumlah_permata",
      label: "Jumlah Permata",
      type: "number",
      required: true,
      min: 1,
    },
    {
      name: "setting_kuat",
      label: "Setting Kuat",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan_pemasangan",
      label: "Catatan",
      type: "textarea",
      required: false,
    },
  ],
  pemolesan: [
    {
      name: "tingkat_kilau",
      label: "Tingkat Kilau",
      type: "select",
      required: true,
      options: [
        { value: "standard", label: "Standard" },
        { value: "high_gloss", label: "High Gloss" },
        { value: "mirror", label: "Mirror Finish" },
      ],
    },
    {
      name: "durasi_poles",
      label: "Durasi Poles",
      type: "number",
      required: true,
      unit: "menit",
      min: 1,
    },
    {
      name: "hasil_poles",
      label: "Hasil Poles Merata",
      type: "boolean",
      required: true,
    },
  ],
  qc_1: [
    {
      name: "berat_qc1",
      label: "Berat Setelah Produksi",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
    },
    {
      name: "ukuran_akhir",
      label: "Ukuran Akhir",
      type: "text",
      required: true,
    },
    {
      name: "cacat_visual",
      label: "Cacat Visual",
      type: "boolean",
      required: false,
    },
    {
      name: "kesesuaian_model",
      label: "Sesuai Model",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan_qc1",
      label: "Catatan QC 1",
      type: "textarea",
      required: false,
    },
  ],
  finishing: [
    {
      name: "jenis_finishing",
      label: "Jenis Finishing",
      type: "select",
      required: true,
      options: [
        { value: "matte", label: "Matte" },
        { value: "satin", label: "Satin" },
        { value: "polished", label: "Polished" },
        { value: "brushed", label: "Brushed" },
      ],
    },
    {
      name: "durasi_finishing",
      label: "Durasi",
      type: "number",
      required: true,
      unit: "menit",
      min: 1,
    },
    {
      name: "hasil_finishing",
      label: "Hasil Sesuai Standar",
      type: "boolean",
      required: true,
    },
  ],
  laser: [
    {
      name: "teks_terukir",
      label: "Teks Terukir",
      type: "text",
      required: true,
    },
    {
      name: "posisi_ukir",
      label: "Posisi Ukiran",
      type: "select",
      required: true,
      options: [
        { value: "dalam", label: "Bagian Dalam" },
        { value: "luar", label: "Bagian Luar" },
      ],
    },
    {
      name: "kualitas_ukir",
      label: "Kualitas Ukiran Baik",
      type: "boolean",
      required: true,
    },
  ],
  qc_2: [
    {
      name: "berat_final",
      label: "Berat Final",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
    },
    {
      name: "semua_komponen_lengkap",
      label: "Semua Komponen Lengkap",
      type: "boolean",
      required: true,
    },
    {
      name: "sertifikat_sesuai",
      label: "Sertifikat Sesuai",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan_qc2",
      label: "Catatan QC 2",
      type: "textarea",
      required: false,
    },
  ],
  pelunasan: [
    {
      name: "total_biaya",
      label: "Total Biaya",
      type: "number",
      required: true,
      unit: "IDR",
      min: 0,
    },
    {
      name: "metode_bayar",
      label: "Metode Pembayaran",
      type: "select",
      required: true,
      options: [
        { value: "cash", label: "Cash" },
        { value: "transfer", label: "Transfer" },
        { value: "cicilan", label: "Cicilan" },
      ],
    },
    {
      name: "status_lunas",
      label: "Status Lunas",
      type: "boolean",
      required: true,
    },
  ],
  kelengkapan: [
    {
      name: "sertifikat_ready",
      label: "Sertifikat Ready",
      type: "boolean",
      required: true,
    },
    {
      name: "kartu_garansi_ready",
      label: "Kartu Garansi Ready",
      type: "boolean",
      required: true,
    },
    {
      name: "packing_sesuai",
      label: "Packing Sesuai Standar",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan_kelengkapan",
      label: "Catatan",
      type: "textarea",
      required: false,
    },
  ],
  qc_3: [
    {
      name: "final_check_berat",
      label: "Final Check Berat",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
    },
    {
      name: "final_check_visual",
      label: "Final Check Visual OK",
      type: "boolean",
      required: true,
    },
    {
      name: "dokumen_lengkap",
      label: "Dokumen Lengkap",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan_qc3",
      label: "Catatan QC 3",
      type: "textarea",
      required: false,
    },
  ],
  packing: [
    {
      name: "jenis_packing",
      label: "Jenis Packing",
      type: "select",
      required: true,
      options: [
        { value: "standard", label: "Standard Box" },
        { value: "premium", label: "Premium Box" },
        { value: "custom", label: "Custom Request" },
      ],
    },
    {
      name: "ringkas_aman",
      label: "Packing Rapi & Aman",
      type: "boolean",
      required: true,
    },
  ],
  pengiriman: [
    {
      name: "kurir",
      label: "Kurir",
      type: "text",
      required: true,
      placeholder: "Nama jasa kurir",
    },
    { name: "no_resi", label: "Nomor Resi", type: "text", required: false },
    {
      name: "estimasi_tiba",
      label: "Estimasi Tiba",
      type: "text",
      required: true,
      placeholder: "3-5 hari",
    },
    {
      name: "metode_kirim",
      label: "Metode Kirim",
      type: "select",
      required: true,
      options: [
        { value: "pickup", label: "Pickup Store" },
        { value: "courier", label: "Courier" },
        { value: "in_house", label: "In-House Delivery" },
      ],
    },
  ],
};

// Mapping role name → stages the role is allowed to access.
// Used as fallback when allowed_stages is empty in the DB.
const ROLE_STAGE_ACCESS: Record<string, string[]> = {
  // Production
  jewelry_expert_lebur_bahan: ["lebur_bahan"],
  jewelry_expert_pembentukan_awal: ["pembentukan_cincin", "pemolesan"],
  jewelry_expert_finishing: ["finishing"],
  micro_setting: ["pemasangan_permata"],
  // Operational
  racik: ["racik_bahan"],
  qc_1: ["qc_awal", "qc_1"],
  qc_2: ["qc_2"],
  qc_3: ["qc_3"],
  laser: ["laser"],
  packing: ["packing"],
  kelengkapan: ["kelengkapan"],
  after_sales: ["pengiriman"],
  customer_care: ["penerimaan_order", "pelunasan"],
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Cek autentikasi
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil parameter
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    const stage = searchParams.get("stage");

    if (!stage) {
      return NextResponse.json({ error: "stage wajib diisi" }, { status: 400 });
    }

    // penerimaan_order tidak butuh order_id — order belum ada
    if (!orderId && stage !== "penerimaan_order") {
      return NextResponse.json(
        { error: "order_id wajib diisi" },
        { status: 400 },
      );
    }

    // Ambil data user
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        "id, full_name, role:roles!users_role_id_fkey(id, name, role_group, allowed_stages, permissions)",
      )
      .eq("id", authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "Data user tidak ditemukan" },
        { status: 404 },
      );
    }

    // Validasi akses ke stage
    const allowedStages: string[] = (userData.role as any)?.allowed_stages || [];
    const permissions = (userData.role as any)?.permissions || {};
    const roleGroup: string = (userData.role as any)?.role_group ?? "";
    const roleName: string = (userData.role as any)?.name ?? "";

    // Priority: superadmin → DB allowed_stages → role-name map → group fallback
    const workshopGroups = ["production", "operational", "management"];
    const roleStages = ROLE_STAGE_ACCESS[roleName];
    const hasAccess =
      roleName === "superadmin" ||
      (allowedStages.length > 0
        ? allowedStages.includes(stage)
        : roleStages
          ? roleStages.includes(stage)
          : workshopGroups.includes(roleGroup));

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses ke tahap ini",
          user_stages: allowedStages,
        },
        { status: 403 },
      );
    }

    // penerimaan_order: order belum ada, skip lookup
    let order: { id: string; order_number: string; product_name: string; current_stage: string } | null = null;
    let existingResult: { data: Record<string, unknown> } | null = null;

    if (stage !== "penerimaan_order") {
      const { data: fetchedOrder, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, product_name, current_stage")
        .eq("id", orderId)
        .is("deleted_at", null)
        .single();

      if (orderError || !fetchedOrder) {
        return NextResponse.json(
          { error: "Order tidak ditemukan" },
          { status: 404 },
        );
      }

      order = fetchedOrder;

      const { data: lastResult } = await supabase
        .from("stage_results")
        .select("data")
        .eq("order_id", orderId)
        .eq("stage", stage)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      existingResult = lastResult;
    }

    // Dapatkan konfigurasi field untuk stage ini
    const fields = STAGE_FIELD_CONFIGS[stage] || [];

    const config = {
      stage,
      stage_label: STAGE_LABELS[stage] || stage,
      order_number: order?.order_number ?? null,
      product_name: order?.product_name ?? null,
      fields,
      permissions: {
        can_submit: permissions.can_insert || false,
        can_edit: permissions.can_insert || permissions.can_update || false,
        can_reject: false,
      },
      current_data: existingResult?.data || {},
    };

    return NextResponse.json({
      success: true,
      data: {
        config,
        user: {
          name: userData.full_name,
          role: (userData.role as any)?.name,
        },
      },
    });
  } catch (error) {
    console.error("[Form Config] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// Label stage
const STAGE_LABELS: Record<string, string> = {
  penerimaan_order: "Penerimaan Order",
  qc_awal: "QC Awal",
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  qc_1: "QC 1",
  konfirmasi_awal: "Konfirmasi Awal",
  finishing: "Finishing",
  laser: "Laser",
  qc_2: "QC 2",
  pelunasan: "Pelunasan",
  kelengkapan: "Kelengkapan",
  qc_3: "QC 3",
  packing: "Packing",
  pengiriman: "Pengiriman",
};
