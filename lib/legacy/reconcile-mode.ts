export type ReconcileMode = "apply" | "disabled" | "dry_run";

type ActiveCodesPayload = {
  success?: unknown;
  count?: unknown;
  orders?: unknown;
};

type ActiveCodesValidation =
  | { ok: true; codes: string[] }
  | { ok: false; reason: string };

export function getReconcileMode(value = process.env.LEGACY_RECONCILE_MODE): ReconcileMode {
  if (value === "apply" || value === "dry_run") return value;
  return "disabled";
}

export function normalizeUniqueCodes(values: unknown[]): ActiveCodesValidation {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const value of values) {
    const code = typeof value === "string" ? value.trim() : "";
    if (!code) return { ok: false, reason: "kode_order kosong" };
    if (seen.has(code)) return { ok: false, reason: `kode_order duplikat: ${code}` };
    seen.add(code);
    codes.push(code);
  }

  return { ok: true, codes };
}

export function validateActiveCodesPayload(payload: unknown): ActiveCodesValidation {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "respons bukan object" };
  }

  const data = payload as ActiveCodesPayload;
  if (data.success !== true) return { ok: false, reason: "success bukan true" };
  if (!Array.isArray(data.orders)) return { ok: false, reason: "orders bukan array" };
  if (!Number.isInteger(data.count) || data.count !== data.orders.length) {
    return { ok: false, reason: "count tidak cocok dengan orders" };
  }

  return normalizeUniqueCodes(
    data.orders.map((item) =>
      item && typeof item === "object" && "kode_order" in item
        ? (item as { kode_order?: unknown }).kode_order
        : null,
    ),
  );
}

export function exceedsReconcileDeleteThreshold(
  candidateCount: number,
  activeOrderCount: number,
): boolean {
  return candidateCount > 5 || candidateCount / activeOrderCount > 0.01;
}
