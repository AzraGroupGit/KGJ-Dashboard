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
