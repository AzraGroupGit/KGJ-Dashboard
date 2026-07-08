"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BrandHeader from "@/components/qr/BrandHeader";
import { getClientUser, clearClientUser, type ClientUser } from "@/lib/auth/session";
import { supabase } from "@/lib/supabase/client";
import { Key } from "lucide-react";

export default function IntegratedSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [workerRoleName, setWorkerRoleName] = useState<string | null>(null);

  const isWorkshopPage = pathname.startsWith("/integrated-system/workshop/");
  const isWorkerPage = pathname.startsWith("/integrated-system/dashboard/worker");

  useEffect(() => {
    if (isWorkshopPage) {
      setAuthState("authenticated");
      return;
    }

    if (isWorkerPage) {
      supabase.auth.getUser().then(async ({ data }) => {
        if (data?.user) {
          setClientUser({
            id: data.user.id,
            email: data.user.email ?? "",
            fullName: data.user.user_metadata?.full_name ?? "",
            role: "management",
            username: null,
            roleDetail: null,
            branch: null,
          });
          setAuthState("authenticated");

          const { data: profile } = await supabase
            .from("users")
            .select("role:roles!users_role_id_fkey(name, allowed_stages)")
            .eq("id", data.user.id)
            .single();
          if (profile) {
            const role = Array.isArray(profile.role) ? profile.role[0] : profile.role;
            const stages = (role?.allowed_stages ?? []) as string[];
            setWorkerRoleName(
              stages.length > 0
                ? stages.filter((s: string) => !s.startsWith("approval_")).join(", ")
                : role?.name ?? null,
            );
          }
        } else {
          router.replace("/integrated-system/workshop/login");
        }
      });
      return;
    }

    const user = getClientUser();
    if (!user) {
      setAuthState("unauthenticated");
      router.replace("/login?from=integrated-system");
      return;
    }

    setClientUser(user);
    setAuthState("authenticated");
  }, [pathname, router, isWorkshopPage, isWorkerPage]);

  if (authState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#26211c]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return null;
  }

  if (isWorkshopPage) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans antialiased flex flex-col">
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
          {children}
        </main>
        <footer className="relative z-10 mt-auto pb-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-300">
            Integrated Order Tracking System
          </p>
        </footer>
      </div>
    );
  }

  if (isWorkerPage) {
    const isHistory = pathname.startsWith("/integrated-system/dashboard/worker/history");
    return (
      <div className="min-h-screen bg-stone-50 font-sans antialiased flex flex-col">
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
          <BrandHeader subtitle="Order Tracking" />

          {clientUser && (
            <div className="w-full max-w-[420px] mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
              <p className="text-[10px] mb-4 font-medium uppercase tracking-wider text-stone-400">
                Masuk sebagai
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold text-stone-800">
                  {clientUser.fullName}
                </p>
                <Link
                  href="/integrated-system/workshop/settings/pin"
                  className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1"
                >
                  <Key className="h-3 w-3" strokeWidth={1.5} />
                  Pengaturan PIN
                </Link>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                {workerRoleName && (
                  <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 truncate max-w-[220px]">
                    {workerRoleName}
                  </span>
                )}
                {!workerRoleName && <span />}
                <button
                  onClick={() => {
                    clearClientUser();
                    supabase.auth.signOut();
                    router.replace("/integrated-system/workshop/login");
                  }}
                  className="text-[11px] text-stone-400 hover:text-red-500 transition-colors"
                >
                  Keluar
                </button>
              </div>
            </div>
          )}

          <div className="w-full max-w-[420px]">
            <div className="flex mb-3 border-b border-stone-200">
              <Link
                href="/integrated-system/dashboard/worker"
                className={`flex-1 pb-2.5 text-[13px] font-medium text-center transition-colors border-b-2 ${
                  !isHistory ? "border-amber-500 text-stone-800" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Order Aktif
              </Link>
              <Link
                href="/integrated-system/dashboard/worker/history"
                className={`flex-1 pb-2.5 text-[13px] font-medium text-center transition-colors border-b-2 ${
                  isHistory ? "border-amber-500 text-stone-800" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Riwayat
              </Link>
            </div>
          </div>

          <div className="w-full">{children}</div>
        </main>
        <footer className="relative z-10 mt-auto pb-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-300">
            Integrated Order Tracking System
          </p>
        </footer>
      </div>
    );
  }

  const role = clientUser?.role ?? "superadmin";
  const displayRole = role === "management" ? "supervisor" : role;
  const sidebarRole =
    role === "superadmin" ? "integrated_superadmin" : "integrated_supervisor";

  return (
    <div className="flex h-screen bg-[#26211c]">
      <Sidebar role={sidebarRole} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header userEmail={clientUser?.email ?? ""} role={displayRole} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
