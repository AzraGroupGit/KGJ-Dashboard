import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, table, record } = body;

    if (type !== "INSERT" || table !== "notifications") {
      return NextResponse.json({ success: true });
    }

    const userId = record?.user_id;
    if (!userId) return NextResponse.json({ success: true });

    await pusher.trigger(`private-user-${userId}`, "new-notification", {
      id: record.id,
      title: record.title,
      message: record.message,
      type: record.type,
      link: record.link ?? null,
      created_at: record.created_at,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook Pusher] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
