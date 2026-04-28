// app/api/stages/form-config/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type FieldType =
  | "text" | "number" | "select" | "textarea" | "boolean" | "file" | "date"
  // Complex sub-form types — UI renders dedicated components for these
  | "customer_selector"   // find existing customer or create new inline
  | "gemstone_array"      // dynamic list of gemstone rows
  | "material_array"      // dynamic list of material_transaction rows
  | "quality_checklist"   // fixed checklist of pass/fail items
  | "certificate_array"   // dynamic list of certificate records
  | "attachment_list"     // list of file uploads with typed file_type
  | "completeness_list"   // fixed checklist for kelengkapan items
  | "packaging_form"      // single packaging_log sub-form
  | "payment_array"       // dynamic list of payment records
  | "delivery_form"       // single delivery sub-form (packing stage)
  | "delivery_update_form"// delivery status update (pengiriman)
  | "handover_form"       // handover log sub-form
  | "confirmation_form"   // customer confirmation sub-form
  | "object";             // generic nested object sub-form

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  // For checklist-type fields: the fixed items to render
  items?: { key: string; label: string }[];
  // For file / attachment_list: allowed file_type values
  allowedFileTypes?: string[];
}

const STAGE_FIELD_CONFIGS: Record<string, FieldConfig[]> = {

  // ── TAHAP 1: PENERIMAAN ORDER ───────────────────────────────────────────────
  penerimaan_order: [
    { name: "customer_id",       label: "Pelanggan",            type: "customer_selector", required: true },
    { name: "product_name",      label: "Nama Produk",          type: "text",     required: true,  placeholder: "Contoh: Cincin Berlian 18K" },
    { name: "target_weight",     label: "Target Berat",         type: "number",   required: true,  unit: "gram", min: 0.01, placeholder: "0.00" },
    { name: "target_karat",      label: "Target Karat",         type: "number",   required: true,  unit: "K", min: 0, max: 24, placeholder: "18" },
    { name: "ring_size",         label: "Ukuran Cincin",        type: "text",     required: false, placeholder: "Contoh: 12" },
    { name: "model_description", label: "Deskripsi Model",      type: "textarea", required: false },
    { name: "engraved_text",     label: "Teks Ukiran",          type: "text",     required: false, placeholder: "Teks yang akan diukir (laser)" },
    {
      name: "delivery_method", label: "Metode Pengambilan", type: "select", required: false,
      options: [
        { value: "pickup_store",      label: "Ambil di Toko" },
        { value: "courier_local",     label: "Kurir Lokal" },
        { value: "courier_intercity", label: "Kurir Antar Kota" },
        { value: "in_house_delivery", label: "Antar ke Rumah" },
        { value: "other",             label: "Lainnya" },
      ],
    },
    { name: "order_date",    label: "Tanggal Order",      type: "date",   required: false },
    { name: "deadline",      label: "Target Selesai",     type: "date",   required: false },
    { name: "total_price",   label: "Total Harga",        type: "number", required: false, unit: "IDR", min: 0 },
    { name: "dp_amount",     label: "Jumlah DP",          type: "number", required: false, unit: "IDR", min: 0 },
    {
      name: "dp_method", label: "Metode Pembayaran DP", type: "select", required: false,
      options: [
        { value: "cash",          label: "Cash" },
        { value: "transfer_bank", label: "Transfer Bank" },
        { value: "qris",          label: "QRIS" },
        { value: "other",         label: "Lainnya" },
      ],
    },
    { name: "dp_reference_no", label: "No. Referensi DP", type: "text",   required: false, placeholder: "Nomor transfer / bukti" },
    { name: "special_notes",   label: "Catatan Khusus",   type: "textarea", required: false },
    { name: "gemstone_list",   label: "Daftar Batu Permata", type: "gemstone_array", required: false },
    {
      name: "form_order_path", label: "Form Order (file)", type: "attachment_list", required: false,
      allowedFileTypes: ["form_order"],
    },
  ],

  // ── TAHAP 3: RACIK BAHAN ────────────────────────────────────────────────────
  racik_bahan: [
    { name: "shrinkage_anticipated", label: "Antisipasi Penyusutan", type: "number", required: false, unit: "gram", min: 0, placeholder: "0.00" },
    { name: "started_at",            label: "Waktu Mulai",          type: "text",   required: false, placeholder: "ISO datetime" },
    {
      name: "material_transactions", label: "Bahan yang Digunakan (Input)", type: "material_array", required: true,
      // hint to UI: default transaction_type = 'input'
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 5: LEBUR BAHAN ────────────────────────────────────────────────────
  lebur_bahan: [
    { name: "temperature_celsius", label: "Suhu Peleburan",  type: "number", required: true,  unit: "°C", min: 800, max: 1200, placeholder: "950" },
    { name: "duration_seconds",    label: "Durasi Lebur",    type: "number", required: true,  unit: "detik", min: 1, placeholder: "900" },
    {
      name: "material_transactions", label: "Hasil Lebur & Penyusutan", type: "material_array", required: true,
      // UI renders rows for transaction_type: output + waste
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 6: PEMBENTUKAN CINCIN ─────────────────────────────────────────────
  pembentukan_cincin: [
    { name: "solder_measurement", label: "Takaran Patri",        type: "number",   required: false, unit: "gram" },
    { name: "solder_position",    label: "Posisi Patri",         type: "text",     required: false, placeholder: "Contoh: bagian bawah" },
    { name: "sanding_stage",      label: "Tahap Pengamplasan",   type: "select",   required: false,
      options: [{ value: "1", label: "Tahap 1" }, { value: "2", label: "Tahap 2" }, { value: "3", label: "Tahap 3" }] },
    {
      name: "material_transactions", label: "Bahan Input / Output / Sisa", type: "material_array", required: true,
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 7: PEMASANGAN PERMATA ─────────────────────────────────────────────
  pemasangan_permata: [
    { name: "gemstone_size",     label: "Ukuran Permata",       type: "text",    required: false, placeholder: "Contoh: 4.5mm" },
    { name: "gemstone_position", label: "Posisi Permata",       type: "text",    required: false },
    { name: "gemstone_spacing",  label: "Jarak Antar Permata",  type: "text",    required: false },
    { name: "gemstone_total_weight", label: "Total Berat Batu Dipasang", type: "number", required: false, unit: "gram" },
    { name: "ultrasonic_cleaned", label: "Ultrasonic Cleaned",  type: "boolean", required: false },
    {
      name: "material_transactions", label: "Bahan Input / Output", type: "material_array", required: true,
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 8: PEMOLESAN ──────────────────────────────────────────────────────
  pemolesan: [
    { name: "ultrasonic_cleaned", label: "Ultrasonic Cleaned", type: "boolean", required: false },
    {
      name: "material_transactions", label: "Bahan Input / Output / Sisa", type: "material_array", required: true,
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 9: QC 1 ───────────────────────────────────────────────────────────
  qc_1: [
    {
      name: "quality_checklist", label: "Checklist QC 1", type: "quality_checklist", required: true,
      items: [
        { key: "physical_diamond_inspection", label: "Inspeksi fisik berlian / batu" },
        { key: "certificate_match",           label: "Sertifikat sesuai batu" },
        { key: "design_match",                label: "Desain sesuai order" },
        { key: "minimum_weight_requirement",  label: "Berat memenuhi syarat minimum (≥ 0.2g target)" },
      ],
    },
    { name: "weight_variance_met", label: "Selisih Berat OK",    type: "boolean", required: true },
    { name: "certificate_logs",    label: "Log Sertifikat",      type: "certificate_array", required: false },
    {
      name: "attachments", label: "Foto QC 1", type: "attachment_list", required: true,
      allowedFileTypes: ["qc1_photo_front", "qc1_photo_side", "qc1_photo_top", "qc1_photo_ruler"],
    },
    { name: "notes", label: "Catatan QC 1", type: "textarea", required: false },
  ],

  // ── TAHAP 10: KONFIRMASI AWAL ───────────────────────────────────────────────
  konfirmasi_awal: [
    { name: "confirmation_form", label: "Konfirmasi Customer", type: "confirmation_form", required: true },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 11: FINISHING ─────────────────────────────────────────────────────
  finishing: [
    { name: "rhodium_specification", label: "Warna Rhodium",     type: "text",    required: false, placeholder: "Contoh: white, yellow, rose" },
    { name: "rhodium_coated",        label: "Rhodium Coating",   type: "boolean", required: false },
    { name: "doff_motif_applied",    label: "Motif Doff Diterapkan", type: "boolean", required: false },
    {
      name: "material_transactions", label: "Bahan Input / Output / Sisa", type: "material_array", required: true,
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 12: LASER ─────────────────────────────────────────────────────────
  laser: [
    { name: "teks_terukir",    label: "Teks / Motif Terukir", type: "text",   required: true,  placeholder: "Teks atau kode motif" },
    {
      name: "posisi_ukir", label: "Posisi Ukiran", type: "select", required: true,
      options: [
        { value: "dalam",   label: "Bagian Dalam" },
        { value: "luar",    label: "Bagian Luar" },
        { value: "samping", label: "Samping" },
      ],
    },
    {
      name: "kedalaman_ukir", label: "Kedalaman Ukiran", type: "select", required: false,
      options: [
        { value: "standard", label: "Standard" },
        { value: "dalam",    label: "Dalam / Deep" },
        { value: "surface",  label: "Surface Only" },
      ],
    },
    {
      name: "attachments", label: "Foto Hasil Laser", type: "attachment_list", required: false,
      allowedFileTypes: ["laser_engraving_photo", "laser_engraving_design"],
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 13: QC 2 ──────────────────────────────────────────────────────────
  qc_2: [
    {
      name: "quality_checklist", label: "Checklist QC 2", type: "quality_checklist", required: true,
      items: [
        { key: "laser_quality",          label: "Kualitas laser / ukiran OK" },
        { key: "finishing_quality",      label: "Kualitas finishing OK" },
        { key: "engraving_verified",     label: "Teks ukiran terverifikasi" },
        { key: "identity_number_verified", label: "Nomor identitas cincin terverifikasi" },
        { key: "shape_match",            label: "Bentuk sesuai order" },
        { key: "final_weight_label",     label: "Label berat final terpasang" },
        { key: "stone_weight_adjusted",  label: "Berat batu disesuaikan (jika > 200mg)" },
      ],
    },
    { name: "weight_adjustment",       label: "Nilai Penyesuaian Berat", type: "number", required: false, unit: "gram" },
    { name: "final_weight_label_printed", label: "Label Berat Final Dicetak", type: "boolean", required: false },
    {
      name: "attachments", label: "Foto QC 2", type: "attachment_list", required: false,
      allowedFileTypes: ["qc2_photo_final", "qc2_photo_custom"],
    },
    { name: "notes", label: "Catatan QC 2", type: "textarea", required: false },
  ],

  // ── TAHAP 15: KELENGKAPAN ───────────────────────────────────────────────────
  kelengkapan: [
    {
      name: "completeness_checklist", label: "Checklist Kelengkapan", type: "completeness_list", required: true,
      items: [
        { key: "ring_certificate", label: "Sertifikat Cincin / Emas" },
        { key: "payment_note",     label: "Nota Pembayaran / Invoice" },
        { key: "warranty_card",    label: "Kartu Garansi" },
      ],
    },
    { name: "packaging_log", label: "Data Packaging",   type: "packaging_form", required: false },
    {
      name: "attachments", label: "Dokumen Kelengkapan", type: "attachment_list", required: false,
      allowedFileTypes: ["ring_certificate", "payment_invoice", "warranty_card"],
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 16: QC 3 ──────────────────────────────────────────────────────────
  qc_3: [
    {
      name: "quality_checklist", label: "Checklist QC 3 (Final)", type: "quality_checklist", required: true,
      items: [
        { key: "final_product_quality",  label: "Kualitas produk final OK" },
        { key: "kelengkapan_complete",   label: "Semua kelengkapan lengkap" },
      ],
    },
    {
      name: "attachments", label: "Foto Produk Jadi", type: "attachment_list", required: false,
      allowedFileTypes: ["qc3_photo_complete"],
    },
    { name: "notes", label: "Catatan QC 3", type: "textarea", required: false },
  ],

  // ── TAHAP 18: PACKING ───────────────────────────────────────────────────────
  packing: [
    {
      name: "attachments", label: "Foto Packing", type: "attachment_list", required: false,
      allowedFileTypes: ["packing_photo"],
    },
    { name: "delivery", label: "Persiapan Pengiriman", type: "delivery_form", required: false },
    { name: "notes",    label: "Catatan",               type: "textarea",     required: false },
  ],

  // ── TAHAP 19: PELUNASAN ─────────────────────────────────────────────────────
  pelunasan: [
    { name: "update_total_price", label: "Total Harga (update)",    type: "number", required: false, unit: "IDR", min: 0 },
    { name: "update_dp_amount",   label: "Jumlah DP Sebelumnya",    type: "number", required: false, unit: "IDR", min: 0 },
    { name: "payments",           label: "Pembayaran",              type: "payment_array", required: true },
    {
      name: "attachments", label: "Bukti Pembayaran", type: "attachment_list", required: false,
      allowedFileTypes: ["payment_proof_dp", "payment_proof_final"],
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],

  // ── TAHAP 20: PENGIRIMAN ────────────────────────────────────────────────────
  pengiriman: [
    { name: "delivery_update", label: "Update Status Pengiriman", type: "delivery_update_form", required: true },
    { name: "handover",        label: "Serah Terima",             type: "handover_form",        required: false },
    { name: "order_update",    label: "Update Data Order",        type: "object",               required: false },
    {
      name: "attachments", label: "Dokumen Pengiriman", type: "attachment_list", required: false,
      allowedFileTypes: ["handover_form", "delivery_receipt", "courier_receipt", "proof_of_delivery"],
    },
    { name: "notes", label: "Catatan", type: "textarea", required: false },
  ],
};

const STAGE_LABELS: Record<string, string> = {
  penerimaan_order:    "Penerimaan Order",
  racik_bahan:         "Racik Bahan",
  lebur_bahan:         "Lebur Bahan",
  pembentukan_cincin:  "Pembentukan Cincin",
  pemasangan_permata:  "Pemasangan Permata",
  pemolesan:           "Pemolesan",
  qc_1:                "Quality Control 1",
  konfirmasi_awal:     "Konfirmasi Awal",
  finishing:           "Finishing",
  laser:               "Laser Engraving",
  qc_2:                "Quality Control 2",
  kelengkapan:         "Kelengkapan",
  qc_3:                "Quality Control 3",
  packing:             "Packing",
  pelunasan:           "Pelunasan & Pembayaran",
  pengiriman:          "Pengiriman & Handover",
};

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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    const stage = searchParams.get("stage");

    if (!stage)
      return NextResponse.json({ error: "stage wajib diisi" }, { status: 400 });

    if (!orderId && stage !== "penerimaan_order")
      return NextResponse.json({ error: "order_id wajib diisi" }, { status: 400 });

    const admin = createAdminClient();

    const { data: userData } = await admin
      .from("users")
      .select("id, full_name, role:roles!users_role_id_fkey(id, name, role_group, allowed_stages, permissions)")
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!userData)
      return NextResponse.json({ error: "Data user tidak ditemukan" }, { status: 404 });

    const roleName: string = (userData.role as any)?.name ?? "";
    const roleGroup: string = (userData.role as any)?.role_group ?? "";
    const allowedStages: string[] = (userData.role as any)?.allowed_stages ?? [];
    const permissions = (userData.role as any)?.permissions ?? {};
    const roleStages = ROLE_STAGE_ACCESS[roleName];
    const workshopGroups = ["production", "operational", "management"];

    const hasAccess =
      roleName === "superadmin" ||
      (allowedStages.length > 0
        ? allowedStages.includes(stage)
        : roleStages
          ? roleStages.includes(stage)
          : workshopGroups.includes(roleGroup));

    if (!hasAccess)
      return NextResponse.json({ error: "Anda tidak memiliki akses ke tahap ini" }, { status: 403 });

    let order: { id: string; order_number: string; product_name: string; current_stage: string; engraved_text?: string | null } | null = null;
    let existingResult: { data: Record<string, unknown> } | null = null;

    if (orderId && stage !== "penerimaan_order") {
      const { data: fetchedOrder, error: orderError } = await admin
        .from("orders")
        .select("id, order_number, product_name, current_stage, engraved_text")
        .eq("id", orderId)
        .is("deleted_at", null)
        .single();

      if (orderError || !fetchedOrder)
        return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

      order = fetchedOrder;

      const { data: lastResult } = await admin
        .from("stage_results")
        .select("data")
        .eq("order_id", orderId)
        .eq("stage", stage)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      existingResult = lastResult;
    }

    // Pre-fill laser teks_terukir from order
    let prefillData: Record<string, unknown> = existingResult?.data ?? {};
    if (stage === "laser" && order?.engraved_text && !prefillData.teks_terukir) {
      prefillData = { ...prefillData, teks_terukir: order.engraved_text };
    }

    const fields = STAGE_FIELD_CONFIGS[stage] ?? [];

    return NextResponse.json({
      success: true,
      data: {
        config: {
          stage,
          stage_label: STAGE_LABELS[stage] ?? stage,
          order_number: order?.order_number ?? null,
          product_name: order?.product_name ?? null,
          fields,
          permissions: {
            can_submit: permissions.can_insert ?? false,
            can_edit: (permissions.can_insert ?? false) || (permissions.can_update ?? false),
          },
          current_data: prefillData,
        },
        user: { name: userData.full_name, role: roleName },
      },
    });
  } catch (error) {
    console.error("[Form Config] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
