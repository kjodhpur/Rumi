import { expect, test } from "@playwright/test";
import { createStudent, deleteUsers, recomputeScores, signIn, type Student } from "./support";

let student: Student;
test.beforeAll(async () => {
  student = await createStudent("Morgan");
  await recomputeScores();
});
test.afterAll(async () => deleteUsers([student.email]));
test.use({ reducedMotion: "reduce" });

const scoresOnPage = async (page: import("@playwright/test").Page) =>
  (await page.locator("article[aria-label]").evaluateAll((cards) => cards.map((c) => c.getAttribute("aria-label") ?? ""))).map(
    (label) => Number(label.match(/(\d+)% match/)?.[1] ?? NaN),
  );

test("matches are ranked, explained, filterable and savable", async ({ page }) => {
  await signIn(page, student.email);
  await expect(page).toHaveURL(/\/matches/);

  // Ranked best-first, every card with a score.
  await expect(page.locator("article[aria-label]").first()).toBeVisible();
  const scores = await scoresOnPage(page);
  expect(scores.length).toBeGreaterThan(3);
  expect(scores.every((s) => s >= 0 && s <= 100)).toBe(true);
  expect([...scores].sort((a, b) => b - a)).toEqual(scores);

  // Opening a card shows the profile with the reasons behind the score.
  const first = page.locator("article[aria-label]").first();
  const name = (await first.getAttribute("aria-label"))!.split(",")[0];
  await first.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/profile\//);
  await expect(page.getByText(/Why you match/i).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/matches/);

  // Save, then find them in the Saved view.
  await page.getByRole("button", { name: `Save ${name}` }).click();
  await expect(page.getByRole("button", { name: `Remove ${name} from saved` })).toBeVisible();
  await page.getByRole("radio", { name: /Saved/ }).click();
  await expect(page).toHaveURL(/view=saved/);
  await expect(page.locator(`article[aria-label^="${name},"]`)).toBeVisible();
  await page.getByRole("radio", { name: /For you/ }).click();
  await expect(page).not.toHaveURL(/view=saved/);
  await expect(page.locator("article[aria-label]").nth(1)).toBeVisible();

  // Filters narrow the list and show as removable chips.
  await page.getByRole("button", { name: /^Filters/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await sheet.getByRole("button", { name: "Senior" }).click();
  await expect(sheet.getByRole("button", { name: "Senior" })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByRole("button", { name: "Show matches" }).click();
  await expect(page).toHaveURL(/year=senior/);
  await expect(page.getByRole("button", { name: "Remove filter: Senior" })).toBeVisible();
  const years = await page
    .locator("article[aria-label]")
    .evaluateAll((cards) => cards.map((card) => card.querySelector("p")?.textContent ?? ""));
  expect(years.every((meta) => meta.startsWith("Senior"))).toBe(true);
  await page.getByRole("button", { name: "Remove filter: Senior" }).click();
  await expect(page).not.toHaveURL(/year=senior/);
});
