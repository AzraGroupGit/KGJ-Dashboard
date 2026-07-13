// app/api/cs/orders/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleProps } from "@/lib/auth/session";

// ── Auth helper (exported for use in [id]/route.ts) ────────────────────────

export async function requireCsOrAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, role:roles!users_role_id_fkey(name)")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  const roleName = getRoleProps(userData).name;
  if (!["customer_service", "superadmin"].includes(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { authUser: user, roleName };
}

// ── Order number generator ─────────────────────────────────────────────────

async function generateOrderNumber(
  db: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const prefix = `CS-${today}-`;

  const { count } = await db
    .from("cs_orders")
    .select("*", { count: "exact", head: true })
    .like("order_number", `${prefix}%`);

  const next = ((count ?? 0) + 1).toString().padStart(3, "0");
  return `${prefix}${next}`;
}

// ── GET /api/cs/orders ─────────────────────────────────────────────────────

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireCsOrAdmin(supabase);
    if ("error" in auth) return auth.error;

    const { authUser, roleName } = auth;
    const db = createAdminClient();

    let query = db
      .from("cs_orders")
      .select("*, users!cs_orders_created_by_fkey(full_name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (roleName === "customer_service") {
      query = query.eq("created_by", authUser.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/cs/orders]", error.message);
      return NextResponse.json(
        { error: "Gagal memuat data order" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/cs/orders] unexpected:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ── POST /api/cs/orders ────────────────────────────────────────────────────

export async function POST(request: Request) {
  // DISABLED: order creation in main-erp is retired — orders now originate from
  // the legacy Yii2 system (synced into legacy_orders). This endpoint no longer
  // creates cs_orders. Code kept for reference behind this flag.
  const ORDER_CREATION_ENABLED = false;
  if (!ORDER_CREATION_ENABLED) {
    return NextResponse.json(
      { error: "Pembuatan order dinonaktifkan. Order berasal dari sistem Yii2." },
      { status: 403 },
    );
  }

  try {
    const supabase = await createClient();
    const auth = await requireCsOrAdmin(supabase);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { customer_name, tgl_chat, transfer_ke_bank } = body as {
      customer_name?: string;
      tgl_chat?: string;
      transfer_ke_bank?: string;
    };

    if (!customer_name?.trim()) {
      return NextResponse.json(
        { error: "Nama customer wajib diisi" },
        { status: 400 },
      );
    }
    if (!tgl_chat) {
      return NextResponse.json(
        { error: "Tanggal chat wajib diisi" },
        { status: 400 },
      );
    }

    const db = createAdminClient();

    const { data: csUser } = await db
      .from("users")
      .select("branch_id")
      .eq("id", auth.authUser.id)
      .single();

    const order_number = await generateOrderNumber(db);
    const form_token = crypto.randomUUID();

    const { data, error } = await db
      .from("cs_orders")
      .insert({
        order_number,
        form_token,
        customer_name: customer_name.trim(),
        tgl_chat,
        tgl_order: new Date().toISOString().split("T")[0],
        created_by: auth.authUser.id,
        branch_id: csUser?.branch_id ?? null,
        form_status: "pending",
        transfer_ke_bank: transfer_ke_bank || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/cs/orders]", error.message);
      return NextResponse.json(
        { error: "Gagal membuat order" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/cs/orders] unexpected:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
