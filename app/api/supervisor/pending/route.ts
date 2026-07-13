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

    // ── 1. legacy orders at an approval stage (via tracking_stages) ───────────
    const { data: trackingRows, error: ordersError } = await admin
      .from("tracking_stages")
      .select(
        `order_id, current_stage, stage_status, updated_at,
         legacy_orders!tracking_stages_order_id_fkey ( id, kode_order, nama, no_hp, email, tgl_order, tgl_selesai, catatan )`,
      )
      .in("current_stage", visibleApprovalStages)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error("[Pending] tracking_stages query error:", ordersError);
      return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }

    type LegacyEmbed = {
      id: string; kode_order: string; nama: string | null; no_hp: string | null;
      email: string | null; tgl_order: string | null; tgl_selesai: string | null; catatan: string | null;
    };
    const pendingOrders = (trackingRows ?? []).map((t) => {
      const lo = (Array.isArray(t.legacy_orders) ? t.legacy_orders[0] : t.legacy_orders) as LegacyEmbed | undefined;
      return {
        id: lo?.id ?? t.order_id,
        order_number: lo?.kode_order ?? "—",
        customer_name: lo?.nama ?? null,
        customer_wa: lo?.no_hp ?? null,
        customer_email: lo?.email ?? null,
        current_stage: t.current_stage,
        updated_at: t.updated_at,
        tgl_order: lo?.tgl_order ?? null,
        deadline: lo?.tgl_selesai ?? null,
        catatan: lo?.catatan ?? null,
      };
    });

    // ── 2. stage_history for non-penerimaan_order approvals ──────────────────
    const orderProductionStageMap: Record<string, string> = {};
    const stageResultOrderIds: string[] = [];

    for (const o of pendingOrders) {
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
        .from("stage_history")
        .select(
          `id, order_id, stage, data, attempt_number, created_at,
           users!stage_history_changed_by_fkey ( full_name, role:roles!users_role_id_fkey(name) )`,
        )
        .in("order_id", stageResultOrderIds)
        .eq("status", "completed")
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
          attempt_number: (r as { attempt_number?: number }).attempt_number ?? 1,
          finished_at: r.created_at,
          user_name: (r.users as any)?.full_name ?? "—",
          user_role: (r.users as any)?.role?.name ?? "—",
        };
      }
    }

    // ── 3. Shape response ──────────────────────────────────────────────────────
    const pending = pendingOrders
      .map((o) => {
        const productionStage =
          APPROVAL_TO_PRODUCTION_STAGE[o.current_stage] ?? o.current_stage;
        const isPenerimaanOrder = productionStage === "penerimaan_order";
        const sr = stageResultMap[o.id] ?? null;

        // work_order: legacy has no ring-spec fields → nulls (UI renders "—")
        const work_order = {
          cs_order_id: o.id,
          cs_order_number: o.order_number,
          customer_name: o.customer_name,
          customer_wa: o.customer_wa ?? null,
          customer_email: o.customer_email ?? null,
          ukuran_pria: null,
          ukiran_pria: null,
          jenis_cincin_pria: null,
          model_bentuk_pria: null,
          microsetting_pria: null,
          detail_laser_pria: null,
          detail_finishing_pria: null,
          ukuran_wanita: null,
          ukiran_wanita: null,
          jenis_cincin_wanita: null,
          model_bentuk_wanita: null,
          microsetting_wanita: null,
          detail_laser_wanita: null,
          detail_finishing_wanita: null,
          font: null,
          laser_position: null,
          acara: null,
          kategori: null,
          transfer_ke_bank: null,
          jenis_cincin_features: null,
          dari_artis_detail: null,
          alat_ukur: null,
          gramasi_pria: null,
          gramasi_wanita: null,
          ukiran_cincin_pria: null,
          ukiran_cincin_wanita: null,
          harga: null,
          dp_amount: null,
          deadline: o.deadline ?? null,
          pengiriman: null,
          alamat_pengiriman: null,
          reference_image_pria_url: null,
          reference_image_wanita_url: null,
        };

        // For penerimaan_order: no stage_result; legacy fields only
        let stageData: Record<string, unknown> | null = null;
        if (isPenerimaanOrder) {
          stageData = {
            customer_name: o.customer_name,
            customer_wa: o.customer_wa,
            customer_email: o.customer_email,
            deadline: o.deadline,
            catatan: o.catatan,
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
            ? "—"
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
