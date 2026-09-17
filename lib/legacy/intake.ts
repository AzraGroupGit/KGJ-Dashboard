export const INTAKE_VALIDATION_PERMISSION = "can_validate_intake";

export type IntakeState =
  | "pending_spv_cs_validation"
  | "approved_spv_cs"
  | "returned_for_revision"
  | "rejected_by_spv_cs"
  | "cancelled_from_source";

export interface BrandIntakePolicy {
  brand_code: string;
  requires_pre_receipt_validation: boolean;
  is_active: boolean;
}

export function requiresPreReceiptValidation(
  policies: BrandIntakePolicy[],
  brandCode: string,
): boolean {
  const policy = policies.find((item) => item.brand_code === brandCode);
  return Boolean(policy?.is_active && policy.requires_pre_receipt_validation);
}

export function canValidateIntake(
  permissions: Record<string, unknown> | null | undefined,
): boolean {
  return permissions?.[INTAKE_VALIDATION_PERMISSION] === true;
}
