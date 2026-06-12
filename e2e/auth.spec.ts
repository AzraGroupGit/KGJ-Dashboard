import { test, expect } from "@playwright/test";

test.describe("Unauthenticated access", () => {
  test("login page loads successfully", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { name: /selamat datang|login|masuk/i }),
    ).toBeVisible();
  });

  test("protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard/supervisor/monitoring");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect=");
  });

  test("workshop login page is accessible without auth", async ({ page }) => {
    const res = await page.goto("/workshop/login");
    expect(res?.status()).toBe(200);
  });
});

test.describe("Login page content", () => {
  test("has email and password fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("shows error on empty submit", async ({ page }) => {
    await page.goto("/login");

    const submitBtn = page.getByRole("button", { name: /masuk/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await expect(
        page.locator('[class*="error"], [class*="Error"], [role="alert"]'),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
