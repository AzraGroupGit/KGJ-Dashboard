// lib/schemas/lead-input.ts

import { z } from "zod";

export const LeadInputSchema = z
  .object({
    lead_masuk: z
      .number({ message: "Lead Masuk harus berupa angka" })
      .int()
      .positive("Lead Masuk harus berupa angka positif"),
    closing: z
      .number({ message: "Closing harus berupa angka" })
      .int()
      .positive("Closing harus berupa angka positif"),
    omset: z
      .number({ message: "Omset harus berupa angka" })
      .int()
      .nonnegative("Omset harus berupa angka positif"),
    notes: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.closing > data.lead_masuk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Closing tidak boleh melebihi Lead Masuk",
        path: ["closing"],
      });
    }
  });

export type LeadInputData = z.infer<typeof LeadInputSchema>;
