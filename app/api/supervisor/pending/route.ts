// app/api/supervisor/pending/route.ts — submissions awaiting supervisor approval

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";
import { STAGE_SEQUENCE, STAGE_GROUP, STAGE_LABELS } from "@/lib/stages";

const APPROVAL_STAGES_ARRAY = STAGE_SEQUENCE.filter(s => s.startsWith("approval_"));

const PRODUCTION_TO_APPROVAL_STAGE: Record<string, string> = {};
STAGE_SEQUENCE.forEach((stage, i) => {
  const next = STAGE_SEQUENCE[i + 1];
  if (next && next.startsWith("approval_")) {
    PRODUCTION_TO_APPROVAL_STAGE[stage] = next;
  }
});

const APPROVAL_TO_PRODUCTION_STAGE: Record<string, string> = Object.fromEntries(
  Object.entries(PRODUCTION_TO_APPROVAL_STAGE).map(([k, v]) => [v, k]),
);

const APPROVAL_STAGES = new Set(Object.values(PRODUCTION_TO_APPROVAL_STAGE));

const SUPERVISOR_VISIBLE_STAGES: Record<string, Set<string>> = {
  operational_supervisor: new Set(APPROVAL_STAGES_ARRAY.filter(s => s !== "approval_produksi")),
  production_supervisor: new Set(["approval_produksi"]),
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("users")
      .select(
        "full_name, role:roles!users_role_id_fkey(name, role_group, allowed_stages)",
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!profile)
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const roleName: string = getRoleProps(profile).name;
    const roleGroup: string = getRoleProps(profile).role_group;
    const allowedStages: string[] = getRoleProps(profile).allowed_stages;

    const isSupervisor =
      roleName === "superadmin" ||
      roleGroup === "management" ||
      allowedStages.some((s) => s.startsWith("approval_"));

    if (!isSupervisor)
      return NextResponse.json(
        { error: "Forbidden: hanya supervisor yang dapat melihat daftar approval" },
        { status: 403 },
      );

    let visibleApprovalStages: string[];
    if (roleName === "superadmin") {
      visibleApprovalStages = [...APPROVAL_STAGES] as string[];
    } else if (SUPERVISOR_VISIBLE_STAGES[roleName]) {
      visibleApprovalStages = [...SUPERVISOR_VISIBLE_STAGES[roleName]];
    } else {
      visibleApprovalStages = [...APPROVAL_STAGES] as string[];
    }

    // ── 1. cs_orders at an approval stage ─────────────────────────────────────
    const { data: pendingOrders, error: ordersError } = await admin
      .from("cs_orders")
      .select(
        `id, order_number, customer_name, customer_wa, customer_email, customer_instagram,
         current_stage, status, updated_at, tgl_order,
         deadline, harga, dp_amount, acara, kebutuhan_acara, alat_ukur, gramasi_pria, gramasi_wanita,
         ukiran_cincin_pria, ukiran_cincin_wanita,
         ukuran_pria, ukiran_pria, jenis_cincin_pria,
         model_bentuk_pria, microsetting_pria, detail_laser_pria, detail_finishing_pria,
         ukuran_wanita, ukiran_wanita, jenis_cincin_wanita,
         model_bentuk_wanita, microsetting_wanita, detail_laser_wanita, detail_finishing_wanita,
         kategori, transfer_ke_bank, jenis_cincin_features, dari_artis_detail,
         font, laser_position, pengiriman, box, alamat_pengiriman,
         reference_image_pria_url, reference_image_wanita_url,
         users!cs_orders_created_by_fkey ( full_name )`,
      )
      .in("status", ["waiting_approval", "in_progress"])
      .in("current_stage", visibleApprovalStages)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error("[Pending] cs_orders query error:", ordersError);
      return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }

    // ── 2. stage_results for non-penerimaan_order approvals ──────────────────
    // stage_results.order_id references cs_orders.id
    const orderProductionStageMap: Record<string, string> = {};
    const stageResultOrderIds: string[] = [];

    for (const o of pendingOrders ?? []) {
      const productionStage = APPROVAL_TO_PRODUCTION_STAGE[o.current_stage];
      if (productionStage && productionStage !== "penerimaan_order") {
        orderProductionStageMap[o.id] = productionStage;
        stageResultOrderIds.push(o.id);
      }
    }

    const stageResultMap: Record<
      string,
      {
        id: string;
        data: Record<string, unknown>;
        attempt_number: number;
        finished_at: string;
        user_name: string;
        user_role: string;
      }
    > = {};

    if (stageResultOrderIds.length > 0) {
      const { data: results } = await admin
        .from("stage_results")
        .select(
          `id, order_id, stage, data, attempt_number, finished_at,
           users!stage_results_user_id_fkey ( full_name, role:roles!users_role_id_fkey(name) )`,
        )
        .in("order_id", stageResultOrderIds)
        .not("finished_at", "is", null)
        .order("attempt_number", { ascending: false });

      const seen = new Set<string>();
      for (const r of results ?? []) {
        const productionStage = orderProductionStageMap[r.order_id];
        if (!productionStage || r.stage !== productionStage) continue;
        if (seen.has(r.order_id)) continue;
        seen.add(r.order_id);

        const {
          _sv_action: _a,
          _sv_notes: _n,
          _sv_at: _t,
          _sv_by: _b,
          ...cleanData
        } = (r.data ?? {}) as Record<string, unknown>

        stageResultMap[r.order_id] = {
          id: r.id,
          data: cleanData,
          attempt_number: r.attempt_number,
          finished_at: r.finished_at,
          user_name: (r.users as any)?.full_name ?? "—",
          user_role: (r.users as any)?.role?.name ?? "—",
        };
      }
    }

    // ── 3. Shape response ──────────────────────────────────────────────────────
    const pending = (pendingOrders ?? [])
      .map((o) => {
        const productionStage =
          APPROVAL_TO_PRODUCTION_STAGE[o.current_stage] ?? o.current_stage;
        const isPenerimaanOrder = productionStage === "penerimaan_order";
        const sr = stageResultMap[o.id] ?? null;

        // work_order comes directly from the cs_order
        const work_order = {
          cs_order_id: o.id,
          cs_order_number: o.order_number,
          customer_name: o.customer_name,
          customer_wa: o.customer_wa ?? null,
          customer_email: o.customer_email ?? null,
          ukuran_pria: o.ukuran_pria ?? null,
          ukiran_pria: o.ukuran_pria ?? null,
          jenis_cincin_pria: o.jenis_cincin_pria ?? null,
          model_bentuk_pria: o.model_bentuk_pria ?? null,
          microsetting_pria: o.microsetting_pria ?? null,
          detail_laser_pria: o.detail_laser_pria ?? null,
          detail_finishing_pria: o.detail_finishing_pria ?? null,
          ukuran_wanita: o.ukuran_wanita ?? null,
          ukiran_wanita: o.ukiran_wanita ?? null,
          jenis_cincin_wanita: o.jenis_cincin_wanita ?? null,
          model_bentuk_wanita: o.model_bentuk_wanita ?? null,
          microsetting_wanita: o.microsetting_wanita ?? null,
          detail_laser_wanita: o.detail_laser_wanita ?? null,
          detail_finishing_wanita: o.detail_finishing_wanita ?? null,
          font: o.font ?? null,
          laser_position: o.laser_position ?? null,
          acara: o.acara ?? null,
          kategori: o.kategori ?? null,
          transfer_ke_bank: o.transfer_ke_bank ?? null,
          jenis_cincin_features: o.jenis_cincin_features ?? null,
          dari_artis_detail: o.dari_artis_detail ?? null,
          alat_ukur: o.alat_ukur ?? null,
          gramasi_pria: o.gramasi_pria ?? null,
          gramasi_wanita: o.gramasi_wanita ?? null,
          ukiran_cincin_pria: o.ukiran_cincin_pria ?? null,
          ukiran_cincin_wanita: o.ukiran_cincin_wanita ?? null,
          harga: o.harga ?? null,
          dp_amount: o.dp_amount ?? null,
          deadline: o.deadline ?? null,
          pengiriman: o.pengiriman ?? null,
          alamat_pengiriman: o.alamat_pengiriman ?? null,
          reference_image_pria_url: o.reference_image_pria_url ?? null,
          reference_image_wanita_url: o.reference_image_wanita_url ?? null,
        };

        // For penerimaan_order: no stage_result; data = cs_order fields
        let stageData: Record<string, unknown> | null = null;
        if (isPenerimaanOrder) {
          stageData = {
            customer_name: o.customer_name,
            customer_wa: o.customer_wa,
            customer_email: o.customer_email,
            deadline: o.deadline,
            harga: o.harga,
            dp_amount: o.dp_amount,
            ukuran_pria: o.ukuran_pria,
            ukiran_pria: o.ukiran_pria,
            jenis_cincin_pria: o.jenis_cincin_pria,
            ukuran_wanita: o.ukuran_wanita,
            ukiran_wanita: o.ukiran_wanita,
            jenis_cincin_wanita: o.jenis_cincin_wanita,
            font: o.font,
            laser_position: o.laser_position,
            acara: o.acara,
            kategori: o.kategori,
            transfer_ke_bank: o.transfer_ke_bank,
            jenis_cincin_features: o.jenis_cincin_features,
            dari_artis_detail: o.dari_artis_detail,
            pengiriman: o.pengiriman,
            alamat_pengiriman: o.alamat_pengiriman,
            reference_image_pria_url: o.reference_image_pria_url,
            reference_image_wanita_url: o.reference_image_wanita_url,
          };
        } else if (sr) {
          stageData = sr.data;
        }

        return {
          order_id: o.id,
          order_number: o.order_number,
          product_name: o.customer_name,
          customer_name: o.customer_name,
          stage: o.current_stage,
          stage_label: STAGE_LABELS[o.current_stage] ?? o.current_stage,
          stage_group: STAGE_GROUP[o.current_stage] ?? "operational",
          production_stage: productionStage,
          waiting_since: o.updated_at,
          stage_result_id: sr?.id ?? null,
          attempt_number: sr?.attempt_number ?? null,
          submitted_at: isPenerimaanOrder
            ? (o.tgl_order ?? o.updated_at)
            : (sr?.finished_at ?? null),
          worker_name: isPenerimaanOrder
            ? ((o.users as any)?.full_name ?? "—")
            : (sr?.user_name ?? "—"),
          worker_role: isPenerimaanOrder
            ? "customer_service"
            : (sr?.user_role ?? "—"),
          data: stageData,
          work_order,
        };
      });

    return NextResponse.json({
      success: true,
      data: pending,
      total: pending.length,
    });
  } catch (error) {
    console.error("[GET /api/supervisor/pending] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
