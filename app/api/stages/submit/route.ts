// app/api/stages/submit/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Stage sequence ─────────────────────────────────────────────────────────────

const STAGE_SEQUENCE = [
  "penerimaan_order",
  "approval_penerimaan_order",
  "racik_bahan",
  "approval_racik_bahan",
  "lebur_bahan",
  "cek_kadar",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "approval_qc_1",
  "laser",
  "finishing",
  "approval_produksi",
  "qc_2",
  "approval_qc_2",
  "konfirmasi",
  "packing",
  "pengiriman",
  "selesai",
] as const;

// Stages that need supervisor approval before the next working stage
const APPROVAL_GATE_MAP: Record<string, string> = {
  racik_bahan: "approval_racik_bahan",
  qc_1: "approval_qc_1",
  finishing: "approval_produksi",
  qc_2: "approval_qc_2",
};

// Stages submittable by workers (approval stages go via /api/supervisor/approve)
const WORKER_STAGES = new Set([
  "racik_bahan",
  "lebur_bahan",
  "cek_kadar",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "laser",
  "finishing",
  "qc_2",
  "konfirmasi",
  "packing",
  "pengiriman",
]);

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
  return false;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getAttemptNumber(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  stage: string,
): Promise<number> {
  const { data } = await admin
    .from("stage_results")
    .select("attempt_number")
    .eq("order_id", orderId)
    .eq("stage", stage)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.attempt_number ?? 0) + 1;
}

function nextInSequence(stage: string): string | null {
  const idx = (STAGE_SEQUENCE as readonly string[]).indexOf(stage);
  return idx >= 0 && idx < STAGE_SEQUENCE.length - 1
    ? (STAGE_SEQUENCE as readonly string[])[idx + 1]
    : null;
}

function prevInSequence(stage: string): string | null {
  const idx = (STAGE_SEQUENCE as readonly string[]).indexOf(stage);
  return idx > 0 ? (STAGE_SEQUENCE as readonly string[])[idx - 1] : null;
}

