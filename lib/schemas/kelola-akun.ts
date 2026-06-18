// lib/schemas/kelola-akun.ts

import { z } from "zod";

export const BmsUserSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["superadmin", "customer_service", "marketing"], {
    message: "Role wajib dipilih",
  }),
  branch_id: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "customer_service" && !data.branch_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pilih cabang terlebih dahulu untuk role Customer Service",
      path: ["branch_id"],
    });
  }
});

export const BmsEditUserSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  role: z.enum(["superadmin", "customer_service", "marketing"], {
    message: "Role wajib dipilih",
  }),
  branch_id: z.string().optional(),
});

export const OprprdUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role_id: z.string().min(1, "Role wajib dipilih"),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export const OprprdEditUserSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  role_id: z.string().min(1, "Role wajib dipilih"),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export const SupervisorUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["operational_supervisor", "production_supervisor"], {
    message: "Role wajib dipilih",
  }),
});

export const SupervisorEditUserSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  role: z.enum(["operational_supervisor", "production_supervisor"], {
    message: "Role wajib dipilih",
  }),
});

export const ManagementUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.string().min(1, "Leader role wajib dipilih"),
});

export const ManagementEditUserSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  role: z.string().min(1, "Leader role wajib dipilih"),
});
