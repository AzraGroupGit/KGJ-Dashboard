// app/api/auth/logout/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.json(
      { success: true, message: "Logout berhasil!" },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Logout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat logout!" },
      { status: 500 },
    );
  }
}
