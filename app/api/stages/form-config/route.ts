// app/api/stages/form-config/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────────────

type FieldType =
  | "text"
  | "number"
  | "select"
  | "textarea"
  | "boolean"
  | "quality_checklist"
  | "multi_select"
  | "file"
  | "date";

export type StageType =
  | "done"
  | "select_action"
  | "quality_checklist"
  | "packing"
  | "delivery"
  | "date";

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: { value: string; label: string; group?: string }[];
  placeholder?: string;
  items?: { key: string; label: string; reworkStage?: string }[];
  accept?: string;
  maxSize?: number;
}

interface StageConfig {
  label: string;
  stageType: StageType;
  fields: FieldConfig[];
}

// ── Stage configs ──────────────────────────────────────────────────────────────

const NOTES: FieldConfig = {
  name: "notes",
  label: "Catatan",
  type: "textarea",
  required: false,
};

const STAGE_CONFIGS: Record<string, StageConfig> = {
  racik_bahan: {
    label: "Persiapan Bahan",
    stageType: "done",
    fields: [NOTES],
  },

  lebur_bahan: {
    label: "Lebur Bahan",
    stageType: "done",
    fields: [NOTES],
  },

  cek_kadar: {
    label: "Cek Kadar",
    stageType: "select_action",
    fields: [
      {
        name: "result",
        label: "Hasil Cek Kadar",
        type: "select",
        required: true,
        options: [
          { value: "lolos", label: "Lolos — Lanjut ke tahap berikutnya" },
          {
            value: "tidak_lolos",
            label: "Tidak Lolos — Kembali ke Lebur Bahan",
          },
        ],
      },
      { ...NOTES, placeholder: "Keterangan hasil cek kadar..." },
    ],
  },

  pembentukan_cincin: {
    label: "Pembentukan Cincin",
    stageType: "select_action",
    fields: [
      {
        name: "tukang",
        label: "Tukang",
        type: "select",
        required: false,
        options: [
          { value: "PR", label: "PR" },
          { value: "RZ", label: "RZ" },
          { value: "NR", label: "NR" },
          { value: "ZG", label: "ZG" },
          { value: "BG", label: "BG" },
          { value: "DI", label: "DI" },
          { value: "IS", label: "IS" },
          { value: "WK", label: "WK" },
          { value: "AN", label: "AN" },
        ],
      },
      NOTES,
    ],
  },

  pemasangan_permata: {
    label: "Micro Setting",
    stageType: "select_action",
    fields: [
      {
        name: "tukang",
        label: "Tukang",
        type: "select",
        required: false,
        options: [
          { value: "AL", label: "AL" },
          { value: "AG", label: "AG" },
          { value: "YR", label: "YR" },
          { value: "RN", label: "RN" },
          { value: "UD", label: "UD" },
        ],
      },
      NOTES,
    ],
  },

  pemolesan: {
    label: "Pemolesan Awal",
    stageType: "done",
    fields: [NOTES],
  },

  qc_1: {
    label: "Quality Control Awal",
    stageType: "quality_checklist",
    fields: [
      {
        name: "quality_checklist",
        label: "Checklist QC Awal",
        type: "quality_checklist",
        required: true,
        items: [
          { key: "bentuk_sesuai", label: "Bentuk cincin sesuai order", reworkStage: "pembentukan_cincin" },
          { key: "ukuran_sesuai", label: "Ukuran cincin sesuai", reworkStage: "pembentukan_cincin" },
          { key: "berat_minimum", label: "Berat memenuhi syarat minimum", reworkStage: "pembentukan_cincin" },
          { key: "solder_rapi", label: "Sambungan / patri rapi dan kuat", reworkStage: "pembentukan_cincin" },
          { key: "permukaan_bersih", label: "Permukaan bersih, tidak ada cacat", reworkStage: "pemolesan" },
          { key: "pemasangan_permata", label: "Pemasangan permata sesuai atau belum?", reworkStage: "pemasangan_permata" },
          { key: "cek_kadar", label: "Cek kadar sudah sesuai atau belum?", reworkStage: "cek_kadar" },
          { key: "sertifikat_berlian", label: "Sertifikat berlian tersedia", reworkStage: "" },
        ],
      },
      { ...NOTES, placeholder: "Temuan QC, catatan perbaikan..." },
    ],
  },

  laser: {
    label: "Laser Engraving",
    stageType: "select_action",
    fields: [
      {
        name: "tukang_batik",
        label: "Tukang Laser Batik",
        type: "select",
        required: false,
        options: [],
      },
      {
        name: "tukang_nama",
        label: "Tukang Laser Nama",
        type: "select",
        required: false,
        options: [],
      },
      {
        name: "model_nusantara",
        label: "Model Nusantara",
        type: "multi_select",
        required: false,
        options: [
          { value: "kawung_nj001", label: "Kawung NJ001", group: "Jawa (NJ)" },
          { value: "kawung_nj002", label: "Kawung NJ002", group: "Jawa (NJ)" },
          { value: "mega_mendung_nj003", label: "Mega Mendung NJ003", group: "Jawa (NJ)" },
          { value: "kawung_nj004", label: "Kawung NJ004", group: "Jawa (NJ)" },
          { value: "kawung_nj005", label: "Kawung NJ005", group: "Jawa (NJ)" },
          { value: "sidomukti_nj007", label: "Sidomukti NJ007", group: "Jawa (NJ)" },
          { value: "truntum_nj008", label: "Truntum NJ008", group: "Jawa (NJ)" },
          { value: "dayak_perisai_nk001", label: "Dayak Perisai NK001", group: "Kalimantan (NK)" },
          { value: "tengkawak_ampiek_nk002", label: "Tengkawak Ampiek NK002", group: "Kalimantan (NK)" },
          { value: "dayak_perisai_nk003", label: "Dayak Perisai NK003", group: "Kalimantan (NK)" },
          { value: "tidayu_nk004", label: "Tidayu NK004", group: "Kalimantan (NK)" },
          { value: "jagatan_pisang_nb001", label: "Jagatan Pisang NB001", group: "Bali & Nusa Tenggara (NB)" },
          { value: "sabuk_prada_nb002", label: "Sabuk Prada NB002", group: "Bali & Nusa Tenggara (NB)" },
          { value: "batik_bunga_bali_nb003", label: "Batik Bunga Bali NB003", group: "Bali & Nusa Tenggara (NB)" },
          { value: "kamoro_np001", label: "Kamoro NP001", group: "Papua (NP)" },
          { value: "batik_asmat_np002", label: "Batik Asmat NP002", group: "Papua (NP)" },
          { value: "motif_cendrawasih_np003", label: "Motif Cendrawasih NP003", group: "Papua (NP)" },
          { value: "motif_sentani_np004", label: "Motif Sentani NP004", group: "Papua (NP)" },
          { value: "biak_np005", label: "Biak NP005", group: "Papua (NP)" },
          { value: "bunga_melur_ns001", label: "Bunga Melur NS001", group: "Sumatera (NS)" },
          { value: "pucuak_labuar_ns002", label: "Pucuak Labuar NS002", group: "Sumatera (NS)" },
          { value: "naga_besaung_ns003", label: "Naga Besaung NS003", group: "Sumatera (NS)" },
          { value: "ulos_ragi_hotang_ns004", label: "Ulos Ragi Hotang NS004", group: "Sumatera (NS)" },
          { value: "tapis_lampung_ns005", label: "Tapis Lampung NS005", group: "Sumatera (NS)" },
        ],
      },
      NOTES,
    ],
  },

  finishing: {
    label: "Finishing",
    stageType: "select_action",
    fields: [
      {
        name: "tukang",
        label: "Tukang",
        type: "select",
        required: false,
        options: [
          { value: "EF", label: "EF" },
          { value: "RA", label: "RA" },
          { value: "DO", label: "DO" },
          { value: "RD", label: "RD" },
        ],
      },
      NOTES,
    ],
  },

  qc_2: {
    label: "Quality Control Akhir",
    stageType: "quality_checklist",
    fields: [
      {
        name: "quality_checklist",
        label: "Checklist QC Akhir",
        type: "quality_checklist",
        required: true,
        items: [
          { key: "kualitas_laser", label: "Hasil laser / ukiran bersih dan terbaca", reworkStage: "finishing" },
          { key: "kualitas_finishing", label: "Finishing merata, tidak ada bercak", reworkStage: "finishing" },
          { key: "teks_ukiran_benar", label: "Teks ukiran sesuai order (cek ejaan)", reworkStage: "finishing" },
          { key: "bentuk_final_sesuai", label: "Bentuk final sesuai order", reworkStage: "finishing" },
          { key: "produk_bersih", label: "Produk bersih, siap serah terima", reworkStage: "pembentukan_cincin" },
          { key: "permata_sesuai_bentuk", label: "Permata sesuai bentuk", reworkStage: "" },
        ],
      },
      { ...NOTES, placeholder: "Temuan QC akhir..." },
    ],
  },

  konfirmasi: {
    label: "Konfirmasi Customer Care",
    stageType: "select_action",
    fields: [
      {
        name: "result",
        label: "Hasil Konfirmasi",
        type: "select",
        required: true,
        options: [
          { value: "approved", label: "Disetujui — Lanjut ke Packing" },
          {
            value: "not_approved",
            label: "Tidak Disetujui — Kembali ke QC Akhir",
          },
        ],
      },
      {
        name: "foto_cincin_pria",
        label: "Foto Cincin Pria",
        type: "file",
        required: false,
        accept: "image/jpeg,image/png,image/webp",
        maxSize: 5 * 1024 * 1024,
      },
      {
        name: "foto_cincin_wanita",
        label: "Foto Cincin Wanita",
        type: "file",
        required: false,
        accept: "image/jpeg,image/png,image/webp",
        maxSize: 5 * 1024 * 1024,
      },
      {
        name: "nomor_resi",
        label: "Nomor Resi",
        type: "text",
        required: false,
        placeholder: "Masukkan nomor resi pengiriman",
      },
      {
        name: "tanggal_packing",
        label: "Tanggal Packing",
        type: "date",
        required: false,
        placeholder: "Pilih tanggal packing",
      },
      { ...NOTES, placeholder: "Catatan konfirmasi customer care..." },
    ],
  },

  packing: {
    label: "Packing & Persiapan Kirim",
    stageType: "select_action",
    fields: [
      {
        name: "result",
        label: "Hasil Pengecekan",
        type: "select",
        required: true,
        options: [
          { value: "sesuai", label: "Pesanan Sesuai — Lanjut ke Pengiriman" },
          { value: "belum", label: "Belum Sesuai — Perlu Perbaikan" },
        ],
      },
      { ...NOTES, placeholder: "Catatan packing..." },
    ],
  },

  pengiriman: {
    label: "Pengiriman",
    stageType: "select_action",
    fields: [
      {
        name: "is_delivered",
        label: "Status Pengiriman",
        type: "select",
        required: true,
        options: [
          { value: "sampai_expedisi", label: "Pengiriman sudah sampai di Expedisi" },
          { value: "sampai_store", label: "Pengiriman sudah sampai di Store" },
          { value: "gagal", label: "Pengiriman Gagal" },
        ],
      },
      { ...NOTES, placeholder: "Catatan pengiriman..." },
    ],
  },

};

