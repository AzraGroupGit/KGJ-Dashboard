import { describe, expect, it } from "vitest";
import { BRAND_FILTER_OPTIONS, getBrandDisplayName } from "@/lib/legacy/brands";

describe("legacy brand display names", () => {
  it("menampilkan id_brand 3 dari payload Yii2 sebagai MPM", () => {
    expect(getBrandDisplayName(3)).toBe("MPM");
  });

  it("memakai nilai MP dan label MPM agar filter tetap cocok dengan prefix order", () => {
    expect(BRAND_FILTER_OPTIONS).toContainEqual({ value: "MP", label: "MPM" });
  });
});
