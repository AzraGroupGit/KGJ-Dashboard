// app/api/supervisor/order-detail/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    if (!orderId)
      return NextResponse.json({ error: "order_id wajib diisi" }, { status: 400 });

    // ── 1. cs_order — the single source of truth ───────────────────────────────
    const { data: csOrder, error: orderError } = await admin
      .from("cs_orders")
      .select(
        `id, order_number, customer_name, customer_wa, customer_email, customer_instagram,
         tgl_chat, tgl_order, tgl_acara, deadline, acara, kebutuhan_acara, alat_ukur,
         gramasi_pria, gramasi_wanita, ukiran_cincin_pria, ukiran_cincin_wanita,
         ukuran_pria, ukiran_pria, jenis_cincin_pria,
         model_bentuk_pria, microsetting_pria, detail_laser_pria, detail_finishing_pria,
         ukuran_wanita, ukiran_wanita, jenis_cincin_wanita,
         model_bentuk_wanita, microsetting_wanita, detail_laser_wanita, detail_finishing_wanita,
         font, laser_position, harga, dp_amount,
         order_via, sumber_media, kategori, transfer_ke_bank, jenis_cincin_features, dari_artis_detail,
         pengiriman, box, alamat_pengiriman, kelurahan, kecamatan, kabupaten_kota, provinsi, kodepos,
         reference_image_pria_url, reference_image_wanita_url,
         current_stage, status, form_status,
         created_at, updated_at,
         users!cs_orders_created_by_fkey ( full_name )`,
      )
      .eq("id", orderId)
      .is("deleted_at", null)
      .single();

    if (orderError || !csOrder)
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // ── 2. Stage history ───────────────────────────────────────────────────────
    const { data: transitions, error: transErr } = await admin
      .from("order_stage_transitions")
      .select(`from_stage, to_stage, reason, transitioned_at,
        users!ost_transitioned_by_fkey ( full_name )`)
      .eq("order_id", orderId)
      .order("transitioned_at", { ascending: true });
    if (transErr) console.error("[OrderDetail] transitions error:", transErr);

    // ── 3. Stage results ───────────────────────────────────────────────────────
    const { data: stageResults, error: srErr } = await admin
      .from("stage_results")
      .select(
        `id, stage, attempt_number, data, notes, started_at, finished_at,
         users!stage_results_user_id_fkey ( full_name )`,
      )
      .eq("order_id", orderId)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(20);
    if (srErr) console.error("[OrderDetail] stage_results error:", srErr);

    // ── 4. Deliveries ─────────────────────────────────────────────────────────
    const { data: deliveries, error: delErr } = await admin
      .from("deliveries")
      .select(
        `id, delivery_method, status, courier_name, tracking_number,
         recipient_name, recipient_phone, delivery_address,
         dispatched_at, delivered_at, notes`,
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (delErr) console.error("[OrderDetail] deliveries error:", delErr);

    // ── 5. Scan events ────────────────────────────────────────────────────────
    const { data: scanEvents, error: scanErr } = await admin
      .from("scan_events")
      .select(
        `id, stage, action, scanned_at,
         users!scan_events_user_id_fkey ( full_name )`,
      )
      .eq("order_id", orderId)
      .order("scanned_at", { ascending: true })
      .limit(50);
    if (scanErr) console.error("[OrderDetail] scan_events error:", scanErr);

    // ── 6. Approvals history ──────────────────────────────────────────────────
    const { data: approvals, error: apprErr } = await admin
      .from("approvals")
      .select(
        `id, stage, decision, remarks, decided_at,
         users!approvals_approver_id_fkey ( full_name )`,
      )
      .eq("order_id", orderId)
      .order("decided_at", { ascending: true });
    if (apprErr) console.error("[OrderDetail] approvals error:", apprErr);

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: csOrder.id,
          order_number: csOrder.order_number,
          customer_name: csOrder.customer_name,
          customer_wa: csOrder.customer_wa ?? null,
          customer_email: csOrder.customer_email ?? null,
          customer_instagram: csOrder.customer_instagram ?? null,
          tgl_chat: csOrder.tgl_chat ?? null,
          tgl_order: csOrder.tgl_order ?? null,
          tgl_acara: csOrder.tgl_acara ?? null,
          deadline: csOrder.deadline ?? null,
          acara: csOrder.acara ?? null,
          kebutuhan_acara: csOrder.kebutuhan_acara ?? null,
          alat_ukur: csOrder.alat_ukur ?? null,
          gramasi_pria: csOrder.gramasi_pria ?? null,
          gramasi_wanita: csOrder.gramasi_wanita ?? null,
          ukiran_cincin_pria: csOrder.ukiran_cincin_pria ?? null,
          ukiran_cincin_wanita: csOrder.ukiran_cincin_wanita ?? null,
          ukuran_pria: csOrder.ukuran_pria ?? null,
          ukiran_pria: csOrder.ukiran_pria ?? null,
          jenis_cincin_pria: csOrder.jenis_cincin_pria ?? null,
          model_bentuk_pria: csOrder.model_bentuk_pria ?? null,
          microsetting_pria: csOrder.microsetting_pria ?? null,
          detail_laser_pria: csOrder.detail_laser_pria ?? null,
          detail_finishing_pria: csOrder.detail_finishing_pria ?? null,
          ukuran_wanita: csOrder.ukuran_wanita ?? null,
          ukiran_wanita: csOrder.ukiran_wanita ?? null,
          jenis_cincin_wanita: csOrder.jenis_cincin_wanita ?? null,
          model_bentuk_wanita: csOrder.model_bentuk_wanita ?? null,
          microsetting_wanita: csOrder.microsetting_wanita ?? null,
          detail_laser_wanita: csOrder.detail_laser_wanita ?? null,
          detail_finishing_wanita: csOrder.detail_finishing_wanita ?? null,
          font: csOrder.font ?? null,
          laser_position: csOrder.laser_position ?? null,
          harga: csOrder.harga ?? null,
          dp_amount: csOrder.dp_amount ?? null,
          order_via: csOrder.order_via ?? null,
          sumber_media: csOrder.sumber_media ?? null,
          kategori: csOrder.kategori ?? null,
          transfer_ke_bank: csOrder.transfer_ke_bank ?? null,
          jenis_cincin_features: csOrder.jenis_cincin_features ?? null,
          dari_artis_detail: csOrder.dari_artis_detail ?? null,
          pengiriman: csOrder.pengiriman ?? null,
          box: csOrder.box ?? null,
          alamat_pengiriman: csOrder.alamat_pengiriman ?? null,
          kelurahan: csOrder.kelurahan ?? null,
          kecamatan: csOrder.kecamatan ?? null,
          kabupaten_kota: csOrder.kabupaten_kota ?? null,
          provinsi: csOrder.provinsi ?? null,
          kodepos: csOrder.kodepos ?? null,
          reference_image_pria_url: csOrder.reference_image_pria_url ?? null,
          reference_image_wanita_url: csOrder.reference_image_wanita_url ?? null,
          current_stage: csOrder.current_stage,
          status: csOrder.status,
          form_status: csOrder.form_status,
          created_at: csOrder.created_at,
          updated_at: csOrder.updated_at,
          created_by_name: (csOrder as any).users?.full_name ?? null,
        },
        transitions: transitions || [],
        stageResults: stageResults || [],
        deliveries: deliveries || [],
        scanEvents: scanEvents || [],
        approvals: approvals || [],
      },
    });
  } catch (error) {
    console.error("[Order Detail] Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
