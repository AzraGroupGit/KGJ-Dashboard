import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapStatusToStage } from "@/lib/legacy/status";

const WEBHOOK_SECRET = process.env.INTEGRATED_SYSTEM_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-webhook-signature");
    const payload = await request.json();

    if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const db = createAdminClient();

    const { order } = payload as {
      order: {
        id: number;
        kode_order: string;
        nama: string;
        email?: string;
        no_hp?: string;
        alamat?: string;
        tgl_order?: string;
        tgl_selesai?: string;
        id_status?: number;
        catatan?: string;
      };
    };

    if (!order?.kode_order || !order?.id) {
      return NextResponse.json(
        { error: "Payload tidak valid: kode_order dan id diperlukan" },
        { status: 400 },
      );
    }

    const { data: existing } = await db
      .from("legacy_orders")
      .select("id, id_status")
      .eq("kode_order", order.kode_order)
      .maybeSingle();

    if (existing) {
      // If id_status changed, update the order and advance tracking.
      const incomingStatus = order.id_status ?? null;
      if (incomingStatus !== null && existing.id_status !== incomingStatus) {
        const stage = order.tgl_selesai
          ? "selesai"
          : mapStatusToStage(incomingStatus);

        await db
          .from("legacy_orders")
          .update({
            id_status: incomingStatus,
            tgl_selesai: order.tgl_selesai ?? undefined,
            catatan: order.catatan ?? undefined,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        // Only advance if the stage actually changed.
        const { data: tracking } = await db
          .from("tracking_stages")
          .select("current_stage")
          .eq("order_id", existing.id)
          .maybeSingle();

        if (!tracking || tracking.current_stage !== stage) {
          if (tracking) {
            await db
              .from("tracking_stages")
              .update({
                current_stage: stage,
                stage_status: stage === "selesai" ? "completed" : "in_progress",
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", existing.id);
          } else {
            await db.from("tracking_stages").insert({
              order_id: existing.id,
              current_stage: stage,
              stage_status: stage === "selesai" ? "completed" : "in_progress",
              updated_at: new Date().toISOString(),
            });
          }

          await db.from("stage_history").insert({
            order_id: existing.id,
            stage,
            status: "completed",
            created_at: new Date().toISOString(),
          });
        }

        await db.from("sync_logs").insert({
          sync_type: "webhook",
          orders_synced: 1,
          status: "success",
          created_at: new Date().toISOString(),
        });

        return NextResponse.json({ received: true, status: "updated", stage }, { status: 200 });
      }

      return NextResponse.json({ received: true, status: "existing" });
    }

    const { data: inserted, error: insertError } = await db
      .from("legacy_orders")
      .insert({
        legacy_id: order.id,
        kode_order: order.kode_order,
        nama: order.nama,
        email: order.email ?? null,
        no_hp: order.no_hp ?? null,
        alamat: order.alamat ?? null,
        tgl_order: order.tgl_order ?? null,
        tgl_selesai: order.tgl_selesai ?? null,
        id_status: order.id_status ?? null,
        catatan: order.catatan ?? null,
        last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[POST /api/legacy/webhook] insert error:", insertError);
      return NextResponse.json(
        { error: "Gagal menyimpan order" },
        { status: 500 },
      );
    }

    const stage = order.tgl_selesai
      ? "selesai"
      : mapStatusToStage(order.id_status);

    await db.from("tracking_stages").insert({
      order_id: inserted.id,
      current_stage: stage,
      stage_status: stage === "selesai" ? "completed" : "in_progress",
      updated_at: new Date().toISOString(),
    });

    await db.from("stage_history").insert({
      order_id: inserted.id,
      stage,
      status: "completed",
      created_at: new Date().toISOString(),
    });

    await db.from("sync_logs").insert({
      sync_type: "webhook",
      orders_synced: 1,
      status: "success",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ received: true, stage }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/legacy/webhook] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
