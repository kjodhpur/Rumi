import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { deleteUsers, ready, signIn, uniqueEmail } from "./support";

const created: string[] = [];
test.afterAll(async () => deleteUsers(created));
test.use({ reducedMotion: "reduce" });

const next = (page: Page) => page.getByRole("button", { name: /^(Continue|Finish & see matches)$/ }).last().click();

test("new student completes onboarding and lands on ranked matches", async ({ page }) => {
  const email = uniqueEmail("onboard");
  created.push(email);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/onboarding/);

  // Basics — validation first, then real answers.
  await next(page);
  await expect(page.getByText(/first name/i).first()).toBeVisible();
  await page.getByLabel("First name").fill("Riley");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByRole("radio", { name: "Woman" }).click();
  await page.getByRole("radio", { name: "Junior" }).click();
  await page.getByLabel("Major").fill("Nursing");
  await next(page);

  // Photos — upload, crop, confirm.
  await expect(page.getByText("Add a few photos.")).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add a photo" }).first().click();
  await (await chooser).setFiles(path.join(__dirname, "fixtures", "portrait.jpg"));
  await expect(page.getByText("Crop your photo")).toBeVisible();
  await page.getByRole("button", { name: "Use photo" }).click();
  await expect(page.getByAltText("Your cover photo")).toBeVisible({ timeout: 20_000 });
  await next(page);

  // About — autosaves; a reload keeps the answer.
  await expect(page.getByText("Introduce yourself.")).toBeVisible();
  const bio = "Nursing junior with early clinicals. I cook a lot, keep shared spaces tidy, and love a quiet evening.";
  const autosaved = page.waitForResponse((res) => res.request().method() === "POST" && Boolean(res.request().headers()["next-action"]));
  await page.getByLabel("Your bio").fill(bio);
  expect((await autosaved).ok()).toBe(true);
  await page.reload();
  await ready(page);
  await expect(page.getByLabel("Your bio")).toHaveValue(bio);
  await next(page);

  await expect(page.getByText("What are you looking for?")).toBeVisible();
  await page.getByLabel("Ideal move-in date").fill("2027-08-10");
  await next(page);

  await expect(page.getByText("Where do you want to live?")).toBeVisible();
  await page.getByRole("button", { name: /Tempe — near campus/ }).click();
  await next(page);

  await expect(page.getByText("How do you live, day to day?")).toBeVisible();
  await next(page);
  await expect(page.getByText("A few habits.")).toBeVisible();
  await next(page);
  await expect(page.getByText("What matters most?")).toBeVisible();
  await next(page);
  await expect(page.getByText("Any dealbreakers?")).toBeVisible();
  await next(page);

  // The music step only exists when Spotify is enabled for this deployment.
  const music = page.getByText("Bring your music.");
  const finish = page.getByRole("button", { name: "See my matches" });
  await expect(music.or(finish)).toBeVisible({ timeout: 20_000 });
  if (await music.isVisible()) await next(page);
  await finish.click();
  await expect(page).toHaveURL(/\/matches/);
  await ready(page);
  await expect(page.locator("article").first()).toBeVisible({ timeout: 20_000 });
});
