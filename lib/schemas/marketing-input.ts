import { z } from "zod";

export const MarketingInputSchema = z
  .object({
    channel: z.string().min(1, "Pilih channel marketing"),
    biayaMarketing: z.string().refine(
      (v) => {
        const n = parseInt(v);
        return !isNaN(n) && n > 0;
      },
      "Biaya marketing harus diisi dengan angka positif",
    ),
    leadAll: z.string().refine(
      (v) => {
        const n = parseInt(v);
        return !isNaN(n) && n > 0;
      },
      "Lead All harus diisi dengan angka positif",
    ),
    leadSerius: z.string(),
    closing: z.string(),
    notes: z.string(),
  })
  .refine(
    (data) => {
      const ls = parseInt(data.leadSerius) || 0;
      const la = parseInt(data.leadAll) || 0;
      return ls <= la;
    },
    { message: "Lead Serius tidak boleh melebihi Lead All", path: ["leadSerius"] },
  )
  .refine(
    (data) => {
      const c = parseInt(data.closing) || 0;
      const ls = parseInt(data.leadSerius) || 0;
      return c <= ls;
    },
    { message: "Closing tidak boleh melebihi Lead Serius", path: ["closing"] },
  );

export type MarketingInput = z.infer<typeof MarketingInputSchema>;
