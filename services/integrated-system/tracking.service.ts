import { createAdminClient } from "@/lib/supabase/admin";
import {
  STAGE_SEQUENCE,
  STAGE_LABELS,
  type StageKey,
} from "@/lib/stages";

export { STAGE_SEQUENCE, STAGE_LABELS };
export type StageName = StageKey;

export function getStageIndex(stage: string): number {
  return STAGE_SEQUENCE.indexOf(stage as StageKey);
}

export function getProgressPercent(stage: string): number {
  const idx = getStageIndex(stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STAGE_SEQUENCE.length) * 100);
}

export function getNextStage(current: string): StageKey | null {
  const idx = getStageIndex(current);
  if (idx < 0 || idx >= STAGE_SEQUENCE.length - 1) return null;
  return STAGE_SEQUENCE[idx + 1];
}

export async function updateOrderStage(
  orderId: string,
  stage: StageKey,
  status: string,
  note: string | null,
  userId: string,
) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("tracking_stages")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) {
    await db
      .from("tracking_stages")
      .update({
        current_stage: stage,
        stage_status: status,
        updated_at: now,
        updated_by: userId,
      })
      .eq("id", existing.id);
  } else {
    await db.from("tracking_stages").insert({
      order_id: orderId,
      current_stage: stage,
      stage_status: status,
      updated_at: now,
      updated_by: userId,
    });
  }

  await db.from("stage_history").insert({
    order_id: orderId,
    stage,
    status,
    note,
    changed_by: userId,
    created_at: now,
  });

  return { stage, status };
}

export async function getOrderTrackingData(orderId: string) {
  const db = createAdminClient();

  const { data: order } = await db
    .from("legacy_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  const { data: tracking } = await db
    .from("tracking_stages")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  const { data: history } = await db
    .from("stage_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return { order, tracking, history: history ?? [] };
}
