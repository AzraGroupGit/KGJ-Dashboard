// lib/legacy/ingest.ts
//
// Shared ingestion for Yii2 order payloads (inbound webhook + pull sync).
// Implements integration-spec checklist item 1: full-field upsert for
// existing orders, idempotent — re-applying an identical payload never
// creates duplicate stage_history rows or moves the tracking pointer.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapStatusToStage,
  YII2_STATUS_TO_STAGE,
  YII2_STATUS_PELUNASAN,
} from "@/lib/legacy/status";
import { notifySupervisors } from "@/lib/notifications";
import {
  buildLegacyOrderRow,
  buildLegacyOrderUpdate,
  type Yii2OrderPayload,
} from "@/lib/legacy/adapter";

type Db = ReturnType<typeof createAdminClient>;

// Stages that should auto-advance to their approval gate on ingest (Yii2
// already handled intake — the order is ready for supervisor review).
const APPROVAL_GATE_MAP: Record<string, string> = {
  penerimaan_order: "approval_penerimaan_order",
  racik_bahan: "approval_racik_bahan",
  qc_1: "approval_qc_1",
  qc_2: "approval_qc_2",
  pembentukan_cincin: "approval_produksi", // this skips to the production approval
};

export function resolveIngestionStage(rawStage: string): {
  stage: string;
  status: string;
} {
  const gate = APPROVAL_GATE_MAP[rawStage];
  if (gate) {
    return { stage: gate, status: "waiting_approval" };
  }
  return {
    stage: rawStage,
    status: rawStage === "selesai" ? "completed" : "in_progress",
  };
}

// Spec checklist item 6: id_status=13 (Pelunasan) is a Yii2-native payment
// status — apply the field update but keep the current stage unchanged.
// Unknown/missing statuses are also skipped for EXISTING orders, so the
// mapStatusToStage fallback (penerimaan_order) can never regress an order.
export function shouldAdvanceTracking(
  idStatus: number | null | undefined,
): boolean {
  if (idStatus == null) return false;
  if (idStatus === YII2_STATUS_PELUNASAN) return false;
  return idStatus in YII2_STATUS_TO_STAGE;
}

export function resolveTargetStage(order: Yii2OrderPayload): string | null {
  if (order.tgl_selesai) return "selesai";
  if (!shouldAdvanceTracking(order.id_status)) return null;
  return mapStatusToStage(order.id_status);
}

export interface IngestResult {
  action: "inserted" | "updated";
  stage: string | null;
  stageChanged: boolean;
}

async function advanceTracking(
  db: Db,
  orderId: string,
  stage: string,
  stageStatus: string,
): Promise<boolean> {
  const { data: tracking } = await db
    .from("tracking_stages")
    .select("current_stage")
    .eq("order_id", orderId)
    .maybeSingle();

  if (tracking && tracking.current_stage === stage) return false;

  if (tracking) {
    await db
      .from("tracking_stages")
      .update({
        current_stage: stage,
        stage_status: stageStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);
  } else {
    await db.from("tracking_stages").insert({
      order_id: orderId,
      current_stage: stage,
      stage_status: stageStatus,
      updated_at: new Date().toISOString(),
    });
  }

  await db.from("stage_history").insert({
    order_id: orderId,
    stage,
    status: "completed",
    created_at: new Date().toISOString(),
  });

  return true;
}

export async function ingestLegacyOrder(
  db: Db,
  order: Yii2OrderPayload,
): Promise<IngestResult> {
  const { data: existing } = await db
    .from("legacy_orders")
    .select("id, id_status, deleted_at")
    .eq("kode_order", order.kode_order)
    .maybeSingle();

  if (existing) {
    // Full-field upsert on every payload (also clears deleted_at when a
    // previously reconciled-away order reappears in the feed).
    const { error: updateError } = await db
      .from("legacy_orders")
      .update(buildLegacyOrderUpdate(order))
      .eq("id", existing.id);
    if (updateError) {
      throw new Error(`legacy_orders update gagal: ${updateError.message}`);
    }

    // Move the tracking pointer only when Yii2's id_status actually changed.
    // Yii2 fires on EVERY save — a non-status edit carries the old id_status,
    // and the ERP pointer may already be further ahead (only some ERP stages
    // push back to Yii2). Acting on an unchanged status would regress it.
    const incomingStatus = order.id_status ?? null;
    const statusChanged = existing.id_status !== incomingStatus;
    let targetStage = statusChanged ? resolveTargetStage(order) : null;

    // Resurrected order without a tracking pointer (reconcile removed it):
    // rebuild the pointer even when the status alone would not advance.
    if (targetStage === null && existing.deleted_at) {
      targetStage = order.tgl_selesai
        ? "selesai"
        : mapStatusToStage(order.id_status);
    }

    if (targetStage === null) {
      return { action: "updated", stage: null, stageChanged: false };
    }

    const stageChanged = await advanceTracking(
      db,
      existing.id,
      targetStage,
      targetStage === "selesai" ? "completed" : "in_progress",
    );

    return { action: "updated", stage: targetStage, stageChanged };
  }

  const { data: inserted, error: insertError } = await db
    .from("legacy_orders")
    .insert(buildLegacyOrderRow(order))
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `legacy_orders insert gagal: ${insertError?.message ?? "unknown"}`,
    );
  }

  const rawStage = order.tgl_selesai
    ? "selesai"
    : mapStatusToStage(order.id_status);

  const { stage, status: stageStatus } = resolveIngestionStage(rawStage);

  await db.from("tracking_stages").insert({
    order_id: inserted.id,
    current_stage: stage,
    stage_status: stageStatus,
    updated_at: new Date().toISOString(),
  });

  await db.from("stage_history").insert({
    order_id: inserted.id,
    stage,
    status: "completed",
    created_at: new Date().toISOString(),
  });

  if (stageStatus === "waiting_approval" && stage.startsWith("approval_")) {
    notifySupervisors(
      "operational_supervisor",
      "Order Baru — Menunggu Persetujuan",
      `Order ${order.kode_order} (${order.nama ?? "—"}) menunggu approval.`,
      "info",
      `/dashboard/supervisor/approval`,
    );
  }

  return { action: "inserted", stage, stageChanged: true };
}
