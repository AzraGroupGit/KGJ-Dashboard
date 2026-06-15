// lib/schemas/account.ts

import { z } from "zod";

export const CreateAccountSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role_id: z.string().min(1, "Role wajib dipilih"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
});

export const EditAccountSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  role_id: z.string().min(1, "Role wajib dipilih"),
});

export const ResetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirm: z.string().min(6, "Password minimal 6 karakter"),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password tidak cocok",
      path: ["confirm"],
    });
  }
});

export type CreateAccountData = z.infer<typeof CreateAccountSchema>;
export type EditAccountData = z.infer<typeof EditAccountSchema>;
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
