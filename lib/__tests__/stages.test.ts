import { describe, it, expect } from "vitest";
import {
  STAGE_SEQUENCE,
  CUSTOMER_STAGE_SEQUENCE,
  getStageLabel,
  getStageGroup,
  getStageIndex,
  getProgressPercent,
  isStageCompleted,
  isStageActive,
  isStageUpcoming,
} from "@/lib/stages";

describe("STAGE_SEQUENCE", () => {
  it("contains 20 stages", () => {
    expect(STAGE_SEQUENCE).toHaveLength(20);
  });

  it("starts with penerimaan_order and ends with selesai", () => {
    expect(STAGE_SEQUENCE[0]).toBe("penerimaan_order");
    expect(STAGE_SEQUENCE[STAGE_SEQUENCE.length - 1]).toBe("selesai");
  });
});

describe("CUSTOMER_STAGE_SEQUENCE", () => {
  it("excludes approval stages and penerimaan_order", () => {
    const hasApproval = CUSTOMER_STAGE_SEQUENCE.some((s) =>
      s.startsWith("approval_"),
    );
    expect(hasApproval).toBe(false);
    expect(CUSTOMER_STAGE_SEQUENCE).not.toContain("penerimaan_order");
  });

  it("has fewer stages than full sequence", () => {
    expect(CUSTOMER_STAGE_SEQUENCE.length).toBeLessThan(
      STAGE_SEQUENCE.length,
    );
  });
});

describe("getStageLabel", () => {
  it("returns display label for known stage", () => {
    expect(getStageLabel("penerimaan_order")).toBe("Penerimaan Order");
  });

  it("falls back to humanized key for unknown stage", () => {
    expect(getStageLabel("some_new_stage")).toBe("some new stage");
  });
});

describe("getStageGroup", () => {
  it("returns production for lebur_bahan", () => {
    expect(getStageGroup("lebur_bahan")).toBe("production");
  });

  it("returns management for approval stages", () => {
    expect(getStageGroup("approval_penerimaan_order")).toBe("management");
  });

  it('returns "other" for unknown stage', () => {
    expect(getStageGroup("unknown_stage")).toBe("other");
  });
});

describe("getStageIndex", () => {
  it("returns 0 for first stage", () => {
    expect(getStageIndex("penerimaan_order")).toBe(0);
  });

  it("returns -1 for unknown stage", () => {
    expect(getStageIndex("nonexistent")).toBe(-1);
  });
});

describe("getProgressPercent", () => {
  it("returns 0 for first stage", () => {
    expect(getProgressPercent("penerimaan_order")).toBe(0);
  });

  it("returns 100 for last stage", () => {
    expect(getProgressPercent("selesai")).toBe(100);
  });

  it("returns 0 for unknown stage", () => {
    expect(getProgressPercent("bad_stage")).toBe(0);
  });
});

describe("isStageCompleted", () => {
  it("returns true when stage is before current", () => {
    expect(isStageCompleted("penerimaan_order", "racik_bahan")).toBe(true);
  });

  it("returns false when stage is after current", () => {
    expect(isStageCompleted("pengiriman", "racik_bahan")).toBe(false);
  });
});

describe("isStageActive", () => {
  it("returns true when current stage matches", () => {
    expect(isStageActive("racik_bahan", "racik_bahan")).toBe(true);
  });

  it("returns false for different stage", () => {
    expect(isStageActive("racik_bahan", "lebur_bahan")).toBe(false);
  });
});

describe("isStageUpcoming", () => {
  it("returns true when stage is after current", () => {
    expect(isStageUpcoming("pengiriman", "racik_bahan")).toBe(true);
  });

  it("returns false when stage is before current", () => {
    expect(isStageUpcoming("penerimaan_order", "racik_bahan")).toBe(false);
  });
});
