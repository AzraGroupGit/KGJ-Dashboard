// lib/cekat/lookup.ts
//
// Data lookup functions for Cekat AI Tools. Extracted from the route handler
// so they can be tested independently. Returns ONLY the approved minimal fields.

import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CekatOrderStatus {
  order_number: string;
  customer_name: string;
  current_stage: string;
  payment_status: "lunas" | "unpaid";
  harga: number | null;
  dp_amount: number | null;
  deadline: string | null;
  pengiriman: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function computePaymentStatus(harga: number | null, dpAmount: number | null): "lunas" | "unpaid" {
  if (harga != null && dpAmount != null && dpAmount >= harga) return "lunas";
  return "unpaid";
}

function normalizeWa(wa: string): string {
  return wa.replace(/[^0-9]/g, "");
}

// ── Lookup Functions ───────────────────────────────────────────────────────────

export async function lookupByOrderNumber(
  orderNumber: string,
): Promise<CekatOrderStatus | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cs_orders")
    .select(
      "order_number, customer_name, current_stage, harga, dp_amount, deadline, pengiriman",
    )
    .eq("order_number", orderNumber)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[cekat/lookup] lookupByOrderNumber error:", error.message);
    throw new Error("Database lookup failed");
  }

  if (!data) return null;

  return {
    order_number: data.order_number,
    customer_name: data.customer_name ?? "Pelanggan",
    current_stage: data.current_stage ?? "tidak diketahui",
    payment_status: computePaymentStatus(data.harga, data.dp_amount),
    harga: data.harga,
    dp_amount: data.dp_amount,
    deadline: data.deadline,
    pengiriman: data.pengiriman,
  };
}

export async function lookupByCustomerWa(
  customerWa: string,
): Promise<CekatOrderStatus | null> {
  const admin = createAdminClient();
  const normalizedWa = normalizeWa(customerWa);
  const { data, error } = await admin
    .from("cs_orders")
    .select(
      "order_number, customer_name, current_stage, harga, dp_amount, deadline, pengiriman",
    )
    .eq("customer_wa", normalizedWa)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[cekat/lookup] lookupByCustomerWa error:", error.message);
    throw new Error("Database lookup failed");
  }

  if (!data) return null;

  return {
    order_number: data.order_number,
    customer_name: data.customer_name ?? "Pelanggan",
    current_stage: data.current_stage ?? "tidak diketahui",
    payment_status: computePaymentStatus(data.harga, data.dp_amount),
    harga: data.harga,
    dp_amount: data.dp_amount,
    deadline: data.deadline,
    pengiriman: data.pengiriman,
  };
}
