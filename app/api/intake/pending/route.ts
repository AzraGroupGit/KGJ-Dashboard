import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canValidateIntake, hasIntakeBrand } from "@/lib/legacy/intake";
import { getRoleProps } from "@/lib/auth/session";

async function authorize() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, role:roles!users_role_id_fkey(name, permissions)")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  const role = getRoleProps(profile);
  if (role.name !== "superadmin" && !canValidateIntake(role.permissions)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { admin, role };
}

export async function GET() {
  try {
    const auth = await authorize();
    if ("error" in auth) return auth.error;

    const { data, error } = await auth.admin
      .from("legacy_order_intakes")
      .select(`
        id, legacy_order_id, state, reason, created_at, updated_at,
        legacy_orders!legacy_order_intakes_legacy_order_id_fkey(
          id, kode_order, nama, no_hp, tgl_order, tgl_selesai, catatan,
          komponen, harga_final, jumlah_bayar, sisa_bayar,
          reference_image_pria_url, reference_image_wanita_url, id_brand
        )
      `)
      .in("state", ["pending_spv_cs_validation", "returned_for_revision"])
      .order("updated_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("[GET /api/intake/pending]", error);
      return NextResponse.json({ error: "Gagal mengambil antrean intake" }, { status: 500 });
    }

    const intakeData = auth.role.name === "customer_service_supervisor"
      ? (data ?? []).filter((intake) =>
        hasIntakeBrand(intake.legacy_orders, 3),
      )
      : data ?? [];

    return NextResponse.json({ success: true, data: intakeData });
  } catch (error) {
    console.error("[GET /api/intake/pending]", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
