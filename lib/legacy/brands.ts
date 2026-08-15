// lib/legacy/brands.ts
// Multi-brand constants. Sync with Yii2 brand table.

export const BRANDS: Record<number, { code: string; name: string }> = {
  1: { code: "KGJ", name: "Kota Gede Jewellery" },
  2: { code: "HJZ", name: "Hijaz" },
  3: { code: "MP", name: "Marketplace" },
};

export function getBrandPrefix(kodeOrder: string): string | null {
  const match = kodeOrder.match(/^([A-Z]+)\d/);
  return match ? match[1] : null;
}

export function getBrandName(idBrand: number | null | undefined): string {
  if (idBrand == null) return "KGJ";
  return BRANDS[idBrand]?.name ?? `Brand #${idBrand}`;
}
