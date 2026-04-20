// lib/auth/session.ts

/**
 * Client-side helper untuk baca data user dari localStorage.
 *
 * Session otoritatif berada di cookie Supabase (dibaca oleh middleware).
 * localStorage hanya dipakai untuk mengisi UI dengan cepat tanpa perlu
 * request ke server tiap render.
 */

import type { AppRole } from "@/lib/routes";

export interface UserBranch {
  id: string;
  name: string;
  code: string;
}

export interface ClientUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  branch: UserBranch | null;
}

/**
 * Baca data user dari localStorage. Return null kalau tidak ada atau rusak.
 * SSR-safe: kalau dipanggil di server (window undefined), return null.
 */
export function getClientUser(): ClientUser | null {
  if (typeof window === "undefined") return null;

  const role = localStorage.getItem("userRole");
  const email = localStorage.getItem("userEmail");
  const fullName = localStorage.getItem("userName");
  const id = localStorage.getItem("userId");
  const branchRaw = localStorage.getItem("userBranch");

  if (!role || !email || !fullName || !id) return null;
  if (!["superadmin", "cs", "marketing"].includes(role)) return null;

  let branch: UserBranch | null = null;
  if (branchRaw) {
    try {
      branch = JSON.parse(branchRaw);
    } catch {
      branch = null;
    }
  }

  return {
    id,
    email,
    fullName,
    role: role as AppRole,
    branch,
  };
}

/**
 * Hapus semua data user di localStorage. Dipanggil saat logout.
 */
export function clearClientUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("userRole");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
  localStorage.removeItem("userBranch");
}
