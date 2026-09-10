import { describe, expect, it } from "vitest";
import { getReconcileMode } from "@/lib/legacy/reconcile-mode";

describe("getReconcileMode", () => {
  it("defaults to disabled when no mode is configured", () => {
    expect(getReconcileMode(undefined)).toBe("disabled");
  });

  it("only enables an explicitly approved mode", () => {
    expect(getReconcileMode("apply")).toBe("apply");
  });

  it("fails closed for an unrecognised mode", () => {
    expect(getReconcileMode("enabled")).toBe("disabled");
  });
});
