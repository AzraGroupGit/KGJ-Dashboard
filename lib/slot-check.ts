export interface SlotCheckResult {
  kategori: string;
  deadline: string;
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
  deadline: string,
): Promise<SlotCheckResult | null> {
  if (!kategori || !deadline) return null;
  try {
    const res = await fetch(
      `/api/slots/slot-check?kategori=${encodeURIComponent(kategori)}&deadline=${encodeURIComponent(deadline)}`,
    );
    const json = await res.json();
    if (json.success) return json.data;
    return null;
  } catch {
    return null;
  }
}
