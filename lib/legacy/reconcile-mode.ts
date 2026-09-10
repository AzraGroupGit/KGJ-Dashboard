export type ReconcileMode = "apply" | "disabled";

export function getReconcileMode(value = process.env.LEGACY_RECONCILE_MODE): ReconcileMode {
  return value === "apply" ? "apply" : "disabled";
}
