import { StageName } from "./tracking.service";

interface LiveOrderSupportingData {
  has_tukang?: boolean;
  has_opr_micro?: boolean;
  has_opr_finishing?: boolean;
  has_qc?: boolean;
  tgl_selesai?: string | null;
  id_status?: number;
}

export function mapLiveStatusToStage(data: LiveOrderSupportingData): StageName {
  if (data.tgl_selesai) {
    return "selesai";
  }

  if (data.has_qc) {
    return "qc";
  }

  if (data.has_opr_finishing) {
    return "finishing";
  }

  if (data.has_opr_micro) {
    return "cetak";
  }

  if (data.has_tukang) {
    return "persiapan_bahan";
  }

  if (data.id_status) {
    return mapNumericStatus(data.id_status);
  }

  return "order_diterima";
}

function mapNumericStatus(idStatus: number): StageName {
  const mapping: Record<number, StageName> = {
    1: "order_diterima",
    2: "persiapan_bahan",
    3: "racik_bahan",
    4: "cetak",
    5: "finishing",
    6: "qc",
    7: "packing",
    8: "pengiriman",
    9: "selesai",
  };
  return mapping[idStatus] ?? "order_diterima";
}
