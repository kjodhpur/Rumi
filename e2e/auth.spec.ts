import { expect, test } from "@playwright/test";
import { deleteUsers, ready, signIn, uniqueEmail } from "./support";

const created: string[] = [];
test.afterAll(async () => deleteUsers(created));

test("landing page leads to sign-in", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("roommate");
  await page.getByRole("link", { name: /Get started — it's free/ }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("School email")).toBeVisible();
});

test("non-school emails are turned away", async ({ page }) => {
  await page.goto("/login");
  await ready(page);
  await page.getByLabel("School email").fill("someone@gmail.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/school email/i).first()).toBeVisible();
  await expect(page.getByText("Check your inbox.")).toHaveCount(0);
});

test("sign up with a school email, then sign out", async ({ page }) => {
  const email = uniqueEmail("signup");
  created.push(email);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByLabel("First name")).toBeVisible();

  // Private pages now require the session; signing out drops it.
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.waitForURL((url) => url.pathname === "/");
  await page.goto("/matches");
  await expect(page).toHaveURL(/\/login\?next=%2Fmatches/);
});

test("a wrong code is rejected", async ({ page }) => {
  const email = uniqueEmail("badcode");
  created.push(email);
  await page.goto("/login");
  await ready(page);
  await page.getByLabel("School email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Check your inbox.")).toBeVisible();
  await page.getByLabel("6-digit code").fill("000000");
  await expect(page.getByText(/didn't work/)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
