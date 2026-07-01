export interface SlotCheckResult {
  kategori: string;
  tgl_order: string;
  label: string;
  max_slots: number;
  overrides: number;
  total_slots: number;
  used: number;
  available: number;
  is_full: boolean;
}

export async function checkSlotAvailability(
  kategori: string,
  tglOrder: string,
): Promise<SlotCheckResult | null> {
  if (!kategori || !tglOrder) return null;
  try {
    const res = await fetch(
      `/api/slots/slot-check?kategori=${encodeURIComponent(kategori)}&tgl_order=${encodeURIComponent(tglOrder)}`,
    );
    const json = await res.json();
    if (json.success) return json.data;
    return null;
  } catch {
    return null;
  }
}

export async function checkAllSlots(
  tglOrder: string,
): Promise<Record<string, boolean>> {
  if (!tglOrder) return {};
  const results = await Promise.all(
    ["reguler", "cepat", "kilat", "kilat_laser_batik", "vvip", "revisi", "marketplace"].map(
      async (k) => {
        const r = await checkSlotAvailability(k, tglOrder);
        return { kategori: k, isFull: r?.is_full ?? false };
      },
    ),
  );
  return Object.fromEntries(results.map((r) => [r.kategori, r.isFull]));
}
