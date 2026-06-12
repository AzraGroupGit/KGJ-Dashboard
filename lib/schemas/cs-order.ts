import { z } from "zod";

export const OrderFormDataSchema = z.object({
  tglChat: z.string().min(1, "Tanggal chat wajib diisi"),
  tglOrder: z.string().min(1, "Tanggal order wajib diisi"),
  tglAcara: z.string(),
  acara: z.string(),
  kategori: z.string(),
  deadline: z.string(),
  orderVia: z.string(),
  sumber: z.string(),
  sumberMedia: z.string(),
  dariArtis: z.string(),
  dariArtisDetail: z.string(),
  harga: z.string(),
  dpPercent: z.string(),
  dp: z.string(),
  namaLengkap: z.string().min(1, "Nama lengkap wajib diisi"),
  alamatPengiriman: z.string(),
  kelurahan: z.string(),
  kecamatan: z.string(),
  kabupatenKota: z.string(),
  provinsi: z.string(),
  kodepos: z.string(),
  noWA: z.string(),
  email: z.string(),
  instagram: z.string(),
  ukuranPria: z.string(),
  ukuranWanita: z.string(),
  alatUkur: z.string(),
  ukiranPria: z.string(),
  ukiranWanita: z.string(),
  ukiranCincinPria: z.string(),
  ukiranCincinWanita: z.string(),
  font: z.string(),
  laserPosition: z.string(),
  jenisCincinPria: z.string(),
  jenisCincinWanita: z.string(),
  gramasiPria: z.string(),
  gramasiWanita: z.string(),
  jenisCincinFeatures: z.array(z.string()),
  modelBentukPria: z.array(z.string()),
  microsettingPria: z.array(z.string()),
  detailLaserPria: z.array(z.string()),
  detailFinishingPria: z.array(z.string()),
  modelBentukWanita: z.array(z.string()),
  microsettingWanita: z.array(z.string()),
  detailLaserWanita: z.array(z.string()),
  detailFinishingWanita: z.array(z.string()),
  pengiriman: z.string(),
  box: z.string(),
  transferKeBank: z.string(),
  keteranganTambahan: z.string(),
});

export type OrderFormData = z.infer<typeof OrderFormDataSchema>;

export const OrderFormDataPublicSchema = OrderFormDataSchema.extend({
  noWA: z.string().min(1, "Nomor WhatsApp wajib diisi"),
  alamatPengiriman: z.string().min(1, "Alamat pengiriman wajib diisi"),
});

export type OrderFormDataPublic = z.infer<typeof OrderFormDataPublicSchema>;

export function getOrderFormErrors(
  result: z.ZodError<OrderFormData>,
): Partial<Record<keyof OrderFormData, string>> {
  const errors: Partial<Record<keyof OrderFormData, string>> = {};
  for (const issue of result.issues) {
    const path = issue.path[0] as keyof OrderFormData;
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
