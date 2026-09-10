import { describe, expect, it } from "vitest";
import {
  exceedsReconcileDeleteThreshold,
  getReconcileMode,
  normalizeUniqueCodes,
  validateActiveCodesPayload,
} from "@/lib/legacy/reconcile-mode";

describe("getReconcileMode", () => {
  it("defaults to disabled when no mode is configured", () => {
    expect(getReconcileMode(undefined)).toBe("disabled");
  });

  it("only enables an explicitly approved mode", () => {
    expect(getReconcileMode("dry_run")).toBe("dry_run");
    expect(getReconcileMode("apply")).toBe("apply");
  });

  it("fails closed for an unrecognised mode", () => {
    expect(getReconcileMode("enabled")).toBe("disabled");
  });
});

describe("validateActiveCodesPayload", () => {
  it("normalizes valid codes before reconciliation", () => {
    expect(
      validateActiveCodesPayload({
        success: true,
        count: 2,
        orders: [{ kode_order: " KGJ-001 " }, { kode_order: "KGJ-002" }],
      }),
    ).toEqual({ ok: true, codes: ["KGJ-001", "KGJ-002"] });
  });

  it("rejects an internally inconsistent response", () => {
    expect(
      validateActiveCodesPayload({
        success: true,
        count: 2,
        orders: [{ kode_order: "KGJ-001" }],
      }),
    ).toEqual({ ok: false, reason: "count tidak cocok dengan orders" });
  });

  it("rejects empty or duplicate codes after normalization", () => {
    expect(
      validateActiveCodesPayload({
        success: true,
        count: 2,
        orders: [{ kode_order: "KGJ-001" }, { kode_order: " KGJ-001 " }],
      }),
    ).toEqual({ ok: false, reason: "kode_order duplikat: KGJ-001" });
  });
});

describe("exceedsReconcileDeleteThreshold", () => {
  it("blocks a batch that exceeds one percent even when it is below five orders", () => {
    expect(exceedsReconcileDeleteThreshold(2, 83)).toBe(true);
  });

  it("blocks a batch that exceeds five orders", () => {
    expect(exceedsReconcileDeleteThreshold(6, 1_000)).toBe(true);
  });

  it("allows one candidate in a worklist of one hundred orders", () => {
    expect(exceedsReconcileDeleteThreshold(1, 100)).toBe(false);
  });
});

describe("normalizeUniqueCodes", () => {
  it("rejects duplicate local codes after trimming", () => {
    expect(normalizeUniqueCodes(["KGJ-001", " KGJ-001 "])).toEqual({
      ok: false,
      reason: "kode_order duplikat: KGJ-001",
    });
  });
});
