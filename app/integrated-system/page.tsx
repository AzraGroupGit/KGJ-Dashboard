"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientUser } from "@/lib/auth/session";

export default function IntegratedSystemPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getClientUser();
    if (user?.role === "superadmin") {
      router.replace("/integrated-system/dashboard/admin");
    } else {
      router.replace("/integrated-system/dashboard/supervisor");
    }
  }, [router]);

  return null;
}
