import { Page } from "@playwright/test";

export async function mockSupabaseSession(page: Page, user: {
  id: string;
  email: string;
  role: string;
}) {
  const sessionData = {
    access_token: "fake-access-token",
    refresh_token: "fake-refresh-token",
    expires_at: Date.now() + 3600,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      user_metadata: { role: user.role, full_name: "Test User" },
    },
  };

  await page.evaluate((data) => {
    const key = "sb-" + (window as any).__SUPABASE_PROJECT_ID + "-auth-token";
    localStorage.setItem(key, JSON.stringify(data));

    localStorage.setItem(
      "app-session",
      JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        full_name: data.user.user_metadata.full_name,
        is_workshop: false,
      }),
    );
  }, sessionData);
}
