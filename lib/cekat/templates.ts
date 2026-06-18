// lib/cekat/templates.ts
//
// Maps logical template names to Cekat template IDs.
// ASSUMPTION: Template IDs below are PLACEHOLDERS. Confirm actual Cekat
// template IDs from the Cekat dashboard before go-live.

export type CekatTemplateName =
  | "order_created"
  | "order_detail"
  | "shipping_update";

const TEMPLATE_MAP: Record<CekatTemplateName, string> = {
  // ASSUMPTION: Replace with real Cekat template IDs
  order_created: "tmpl_order_created",
  order_detail: "tmpl_order_detail",
  shipping_update: "tmpl_shipping_update",
};

export function getTemplateId(name: CekatTemplateName): string {
  const id = TEMPLATE_MAP[name];
  if (!id) throw new Error(`Unknown Cekat template: ${name}`);
  return id;
}
