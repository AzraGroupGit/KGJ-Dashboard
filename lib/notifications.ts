import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/pusher/server";

export async function sendNotification({
  userId,
  title,
  message,
  type,
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string | null;
}) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link: link ?? null,
    })
    .select("id, title, message, type, link, created_at")
    .single();

  if (error || !data) {
    console.error("[sendNotification] insert error:", error);
    return;
  }

  try {
    await notifyUser(userId, {
      id: data.id,
      title: data.title,
      message: data.message,
      type: data.type,
      link: data.link,
      created_at: data.created_at,
    });
  } catch (err) {
    console.error("[sendNotification] pusher error:", err);
  }
}

const APPROVAL_SUPERVISOR: Record<string, "operational_supervisor" | "production_supervisor"> = {
  approval_penerimaan_order: "operational_supervisor",
  approval_racik_bahan: "operational_supervisor",
  approval_qc_1: "operational_supervisor",
  approval_produksi: "production_supervisor",
  approval_qc_2: "operational_supervisor",
};

export function getSupervisorRoleForApproval(approvalStage: string) {
  return APPROVAL_SUPERVISOR[approvalStage] ?? null;
}

export async function findSupervisorIds(
  roleName: "operational_supervisor" | "production_supervisor",
): Promise<string[]> {
  const admin = createAdminClient();

  const { data: roleData } = await admin
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (!roleData) return [];

  const { data: supervisors } = await admin
    .from("users")
    .select("id")
    .eq("role_id", roleData.id)
    .eq("deleted_at", null)
    .in("status", ["active", null]);

  return (supervisors || []).map((s: any) => s.id);
}

export async function notifySupervisors(
  roleName: "operational_supervisor" | "production_supervisor",
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error",
  link?: string | null,
) {
  const ids = await findSupervisorIds(roleName);
  await Promise.allSettled(
    ids.map((userId) =>
      sendNotification({ userId, title, message, type, link }),
    ),
  );
}

export async function notifyCsForOrder(orderId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("cs_orders")
    .select("created_by, order_number")
    .eq("id", orderId)
    .single();
  if (!order) return;
  await sendNotification({
    userId: order.created_by,
    title: "Order Selesai",
    message: `Order ${order.order_number} telah selesai dan diterima pelanggan.`,
    type: "success",
    link: `/dashboard/cs/input-order`,
  });
}
