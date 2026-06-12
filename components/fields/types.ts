// components/fields/types.ts

export type TransactionType = "input" | "output" | "waste" | "return";
export type MaterialType =
  | "gold"
  | "silver"
  | "platinum"
  | "alloy"
  | "gemstone"
  | "other";

export interface MaterialRow {
  transaction_type: TransactionType;
  material_type: MaterialType;
  karat: number | "";
  weight_grams: number | "";
  notes: string;
}

export interface QualityRow {
  check_key: string;
  passed: boolean;
  notes: string;
}

export interface ComplRow {
  item_key: string;
  checked: boolean;
  notes: string;
}

export interface CertRow {
  certificate_type: string;
  certificate_number: string;
  issuing_body: string;
  is_verified: boolean;
  notes: string;
}

export interface PaymentRow {
  type: string;
  amount: number | "";
  method: string;
  reference_no: string;
  paid_at: string;
  notes: string;
}

export interface FieldOption {
  value: string;
  label: string;
  group?: string;
}

export interface FieldItem {
  key: string;
  label: string;
  required?: boolean;
}

export interface Field {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: FieldOption[];
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  transactionTypes?: TransactionType[];
  items?: FieldItem[];
  allowedFileTypes?: string[];
  accept?: string;
  maxSize?: number;
}

export const TX_TYPE_LABELS: Record<TransactionType, string> = {
  input: "Input (Masuk)",
  output: "Output (Keluar)",
  waste: "Sisa / Limbah",
  return: "Kembali",
};

export const MAT_TYPE_LABELS: Record<MaterialType, string> = {
  gold: "Emas",
  silver: "Perak",
  platinum: "Platinum",
  alloy: "Campuran (Alloy)",
  gemstone: "Batu Permata",
  other: "Lainnya",
};

export const ALL_TX_TYPES: TransactionType[] = ["input", "output", "waste", "return"];

export const ALL_MAT_TYPES: MaterialType[] = [
  "gold",
  "silver",
  "platinum",
  "alloy",
  "gemstone",
  "other",
];

export const iCls =
  "w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-3 text-[13px] text-stone-700 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export const sCls = iCls + " appearance-none";

export const lCls = "mb-1 block text-[10px] uppercase tracking-wider text-stone-400";
