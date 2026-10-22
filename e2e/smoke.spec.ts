import { test, expect } from "@playwright/test";

test.describe("Rumi v2 smoke", () => {
  test("landing loads with wordmark and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /rumi/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up with asu email/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /how it works/i })).toBeVisible();
  });

  test("login page has magic link + Google", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/asu email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /magic link/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("offline fallback page", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  });

  test("privacy and terms are public", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toContainText(/privacy/i);
    await page.goto("/terms");
    await expect(page.locator("body")).toContainText(/terms/i);
  });
});
