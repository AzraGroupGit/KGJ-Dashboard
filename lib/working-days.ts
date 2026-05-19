export function getIndonesianHolidays(year: number): string[] {
  return [
    `${year}-01-01`,
    `${year}-01-27`,
    `${year}-03-01`,
    `${year}-03-31`,
    `${year}-04-01`,
    `${year}-04-18`,
    `${year}-05-01`,
    `${year}-05-12`,
    `${year}-05-26`,
    `${year}-06-01`,
    `${year}-06-15`,
    `${year}-08-17`,
    `${year}-09-16`,
    `${year}-12-25`,
    `${year}-12-26`,
  ];
}

export function countWorkingDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (s >= e) return 0;

  const holidays = getIndonesianHolidays(s.getFullYear());
  let count = 0;
  let cur = new Date(s);

  while (cur < e) {
    const day = cur.getDay();
    const dateStr = cur.toISOString().split("T")[0];
    if (day !== 0 && day !== 6 && !holidays.includes(dateStr)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

export const KATEGORI_THRESHOLDS = [
  { value: "reguler", label: "Reguler 25 hari kerja", minDays: 25 },
  { value: "cepat", label: "Cepat 14 hari kerja", minDays: 14 },
  { value: "kilat", label: "Kilat 7 hari kerja", minDays: 7 },
  { value: "vvip", label: "VVIP 3 hari kerja", minDays: 3 },
] as const;

export function getRecommendedKategori(workingDays: number): string | null {
  for (const k of KATEGORI_THRESHOLDS) {
    if (workingDays >= k.minDays) return k.value;
  }
  return null;
}

export function getWorkingDaysMessage(workingDays: number): string | null {
  if (workingDays < 3) return `Hanya ${workingDays} hari kerja tersedia — tidak cukup untuk paket manapun (min. 3 hari)`;
  return null;
}