// ── Role access ────────────────────────────────────────────────────────────────

const GROUP_STAGES: Record<string, Set<string>> = {
  operational: new Set([
    "racik_bahan",
    "qc_1",
    "qc_2",
    "laser",
    "konfirmasi",
    "packing",
    "pengiriman",
  ]),
  production: new Set([
    "lebur_bahan",
    "cek_kadar",
    "pembentukan_cincin",
    "pemasangan_permata",
    "pemolesan",
    "finishing",
  ]),
};

const ROLE_STAGES: Record<string, Set<string>> = {
  operational_supervisor: new Set([
    "approval_penerimaan_order",
    "approval_racik_bahan",
    "approval_qc_1",
    "approval_qc_2",
  ]),
  production_supervisor: new Set(["approval_produksi"]),
  customer_care: new Set(["konfirmasi"]),
};

function hasAccess(
  roleName: string,
  roleGroup: string,
  allowedStages: string[],
  stage: string,
): boolean {
  if (roleName === "superadmin") return true;
  if (allowedStages.includes(stage)) return true;
  if (ROLE_STAGES[roleName]?.has(stage)) return true;
  if (GROUP_STAGES[roleGroup]?.has(stage)) return true;
  if (roleGroup === "management" && stage.startsWith("approval_")) return true;
  return false;
}

