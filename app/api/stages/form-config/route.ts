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
  | "quality_checklist";

export type StageType =
  | "done"
  | "select_action"
  | "quality_checklist"
  | "packing"
  | "delivery";

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  items?: { key: string; label: string }[];
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
        name: "craftsman_type",
        label: "Pengerjaan Oleh",
        type: "select",
        required: true,
        options: [
          { value: "internal", label: "Tukang Internal" },
          { value: "external", label: "Tukang Eksternal" },
        ],
      },
      NOTES,
    ],
  },

  pemasangan_permata: {
    label: "Micro Setting",
    stageType: "done",
    fields: [NOTES],
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
          { key: "bentuk_sesuai", label: "Bentuk cincin sesuai order" },
          { key: "ukuran_sesuai", label: "Ukuran cincin sesuai" },
          { key: "berat_minimum", label: "Berat memenuhi syarat minimum" },
          {
            key: "permukaan_bersih",
            label: "Permukaan bersih, tidak ada cacat",
          },
          { key: "solder_rapi", label: "Sambungan / patri rapi dan kuat" },
        ],
      },
      { ...NOTES, placeholder: "Temuan QC, catatan perbaikan..." },
    ],
  },

  laser: {
    label: "Laser Engraving",
    stageType: "done",
    fields: [NOTES],
  },

  finishing: {
    label: "Finishing",
    stageType: "done",
    fields: [NOTES],
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
          {
            key: "kualitas_laser",
            label: "Hasil laser / ukiran bersih dan terbaca",
          },
          {
            key: "kualitas_finishing",
            label: "Finishing merata, tidak ada bercak",
          },
          {
            key: "teks_ukiran_benar",
            label: "Teks ukiran sesuai order (cek ejaan)",
          },
          { key: "bentuk_final_sesuai", label: "Bentuk final sesuai order" },
          { key: "produk_bersih", label: "Produk bersih, siap serah terima" },
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
          { value: "delivered", label: "Sudah Sampai ke Pelanggan — Selesai" },
          { value: "dispatched", label: "Dalam Perjalanan" },
          { value: "failed", label: "Gagal Dikirim" },
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
         acara, kebutuhan_acara, alat_ukur,
         ukuran_pria, ukiran_pria, jenis_cincin_pria, keterangan_pria, reference_image_pria_url,
         ukuran_wanita, ukiran_wanita, jenis_cincin_wanita, keterangan_wanita, reference_image_wanita_url,
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
        keterangan: order.keterangan_pria ?? null,
        reference_image_url: order.reference_image_pria_url ?? null,
      },
      wanita: {
        ukuran: order.ukuran_wanita ?? null,
        ukiran: order.ukiran_wanita ?? null,
        jenis_cincin: order.jenis_cincin_wanita ?? null,
        keterangan: order.keterangan_wanita ?? null,
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
          fields: stageConfig?.fields ?? [],
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
