import { describe, expect, it } from "vitest";
import {
  canValidateIntake,
  requiresPreReceiptValidation,
} from "@/lib/legacy/intake";

describe("legacy intake policy", () => {
  const policies = [
    { brand_code: "MP", requires_pre_receipt_validation: true, is_active: true },
    { brand_code: "KGJ", requires_pre_receipt_validation: false, is_active: true },
    { brand_code: "HJZ", requires_pre_receipt_validation: false, is_active: true },
  ];

  it("menahan brand MP sebelum tracking penerimaan order", () => {
    expect(requiresPreReceiptValidation(policies, "MP")).toBe(true);
  });

  it("mempertahankan alur KGJ dan HJZ", () => {
    expect(requiresPreReceiptValidation(policies, "KGJ")).toBe(false);
    expect(requiresPreReceiptValidation(policies, "HJZ")).toBe(false);
  });

  it("tidak menerapkan policy nonaktif atau brand yang tidak dikenal", () => {
    expect(
      requiresPreReceiptValidation(
        [{ brand_code: "MP", requires_pre_receipt_validation: true, is_active: false }],
        "MP",
      ),
    ).toBe(false);
    expect(requiresPreReceiptValidation(policies, "UNKNOWN")).toBe(false);
  });
});

describe("intake validator permission", () => {
  it("mengizinkan permission validasi intake tanpa mengecek nama role", () => {
    expect(canValidateIntake({ can_validate_intake: true })).toBe(true);
    expect(canValidateIntake({ can_read: true })).toBe(false);
  });
});