async function advanceOrder(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  fromStage: string,
  toStage: string,
  userId: string,
  waitingApproval: boolean,
  reason?: string,
) {
  const now = new Date().toISOString();

  await admin
    .from("cs_orders")
    .update({
      current_stage: toStage,
      status: waitingApproval ? "waiting_approval" : "in_progress",
      updated_at: now,
    })
    .eq("id", orderId);

  await admin.from("order_stage_transitions").insert({
    order_id: orderId,
    from_stage: fromStage,
    to_stage: toStage,
    transitioned_by: userId,
    reason:
      reason ??
      (waitingApproval
        ? `${fromStage} selesai — menunggu persetujuan supervisor`
        : `${fromStage} selesai`),
    transitioned_at: now,
  });
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: userData } = await admin
      .from("users")
      .select(
        "id, full_name, role:roles!users_role_id_fkey(name, role_group, allowed_stages)",
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!userData)
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );

    const roleName: string = (userData.role as any)?.name ?? "";
    const roleGroup: string = (userData.role as any)?.role_group ?? "";
    const allowedStages: string[] =
      (userData.role as any)?.allowed_stages ?? [];

    const body = await request.json();
    const {
      order_id: orderId,
      stage,
      data = {},
    } = body as {
      order_id: string;
      stage: string;
      data: Record<string, unknown>;
    };

    if (!orderId || !stage)
      return NextResponse.json(
        { error: "order_id dan stage wajib diisi" },
        { status: 400 },
      );

    if (!WORKER_STAGES.has(stage))
      return NextResponse.json(
        { error: `Tahap '${stage}' tidak dapat disubmit melalui endpoint ini` },
        { status: 400 },
      );

    if (!hasAccess(roleName, roleGroup, allowedStages, stage))
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke tahap ini" },
        { status: 403 },
      );

    const { data: order, error: orderError } = await admin
      .from("cs_orders")
      .select("id, current_stage, status, order_number")
      .eq("id", orderId)
      .is("deleted_at", null)
      .single();

    if (orderError || !order)
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );

    if (order.current_stage !== stage)
      return NextResponse.json(
        {
          error: `Order saat ini di tahap '${order.current_stage}', bukan '${stage}'. Refresh dan coba lagi.`,
        },
        { status: 409 },
      );

    const now = new Date().toISOString();
    const userId = authUser.id;
    const attemptNumber = await getAttemptNumber(admin, orderId, stage);

    // ── cek_kadar: fail → loop back to lebur_bahan ────────────────────────────
    if (stage === "cek_kadar") {
      const result = data.result as string;
      if (!result)
        return NextResponse.json(
          { error: "result wajib diisi untuk cek_kadar" },
          { status: 400 },
        );

      await admin.from("stage_results").insert({
        order_id: orderId,
        user_id: userId,
        stage: "cek_kadar",
        attempt_number: attemptNumber,
        data: { result, notes: data.notes ?? null },
        started_at: now,
        finished_at: now,
      });

      if (result === "tidak_lolos") {
        await admin.from("rework_logs").insert({
          order_id: orderId,
          from_stage: "cek_kadar",
          to_stage: "lebur_bahan",
          reason:
            (data.notes as string) ??
            "Kadar tidak memenuhi standar — perlu lebur ulang",
          severity: "major",
          logged_by: userId,
          logged_at: now,
        });

        await admin
          .from("cs_orders")
          .update({
            current_stage: "lebur_bahan",
            status: "rework",
            updated_at: now,
          })
          .eq("id", orderId);

        await admin.from("order_stage_transitions").insert({
          order_id: orderId,
          from_stage: "cek_kadar",
          to_stage: "lebur_bahan",
          transitioned_by: userId,
          reason:
            `Cek kadar tidak lolos — dikembalikan ke lebur bahan. ${(data.notes as string) ?? ""}`.trim(),
          transitioned_at: now,
        });

        return NextResponse.json({
          success: true,
          rework: true,
          message:
            "Cek kadar tidak lolos. Order dikembalikan ke tahap Lebur Bahan.",
          data: {
            order_id: orderId,
            order_number: order.order_number,
            next_stage: "lebur_bahan",
          },
        });
      }

      const next = nextInSequence("cek_kadar");
      if (next)
        await advanceOrder(
          admin,
          orderId,
          "cek_kadar",
          next,
          userId,
          false,
          "Cek kadar lolos",
        );

      return NextResponse.json({
        success: true,
        message: "Cek kadar lolos. Order maju ke tahap berikutnya.",
        data: {
          order_id: orderId,
          order_number: order.order_number,
          next_stage: next,
        },
      });
    }

    // ── konfirmasi: not_approved → rework to qc_2 ─────────────────
    if (stage === "konfirmasi") {
      const result = data.result as string;
      if (!result)
        return NextResponse.json(
          { error: "result wajib diisi untuk konfirmasi" },
          { status: 400 },
        );

      await admin.from("stage_results").insert({
        order_id: orderId,
        user_id: userId,
        stage: "konfirmasi",
        attempt_number: attemptNumber,
        data: { result, notes: data.notes ?? null },
        started_at: now,
        finished_at: now,
      });

      if (result === "not_approved") {
        const prevStage = "qc_2";

        await admin.from("rework_logs").insert({
          order_id: orderId,
          from_stage: "konfirmasi",
          to_stage: prevStage,
          reason:
            (data.notes as string) ??
            "Tidak disetujui customer care — perlu QC ulang",
          severity: "minor",
          logged_by: userId,
          logged_at: now,
        });

        await admin
          .from("cs_orders")
          .update({
            current_stage: prevStage,
            status: "rework",
            updated_at: now,
          })
          .eq("id", orderId);

        await admin.from("order_stage_transitions").insert({
          order_id: orderId,
          from_stage: "konfirmasi",
          to_stage: prevStage,
          transitioned_by: userId,
          reason:
            `Konfirmasi customer care tidak disetujui — dikembalikan ke QC akhir. ${(data.notes as string) ?? ""}`.trim(),
          transitioned_at: now,
        });

        return NextResponse.json({
          success: true,
          rework: true,
          message: "Tidak disetujui. Order dikembalikan ke tahap QC Akhir.",
          data: {
            order_id: orderId,
            order_number: order.order_number,
            next_stage: prevStage,
          },
        });
      }

      // Approved → packing
      const next = nextInSequence("konfirmasi");
      if (next)
        await advanceOrder(
          admin,
          orderId,
          "konfirmasi",
          next,
          userId,
          false,
          "Konfirmasi customer care disetujui",
        );

      return NextResponse.json({
        success: true,
        message: "Disetujui. Order maju ke tahap Packing.",
        data: {
          order_id: orderId,
          order_number: order.order_number,
          next_stage: next,
        },
      });
    }

    // ── QC stages: save checklist ──────────────────────────────────────────────
    if (stage === "qc_1" || stage === "qc_2") {
      const checklist = (data.quality_checklist ?? []) as Array<{
        key: string;
        passed: boolean;
      }>;

      const { data: srInsert, error: srError } = await admin
        .from("stage_results")
        .insert({
          order_id: orderId,
          user_id: userId,
          stage,
          attempt_number: attemptNumber,
          data: { quality_checklist: checklist, notes: data.notes ?? null },
          started_at: now,
          finished_at: now,
        })
        .select("id")
        .single();

      if (srError) throw srError;

      if (srInsert?.id && checklist.length > 0) {
        await admin.from("quality_checklist_results").insert(
          checklist.map((item) => ({
            order_id: orderId,
            stage_result_id: srInsert.id,
            check_key: item.key,
            passed: item.passed,
            recorded_by: userId,
            created_at: now,
          })),
        );
      }

      const approvalStage = APPROVAL_GATE_MAP[stage];
      if (approvalStage) {
        await advanceOrder(admin, orderId, stage, approvalStage, userId, true);
      }

      return NextResponse.json({
        success: true,
        message: approvalStage
          ? `${stage} selesai. Menunggu persetujuan supervisor.`
          : `${stage} selesai.`,
        data: {
          order_id: orderId,
          order_number: order.order_number,
          next_stage: approvalStage ?? nextInSequence(stage),
          waiting_approval: !!approvalStage,
        },
      });
    }

    // ── packing: confirm order readiness ─────────────────────────────────────
    if (stage === "packing") {
      const result = data.result as string;

      await admin.from("stage_results").insert({
        order_id: orderId,
        user_id: userId,
        stage: "packing",
        attempt_number: attemptNumber,
        data: { result, notes: data.notes ?? null },
        started_at: now,
        finished_at: now,
      });

      if (result === "belum") {
        await admin
          .from("cs_orders")
          .update({ status: "rework", updated_at: now })
          .eq("id", orderId);

        return NextResponse.json({
          success: true,
          rework: true,
          message: "Packing dicatat sebagai belum selesai. Perbaiki dan submit ulang.",
          data: { order_id: orderId, order_number: order.order_number, next_stage: "packing" },
        });
      }

      const next = nextInSequence("packing");
      if (next)
        await advanceOrder(
          admin,
          orderId,
          "packing",
          next,
          userId,
          false,
          "Packing selesai — siap kirim",
        );

      return NextResponse.json({
        success: true,
        message: "Packing selesai. Order siap dikirim.",
        data: {
          order_id: orderId,
          order_number: order.order_number,
          next_stage: next,
        },
      });
    }

    // ── pengiriman: mark delivered → selesai ──────────────────────────────────
    if (stage === "pengiriman") {
      const isDelivered = data.is_delivered === "delivered";
      const isFailed = data.is_delivered === "failed";

      await admin.from("stage_results").insert({
        order_id: orderId,
        user_id: userId,
        stage: "pengiriman",
        attempt_number: attemptNumber,
        data: { ...data },
        started_at: now,
        finished_at: now,
      });

      const deliveryUpdate: Record<string, unknown> = {
        status: isDelivered ? "delivered" : isFailed ? "failed" : "dispatched",
        courier_name: (data.courier_name as string | null) ?? null,
        tracking_number: (data.tracking_number as string | null) ?? null,
        confirmed_by: userId,
        updated_at: now,
        ...(isDelivered ? { delivered_at: now } : {}),
        ...(isFailed
          ? {
              failed_at: now,
              failure_reason: (data.notes as string | null) ?? null,
            }
          : {}),
      };

      await admin
        .from("deliveries")
        .update(deliveryUpdate)
        .eq("order_id", orderId)
        .eq("status", "pending");

      if (isDelivered) {
        await admin
          .from("cs_orders")
          .update({
            current_stage: "selesai",
            status: "completed",
            completed_at: now,
            updated_at: now,
          })
          .eq("id", orderId);

        await admin.from("order_stage_transitions").insert({
          order_id: orderId,
          from_stage: "pengiriman",
          to_stage: "selesai",
          transitioned_by: userId,
          reason: "Produk berhasil diterima pelanggan — order selesai",
          transitioned_at: now,
        });

        return NextResponse.json({
          success: true,
          message: "Pengiriman berhasil. Order selesai.",
          data: {
            order_id: orderId,
            order_number: order.order_number,
            next_stage: "selesai",
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: isFailed
          ? "Pengiriman gagal dicatat. Coba ulang pengiriman."
          : "Status pengiriman diperbarui.",
        data: {
          order_id: orderId,
          order_number: order.order_number,
          next_stage: "pengiriman",
        },
      });
    }

    // ── Standard "Done" stages ─────────────────────────────────────────────────
    await admin.from("stage_results").insert({
      order_id: orderId,
      user_id: userId,
      stage,
      attempt_number: attemptNumber,
      data: { ...data },
      started_at: now,
      finished_at: now,
    });

    const approvalStage = APPROVAL_GATE_MAP[stage];
    const resolvedNext = approvalStage ?? nextInSequence(stage);
    const isWaiting = !!approvalStage;

    if (resolvedNext && resolvedNext !== "selesai") {
      await advanceOrder(
        admin,
        orderId,
        stage,
        resolvedNext,
        userId,
        isWaiting,
      );
    }

    return NextResponse.json({
      success: true,
      message: isWaiting
        ? `${stage} selesai. Menunggu persetujuan supervisor.`
        : `${stage} selesai. Order maju ke tahap berikutnya.`,
      data: {
        order_id: orderId,
        order_number: order.order_number,
        next_stage: resolvedNext,
        waiting_approval: isWaiting,
      },
    });
  } catch (error) {
    console.error("[POST /api/stages/submit] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
