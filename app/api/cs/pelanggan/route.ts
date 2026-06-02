import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCsOrAdmin } from "@/app/api/cs/orders/route";

function groupOrders(orders: any[]) {
  const groups = new Map<string, {
    customer_wa: string | null;
    customer_name: string;
    customer_email: string | null;
    customer_instagram: string | null;
    alamat_pengiriman: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    kabupaten_kota: string | null;
    provinsi: string | null;
    kodepos: string | null;
    total_orders: number;
    total_spent: number;
    first_order_at: string | null;
    last_order_at: string | null;
    orders: Record<string, unknown>[];
  }>();

  for (const order of orders || []) {
    const key = order.customer_wa || `no-wa-${order.customer_name}`;
    if (!groups.has(key)) {
      groups.set(key, {
        customer_wa: order.customer_wa,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_instagram: order.customer_instagram,
        alamat_pengiriman: order.alamat_pengiriman,
        kelurahan: order.kelurahan,
        kecamatan: order.kecamatan,
        kabupaten_kota: order.kabupaten_kota,
        provinsi: order.provinsi,
        kodepos: order.kodepos,
        total_orders: 0,
        total_spent: 0,
        first_order_at: null,
        last_order_at: null,
        orders: [],
      });
    }

    const group = groups.get(key)!;
    group.orders.push({
      id: order.id,
      order_number: order.order_number,
      tgl_order: order.tgl_order,
      tgl_acara: order.tgl_acara,
      acara: order.acara,
      kategori: order.kategori,
      harga: order.harga,
      status: order.status,
      current_stage: order.current_stage,
      created_at: order.created_at,
    });
    group.total_orders++;
    group.total_spent += order.harga || 0;

    if (!group.first_order_at || order.created_at < group.first_order_at) {
      group.first_order_at = order.created_at;
    }
    if (!group.last_order_at || order.created_at > group.last_order_at) {
      group.last_order_at = order.created_at;
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => (b.last_order_at || "").localeCompare(a.last_order_at || ""),
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireCsOrAdmin(supabase);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    const db = createAdminClient();
    let query = db
      .from("cs_orders")
      .select(
        `id, order_number, customer_name, customer_wa, customer_email, customer_instagram,
         alamat_pengiriman, kelurahan, kecamatan, kabupaten_kota, provinsi, kodepos,
         tgl_order, tgl_chat, tgl_acara, acara, kategori, harga, status, current_stage,
         created_by, created_at, updated_at`,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (auth.roleName === "customer_service") {
      query = query.eq("created_by", auth.authUser.id);
    }

    if (q) {
      query = query.or(`customer_name.ilike.%${q}%,customer_wa.ilike.%${q}%`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("[GET /api/cs/pelanggan]", error.message);
      return NextResponse.json(
        { error: "Gagal memuat data pelanggan" },
        { status: 500 },
      );
    }

    const data = groupOrders(orders);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/cs/pelanggan] unexpected:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
