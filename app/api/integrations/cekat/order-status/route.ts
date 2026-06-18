// app/api/integrations/cekat/order-status/route.ts
//
// GET /api/integrations/cekat/order-status?order_number=...&customer_wa=...
//
// Public-facing endpoint for Cekat AI Tools to fetch live order and payment
// status. Protected by bearer token (CEKAT_DATA_API_KEY), NOT session auth.
// Returns the minimum fields the AI needs — never internal IDs or sensitive data.

import { NextResponse } from "next/server";
import { lookupByOrderNumber, lookupByCustomerWa } from "@/lib/cekat/lookup";

// ── Auth ───────────────────────────────────────────────────────────────────────

function verifyBearerToken(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const expected = process.env.CEKAT_DATA_API_KEY;
  if (!expected || !auth) return false;
  return auth === `Bearer ${expected}`;
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth first — no DB query for unauthenticated requests
  if (!verifyBearerToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("order_number")?.trim();
    const customerWa = searchParams.get("customer_wa")?.trim();

    if (!orderNumber && !customerWa) {
      return NextResponse.json(
        { error: "order_number atau customer_wa wajib diisi" },
        { status: 400 },
      );
    }

    let order = null;

    if (orderNumber) {
      order = await lookupByOrderNumber(orderNumber);
    } else if (customerWa) {
      order = await lookupByCustomerWa(customerWa);
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("[cekat/order-status] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