// ── Get personnel-backed options ────────────────────────────────────────────────

const TUKANG_STAGES = new Set([
  "pembentukan_cincin",
  "pemasangan_permata",
  "laser",
  "finishing",
]);

async function enrichTukangOptions(
  admin: ReturnType<typeof createAdminClient>,
  stage: string,
  fields: FieldConfig[],
): Promise<FieldConfig[]> {
  if (!TUKANG_STAGES.has(stage)) return fields;

  if (stage === "laser") {
    const [batik, nama] = await Promise.all([
      admin.from("stage_personnel").select("person_code").eq("stage", "laser").eq("sub_type", "batik").order("sort_order"),
      admin.from("stage_personnel").select("person_code").eq("stage", "laser").eq("sub_type", "nama").order("sort_order"),
    ]);

    const toOptions = (data: { person_code: string }[] | null) =>
      data && data.length > 0 ? data.map((p) => ({ value: p.person_code, label: p.person_code })) : null;

    const batikOpts = toOptions(batik.data);
    const namaOpts = toOptions(nama.data);

    return fields.map((f) => {
      if (f.name === "tukang_batik" && batikOpts) return { ...f, options: batikOpts };
      if (f.name === "tukang_nama" && namaOpts) return { ...f, options: namaOpts };
      return f;
    });
  }

  const { data: personnel } = await admin
    .from("stage_personnel")
    .select("person_code")
    .eq("stage", stage)
    .order("sort_order", { ascending: true });

  if (!personnel || personnel.length === 0) return fields;

  const options = personnel.map((p: { person_code: string }) => ({
    value: p.person_code,
    label: p.person_code,
  }));

  return fields.map((f) => {
    if (f.name === "tukang") {
      return { ...f, options };
    }
    return f;
  });
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    const stage = searchParams.get("stage");

    if (!stage)
      return NextResponse.json({ error: "stage wajib diisi" }, { status: 400 });
    if (!orderId)
      return NextResponse.json(
        { error: "order_id wajib diisi" },
        { status: 400 },
      );

    const admin = createAdminClient();

    const { data: userData } = await admin
      .from("users")
      .select(
        "id, full_name, role:roles!users_role_id_fkey(id, name, role_group, allowed_stages, permissions)",
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!userData)
      return NextResponse.json(
        { error: "Data user tidak ditemukan" },
        { status: 404 },
      );

    const roleName: string = (userData.role as any)?.name ?? "";
    const roleGroup: string = (userData.role as any)?.role_group ?? "";
    const allowedStages: string[] =
      (userData.role as any)?.allowed_stages ?? [];
    const permissions = (userData.role as any)?.permissions ?? {};

    if (!hasAccess(roleName, roleGroup, allowedStages, stage)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke tahap ini" },
        { status: 403 },
      );
    }

    const { data: order, error: orderError } = await admin
      .from("cs_orders")
      .select(
        `id, order_number, current_stage, status, deadline,
         customer_name, customer_wa, customer_email, customer_instagram,
         acara, kebutuhan_acara, alat_ukur, gramasi_pria, gramasi_wanita, ukiran_cincin_pria, ukiran_cincin_wanita,
         ukuran_pria, ukiran_pria, jenis_cincin_pria, reference_image_pria_url,
         model_bentuk_pria, microsetting_pria, detail_laser_pria, detail_finishing_pria,
         ukuran_wanita, ukiran_wanita, jenis_cincin_wanita, reference_image_wanita_url,
         model_bentuk_wanita, microsetting_wanita, detail_laser_wanita, detail_finishing_wanita,
         kategori, transfer_ke_bank, jenis_cincin_features, dari_artis_detail,
         font, laser_position, box, pengiriman, alamat_pengiriman,
         harga, dp_amount`,
      )
      .eq("id", orderId)
      .is("deleted_at", null)
      .single();

    if (orderError || !order)
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );

    const { data: lastResult } = await admin
      .from("stage_results")
      .select("data")
      .eq("order_id", orderId)
      .eq("stage", stage)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stageConfig = STAGE_CONFIGS[stage];
    const fields = await enrichTukangOptions(admin, stage, stageConfig?.fields ?? []);

    const workerGroups = ["production", "operational"];
    const canSubmit =
      permissions.can_insert ??
      workerGroups.includes(roleGroup) ??
      roleGroup === "management";
    const canEdit = canSubmit || (permissions.can_update ?? false);

    const workOrder = {
      deadline: order.deadline,
      customer_name: order.customer_name,
      customer_wa: order.customer_wa ?? null,
      customer_email: order.customer_email ?? null,
      acara: order.acara ?? null,
      kebutuhan_acara: order.kebutuhan_acara ?? null,
      kategori: order.kategori ?? null,
      transfer_ke_bank: order.transfer_ke_bank ?? null,
      jenis_cincin_features: order.jenis_cincin_features ?? null,
      dari_artis_detail: order.dari_artis_detail ?? null,
      alat_ukur: order.alat_ukur ?? null,
      gramasi_pria: order.gramasi_pria ?? null,
      gramasi_wanita: order.gramasi_wanita ?? null,
      ukiran_cincin_pria: order.ukiran_cincin_pria ?? null,
      ukiran_cincin_wanita: order.ukiran_cincin_wanita ?? null,
      harga: order.harga ?? null,
      dp_amount: order.dp_amount ?? null,
      pengiriman: order.pengiriman ?? null,
      alamat_pengiriman: order.alamat_pengiriman ?? null,
      box: order.box ?? null,
      font: order.font ?? null,
      laser_position: order.laser_position ?? null,
      pria: {
        ukuran: order.ukuran_pria ?? null,
        ukiran: order.ukiran_pria ?? null,
        jenis_cincin: order.jenis_cincin_pria ?? null,
        model_bentuk: order.model_bentuk_pria ?? null,
        microsetting: order.microsetting_pria ?? null,
        detail_laser: order.detail_laser_pria ?? null,
        detail_finishing: order.detail_finishing_pria ?? null,
        reference_image_url: order.reference_image_pria_url ?? null,
      },
      wanita: {
        ukuran: order.ukuran_wanita ?? null,
        ukiran: order.ukiran_wanita ?? null,
        jenis_cincin: order.jenis_cincin_wanita ?? null,
        model_bentuk: order.model_bentuk_wanita ?? null,
        microsetting: order.microsetting_wanita ?? null,
        detail_laser: order.detail_laser_wanita ?? null,
        detail_finishing: order.detail_finishing_wanita ?? null,
        reference_image_url: order.reference_image_wanita_url ?? null,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        config: {
          stage,
          stage_type: stageConfig?.stageType ?? "done",
          stage_label: stageConfig?.label ?? stage,
          order_number: order.order_number,
          product_name: order.customer_name,
          fields,
          permissions: { can_submit: canSubmit, can_edit: canEdit },
          current_data: lastResult?.data ?? {},
          work_order: workOrder,
        },
        user: { name: userData.full_name, role: roleName },
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
