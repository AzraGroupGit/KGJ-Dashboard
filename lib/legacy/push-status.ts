// lib/legacy/push-status.ts
//
// Fire-and-forget push of the CURRENT ERP stage to the Yii2 LIVE_SYSTEM
// (POST /api/order-sync/webhook). Full 20-stage sync: every stage transition
// (worker submit, supervisor approve/reject, rework) pushes the stage the
// order has just ENTERED, so Yii2 monitoring mirrors the ERP exactly.
//
// Never blocks or fails the caller; failures are logged loudly instead of
// silently swallowed. Yii2 does not echo status updates back (loop broken).

import { stageToYii2Status } from "@/lib/legacy/reverse-map";

export async function pushStageToYii2(
  legacyId: number | null | undefined,
  stage: string,
) {
  if (legacyId == null) return;

  const idStatus = stageToYii2Status(stage);
  if (idStatus == null) return;

  const baseUrl = process.env.LIVE_SYSTEM_BASE_URL;
  const apiKey = process.env.INTEGRATED_SYSTEM_WEBHOOK_SECRET;
  if (!baseUrl || !apiKey) {
    console.error(
      "[pushStageToYii2] LIVE_SYSTEM_BASE_URL / INTEGRATED_SYSTEM_WEBHOOK_SECRET belum diset — status Yii2 tidak akan ter-update",
    );
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/api/order-sync/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        event: "status_update",
        order_id: legacyId,
        id_status: idStatus,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[pushStageToYii2] Yii2 menolak update order #${legacyId} stage ${stage} (id_status ${idStatus}): HTTP ${res.status} ${body}`,
      );
    }
  } catch (err) {
    console.error(
      `[pushStageToYii2] Push gagal untuk order #${legacyId} stage ${stage}:`,
      err,
    );
  }
}
