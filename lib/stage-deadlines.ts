import { getIndonesianHolidays } from "@/lib/working-days";

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

export function getStageDeadline(deadline: string, stage: string): string | null {
  const rule = STAGE_H_DAYS[stage];
  if (!rule) return null;
  return subtractWorkingDays(deadline, rule.hDays);
}

export interface StageDeadlineStatus {
  targetDate: string;
  isOverdue: boolean;
  daysRemaining: number;
  label: string;
}

export function getStageDeadlineStatus(deadline: string, stage: string): StageDeadlineStatus | null {
  const rule = STAGE_H_DAYS[stage];
  if (!rule) return null;

  const targetDate = subtractWorkingDays(deadline, rule.hDays);
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
