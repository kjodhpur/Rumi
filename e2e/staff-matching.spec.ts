import { expect, test } from "@playwright/test";
import {
  admin,
  createStaff,
  createStudent,
  deleteUsers,
  expectAccessible,
  ready,
  recomputeScores,
  signIn,
} from "./support";

/** 1.D answer-consistency prompts and 1.E accommodation-aware auto-pair. */
const created: string[] = [];

test.afterAll(async () => {
  await deleteUsers(created);
});

test("a consistency prompt is private, never blocks, and goes away when the answer changes", async ({
  page,
}) => {
  // Asleep early, but music and TV usually on.
  const sol = await createStudent("Solenne", { sleep_schedule: 1, noise: 4 });
  created.push(sol.email);
  await signIn(page, sol.email);
  await page.goto("/settings/profile");
  await ready(page);
  await page.getByRole("tab", { name: "Lifestyle" }).click();
  const prompt = page.getByText("Early nights, lively home");
  await expect(prompt).toBeVisible();
  await expect(page.getByText("Only you see this. It doesn't change your score.")).toBeVisible();
  await expectAccessible(page);

  await page
    .getByRole("radiogroup", { name: "Noise at home" })
    .getByRole("radio", { name: "Normal background noise" })
    .click();
  await expect(prompt).toHaveCount(0);
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("preferences")
        .select("noise")
        .eq("user_id", sol.id)
        .single();
      return data?.noise;
    })
    .toBe(3);
  await page.reload();
  await ready(page);
  await page.getByRole("tab", { name: "Lifestyle" }).click();
  await expect(page.getByRole("radiogroup", { name: "Noise at home" })).toBeVisible();
  await expect(prompt).toHaveCount(0);
});

test("an approved accommodation takes an incompatible pair out of auto-pair's proposals", async ({
  page,
}) => {
  // Two compatible students who share with housing; Ines ruled out pets.
  const esme = await createStudent("Esmeralda");
  const ines = await createStudent("Inesita", { dealbreakers: ["pets"] });
  created.push(esme.email, ines.email);
  await admin.from("consents").insert([
    { user_id: esme.id, school_id: "asu", kind: "share_with_housing", version: "e2e" },
    { user_id: ines.id, school_id: "asu", kind: "share_with_housing", version: "e2e" },
  ]);
  await recomputeScores();

  const lead = await createStaff("housing_admin");
  created.push(lead.email);
  await signIn(page, lead.email);
  const pair = page
    .getByRole("listitem")
    .filter({ hasText: "Esmeralda T." })
    .filter({ hasText: "Inesita T." });

  await page.goto("/staff/pairings/auto");
  await ready(page);
  await page.getByLabel("Minimum score").selectOption("50");
  await page.getByRole("button", { name: "Run auto-pair" }).click();
  await expect(page.getByText(/pairs? proposed/)).toBeVisible();
  await expect(pair).toBeVisible();

  // Housing approves an emotional support animal for Esmeralda.
  await page.goto("/staff/accommodations");
  await ready(page);
  await page.getByLabel("Find a student").fill("Esmeralda");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=Esmeralda/);
  await page
    .getByRole("listitem")
    .filter({ hasText: "Esmeralda T." })
    .getByRole("button", { name: "Add" })
    .click();
  await page.getByRole("dialog").getByText("Approved emotional support animal").click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved. Their matches update shortly.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Approved emotional support animal")).toBeVisible();
  await expectAccessible(page);

  // Their mutual score goes once matches are recomputed, so the next run can't propose them.
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("match_scores")
          .select("viewer_id")
          .eq("viewer_id", esme.id)
          .eq("candidate_id", ines.id);
        return data?.length ?? 0;
      },
      { timeout: 20_000 },
    )
    .toBe(0);
  await page.goto("/staff/pairings/auto");
  await ready(page);
  await page.getByLabel("Minimum score").selectOption("50");
  await page.getByRole("button", { name: "Run auto-pair" }).click();
  await expect(page.getByText("No pairs met the minimum score")).toBeVisible();
  await expect(pair).toHaveCount(0);

  // Ines never learns why: her side just has no match with Esmeralda.
  const { data: theirs } = await admin
    .from("match_scores")
    .select("viewer_id")
    .eq("viewer_id", ines.id)
    .eq("candidate_id", esme.id);
  expect(theirs).toEqual([]);
});
