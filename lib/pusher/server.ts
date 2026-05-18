import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function notifyUser(userId: string, notification: {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  created_at: string;
}) {
  await pusher.trigger(`private-user-${userId}`, "new-notification", notification);
}
