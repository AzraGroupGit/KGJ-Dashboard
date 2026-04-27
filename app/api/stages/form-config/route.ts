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
    { name: "customer_name", label: "Nama Pelanggan", type: "text", required: true, placeholder: "Nama lengkap" },
    { name: "customer_phone", label: "No. Telepon", type: "text", required: false, placeholder: "08xx-xxxx-xxxx" },
    { name: "customer_wa", label: "No. WhatsApp", type: "text", required: false, placeholder: "08xx-xxxx-xxxx" },
    { name: "product_name", label: "Nama Produk", type: "text", required: true, placeholder: "Contoh: Cincin Berlian 18K" },
    { name: "target_weight", label: "Target Berat", type: "number", required: true, unit: "gram", min: 0.01, placeholder: "0.00" },
    { name: "target_karat", label: "Target Karat", type: "number", required: true, unit: "K", min: 0, max: 24, placeholder: "18" },
    { name: "ring_size", label: "Ukuran Cincin", type: "text", required: false, placeholder: "Contoh: 12" },
    { name: "model_description", label: "Deskripsi Model", type: "textarea", required: false, placeholder: "Detail bentuk, desain, model..." },
    {
      name: "delivery_method",
      label: "Metode Pengambilan",
      type: "select",
      required: false,
      options: [
        { value: "pickup_store", label: "Ambil di Toko" },
        { value: "courier_local", label: "Kurir Lokal" },
        { value: "courier_intercity", label: "Kurir Antar Kota" },
        { value: "in_house_delivery", label: "Antar ke Rumah" },
        { value: "other", label: "Lainnya" },
      ],
    },
    { name: "deadline", label: "Target Selesai", type: "text", required: false, placeholder: "YYYY-MM-DD" },
    { name: "special_notes", label: "Catatan Khusus", type: "textarea", required: false, placeholder: "Keinginan khusus, detail tambahan..." },
  ],
  // ── Operational ──────────────────────────────────────────────────────────────
  qc_awal: [
    {
      name: "berat_actual",
      label: "Berat Aktual Diterima",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "kadar_karat_actual",
      label: "Kadar Karat Aktual",
      type: "number",
      required: false,
      unit: "K",
      min: 0,
      max: 24,
      placeholder: "18",
    },
    {
      name: "kondisi_bahan",
      label: "Kondisi Bahan",
      type: "select",
      required: true,
      options: [
        { value: "baik", label: "Baik" },
        { value: "cacat_minor", label: "Cacat Minor" },
        { value: "cacat_mayor", label: "Cacat Mayor" },
        { value: "perlu_perbaikan", label: "Perlu Perbaikan" },
      ],
    },
    {
      name: "sesuai_spesifikasi",
      label: "Sesuai Spesifikasi Order",
      type: "boolean",
      required: true,
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
      name: "berat_emas_murni",
      label: "Berat Emas Murni",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "berat_campuran",
      label: "Berat Campuran (Aloy)",
      type: "number",
      required: false,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "total_berat_racikan",
      label: "Total Berat Racikan",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "jenis_aloy",
      label: "Jenis / Kode Aloy",
      type: "text",
      required: false,
      placeholder: "Contoh: ALY-18K-Yellow",
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
      placeholder: "Komposisi, keterangan tambahan...",
    },
  ],
  // ── Production ────────────────────────────────────────────────────────────
  lebur_bahan: [
    {
      name: "berat_sebelum_lebur",
      label: "Berat Sebelum Lebur",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "suhu_lebur",
      label: "Suhu Lebur",
      type: "number",
      required: true,
      unit: "°C",
      min: 800,
      max: 1200,
      placeholder: "950",
    },
    {
      name: "durasi_lebur",
      label: "Durasi Lebur",
      type: "number",
      required: true,
      unit: "menit",
      min: 1,
      placeholder: "15",
    },
    {
      name: "berat_setelah_lebur",
      label: "Berat Setelah Lebur",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "kondisi_hasil",
      label: "Kondisi Hasil Lebur",
      type: "select",
      required: true,
      options: [
        { value: "baik", label: "Baik — Siap Dibentuk" },
        { value: "perlu_ulang", label: "Perlu Dilebur Ulang" },
        { value: "ada_inklusi", label: "Ada Inklusi / Gelembung" },
      ],
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
      placeholder: "Kondisi, kendala, catatan proses...",
    },
  ],
  pembentukan_cincin: [
    {
      name: "ukuran_cincin",
      label: "Ukuran Cincin",
      type: "text",
      required: true,
      placeholder: "Contoh: 12 / US 6",
    },
    {
      name: "bentuk",
      label: "Bentuk",
      type: "select",
      required: true,
      options: [
        { value: "bulat", label: "Bulat" },
        { value: "oval", label: "Oval" },
        { value: "kotak", label: "Kotak / Square" },
        { value: "marquise", label: "Marquise" },
        { value: "custom", label: "Custom" },
      ],
    },
    {
      name: "berat_setelah_bentuk",
      label: "Berat Setelah Dibentuk",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "presisi_bentuk",
      label: "Presisi Bentuk Sesuai",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
      placeholder: "Catatan proses pembentukan...",
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
        { value: "ruby", label: "Ruby / Merah Delima" },
        { value: "zamrud", label: "Zamrud / Emerald" },
        { value: "mutiara", label: "Mutiara" },
        { value: "lainnya", label: "Lainnya" },
      ],
    },
    {
      name: "jumlah_permata",
      label: "Jumlah Permata",
      type: "number",
      required: true,
      min: 1,
      placeholder: "1",
    },
    {
      name: "berat_permata_total",
      label: "Total Berat Permata",
      type: "number",
      required: false,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "jenis_setting",
      label: "Jenis Setting",
      type: "select",
      required: false,
      options: [
        { value: "prong", label: "Prong / Cakar" },
        { value: "bezel", label: "Bezel" },
        { value: "pave", label: "Pavé" },
        { value: "channel", label: "Channel" },
        { value: "flush", label: "Flush / Gypsy" },
      ],
    },
    {
      name: "setting_kuat",
      label: "Setting Kuat & Aman",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
      placeholder: "Detail posisi, catatan pemasangan...",
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
        { value: "satin", label: "Satin / Semi-Matt" },
      ],
    },
    {
      name: "durasi_poles",
      label: "Durasi Poles",
      type: "number",
      required: true,
      unit: "menit",
      min: 1,
      placeholder: "20",
    },
    {
      name: "berat_setelah_poles",
      label: "Berat Setelah Poles",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "hasil_poles_merata",
      label: "Hasil Poles Merata & Bersih",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
    },
  ],
  // ── Operational (post-production) ────────────────────────────────────────
  qc_1: [
    {
      name: "berat_qc1",
      label: "Berat Setelah Produksi",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "ukuran_akhir",
      label: "Ukuran Akhir",
      type: "text",
      required: true,
      placeholder: "Contoh: 12 / US 6",
    },
    {
      name: "kesesuaian_model",
      label: "Sesuai Model Pesanan",
      type: "boolean",
      required: true,
    },
    {
      name: "kesesuaian_ukuran",
      label: "Ukuran Sesuai Order",
      type: "boolean",
      required: true,
    },
    {
      name: "ada_cacat_visual",
      label: "Ada Cacat Visual",
      type: "boolean",
      required: false,
    },
    {
      name: "catatan_qc1",
      label: "Catatan QC 1",
      type: "textarea",
      required: false,
      placeholder: "Detail temuan, rekomendasi...",
    },
  ],
  finishing: [
    {
      name: "jenis_finishing",
      label: "Jenis Finishing",
      type: "select",
      required: true,
      options: [
        { value: "polished", label: "Polished / Mengkilap" },
        { value: "matte", label: "Matte / Doff" },
        { value: "satin", label: "Satin / Semi-Matt" },
        { value: "brushed", label: "Brushed / Berpola" },
        { value: "hammered", label: "Hammered / Dipukul" },
      ],
    },
    {
      name: "durasi_finishing",
      label: "Durasi",
      type: "number",
      required: true,
      unit: "menit",
      min: 1,
      placeholder: "30",
    },
    {
      name: "berat_setelah_finishing",
      label: "Berat Setelah Finishing",
      type: "number",
      required: false,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "hasil_finishing",
      label: "Hasil Sesuai Standar",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
    },
  ],
  laser: [
    {
      name: "teks_terukir",
      label: "Teks / Motif Terukir",
      type: "text",
      required: true,
      placeholder: "Teks atau kode motif",
    },
    {
      name: "posisi_ukir",
      label: "Posisi Ukiran",
      type: "select",
      required: true,
      options: [
        { value: "dalam", label: "Bagian Dalam" },
        { value: "luar", label: "Bagian Luar" },
        { value: "samping", label: "Samping" },
      ],
    },
    {
      name: "kedalaman_ukir",
      label: "Kedalaman Ukiran",
      type: "select",
      required: false,
      options: [
        { value: "standard", label: "Standard" },
        { value: "dalam", label: "Dalam / Deep" },
        { value: "surface", label: "Surface Only" },
      ],
    },
    {
      name: "kualitas_ukir",
      label: "Kualitas Ukiran Baik",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
      placeholder: "Detail, posisi khusus, catatan lain...",
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
      placeholder: "0.00",
    },
    {
      name: "kadar_karat_final",
      label: "Kadar Karat Final",
      type: "number",
      required: false,
      unit: "K",
      min: 0,
      max: 24,
      placeholder: "18",
    },
    {
      name: "kesesuaian_model",
      label: "Model Sesuai Pesanan",
      type: "boolean",
      required: true,
    },
    {
      name: "ada_cacat_visual",
      label: "Ada Cacat Visual",
      type: "boolean",
      required: false,
    },
    {
      name: "ukiran_sesuai",
      label: "Ukiran / Laser Sesuai",
      type: "boolean",
      required: true,
    },
    {
      name: "layak_kirim",
      label: "Layak Diteruskan ke Pelunasan",
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
      name: "total_harga",
      label: "Total Harga",
      type: "number",
      required: true,
      unit: "IDR",
      min: 0,
      placeholder: "0",
    },
    {
      name: "dp_sebelumnya",
      label: "DP / Uang Muka Sebelumnya",
      type: "number",
      required: false,
      unit: "IDR",
      min: 0,
      placeholder: "0",
    },
    {
      name: "jumlah_pelunasan",
      label: "Jumlah Pelunasan",
      type: "number",
      required: true,
      unit: "IDR",
      min: 0,
      placeholder: "0",
    },
    {
      name: "metode_bayar",
      label: "Metode Pembayaran",
      type: "select",
      required: true,
      options: [
        { value: "cash", label: "Cash" },
        { value: "transfer_bank", label: "Transfer Bank" },
        { value: "qris", label: "QRIS" },
        { value: "debit", label: "Kartu Debit" },
        { value: "kredit", label: "Kartu Kredit" },
        { value: "cicilan", label: "Cicilan" },
      ],
    },
    {
      name: "nomor_transaksi",
      label: "Nomor Transaksi / Bukti",
      type: "text",
      required: false,
      placeholder: "Nomor referensi transfer atau struk",
    },
    {
      name: "status_lunas",
      label: "Status Lunas",
      type: "boolean",
      required: true,
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
    },
  ],
  kelengkapan: [
    {
      name: "sertifikat_ready",
      label: "Sertifikat Emas / Batu Ready",
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
      name: "kotak_perhiasan_ready",
      label: "Kotak Perhiasan Ready",
      type: "boolean",
      required: true,
    },
    {
      name: "nota_transaksi_ready",
      label: "Nota / Invoice Ready",
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
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
    },
  ],
  qc_3: [
    {
      name: "final_check_berat",
      label: "Berat Final",
      type: "number",
      required: true,
      unit: "gram",
      min: 0,
      placeholder: "0.00",
    },
    {
      name: "berat_sesuai_target",
      label: "Berat Sesuai Target",
      type: "boolean",
      required: true,
    },
    {
      name: "final_check_visual",
      label: "Visual & Kondisi OK",
      type: "boolean",
      required: true,
    },
    {
      name: "dokumen_lengkap",
      label: "Semua Dokumen Lengkap",
      type: "boolean",
      required: true,
    },
    {
      name: "kondisi_packing",
      label: "Kondisi Packing",
      type: "select",
      required: true,
      options: [
        { value: "baik", label: "Baik — Siap Kirim" },
        { value: "perlu_perbaikan", label: "Perlu Diperbaiki" },
      ],
    },
    {
      name: "disetujui_kirim",
      label: "Disetujui untuk Pengiriman",
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
        { value: "custom", label: "Custom / Sesuai Permintaan" },
      ],
    },
    {
      name: "ringkas_aman",
      label: "Packing Rapi & Aman",
      type: "boolean",
      required: true,
    },
    {
      name: "label_terpasang",
      label: "Label / Tag Terpasang",
      type: "boolean",
      required: false,
    },
    {
      name: "foto_produk_diambil",
      label: "Foto Produk Diambil",
      type: "boolean",
      required: false,
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
    },
  ],
  pengiriman: [
    {
      name: "metode_kirim",
      label: "Metode Pengiriman",
      type: "select",
      required: true,
      options: [
        { value: "pickup_store", label: "Ambil di Toko" },
        { value: "courier_local", label: "Kurir Lokal" },
        { value: "courier_intercity", label: "Kurir Antar Kota" },
        { value: "in_house_delivery", label: "Antar ke Rumah" },
        { value: "other", label: "Lainnya" },
      ],
    },
    {
      name: "nama_penerima",
      label: "Nama Penerima",
      type: "text",
      required: false,
      placeholder: "Nama pelanggan atau penerima",
    },
    {
      name: "kurir",
      label: "Nama / Jasa Kurir",
      type: "text",
      required: false,
      placeholder: "Contoh: JNE, SiCepat, Gojek",
    },
    {
      name: "no_resi",
      label: "Nomor Resi",
      type: "text",
      required: false,
      placeholder: "Isi jika menggunakan kurir",
    },
    {
      name: "estimasi_tiba",
      label: "Estimasi Tiba",
      type: "text",
      required: false,
      placeholder: "Contoh: 1-2 hari kerja",
    },
    {
      name: "catatan",
      label: "Catatan",
      type: "textarea",
      required: false,
      placeholder: "Instruksi khusus pengiriman...",
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
