import { countWorkingDays, getIndonesianHolidays } from "@/lib/working-days";

export const STAGE_H_DAYS: Record<string, { label: string; hDays: number }> = {
  racik_bahan: { label: "Racik & Lebur", hDays: 15 },
  lebur_bahan: { label: "Racik & Lebur", hDays: 15 },
  pembentukan_cincin: { label: "Pembentukan Cincin", hDays: 14 },
  pemasangan_permata: { label: "Microsetting", hDays: 10 },
  cek_kadar: { label: "Cek Kadar", hDays: 8 },
  pemolesan: { label: "Poles", hDays: 8 },
  qc_1: { label: "QC Awal", hDays: 7 },
  laser: { label: "Laser", hDays: 6 },
  finishing: { label: "Finishing", hDays: 3 },
  qc_2: { label: "QC Akhir", hDays: 2 },
  konfirmasi: { label: "Konfirmasi", hDays: 1 },
  packing: { label: "Packing & Pengiriman", hDays: 1 },
  pengiriman: { label: "Packing & Pengiriman", hDays: 1 },
};

const MAX_BASELINE_H_DAYS = 15;

function subtractWorkingDays(endDate: string, workingDays: number): string {
  const date = new Date(endDate);
  let count = 0;
  while (count < workingDays) {
    date.setDate(date.getDate() - 1);
    const day = date.getDay();
    const holidays = getIndonesianHolidays(date.getFullYear());
    const dateStr = date.toISOString().split("T")[0];
    if (day !== 0 && day !== 6 && !holidays.includes(dateStr)) {
      count++;
    }
  }
  return date.toISOString().split("T")[0];
}

function getScaleFactor(tglOrder: string | null | undefined, deadline: string): number {
  if (!tglOrder) return 1;
  const totalWD = countWorkingDays(tglOrder, deadline);
  if (totalWD <= 0) return 1;
  return Math.min(1, totalWD / MAX_BASELINE_H_DAYS);
}

export function getStageDeadline(
  tglOrder: string | null | undefined,
  deadline: string,
  stage: string,
): string | null {
  const rule = STAGE_H_DAYS[stage];
  if (!rule) return null;
  const scale = getScaleFactor(tglOrder, deadline);
  const scaledHDays = Math.round(rule.hDays * scale);
  return subtractWorkingDays(deadline, scaledHDays);
}

export interface StageDeadlineStatus {
  targetDate: string;
  isOverdue: boolean;
  daysRemaining: number;
  label: string;
}

export function getStageDeadlineStatus(
  tglOrder: string | null | undefined,
  deadline: string,
  stage: string,
): StageDeadlineStatus | null {
  const rule = STAGE_H_DAYS[stage];
  if (!rule) return null;

  const scale = getScaleFactor(tglOrder, deadline);
  const scaledHDays = Math.round(rule.hDays * scale);
  const targetDate = subtractWorkingDays(deadline, scaledHDays);
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return {
    targetDate,
    isOverdue: diffDays < 0,
    daysRemaining: diffDays,
    label: rule.label,
  };
}
