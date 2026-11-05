import { expect, test } from "@playwright/test";
import { admin, createStaff, deleteUsers, expectAccessible, ready, signIn } from "./support";

/** Phase 1.A and 1.B: segment analytics and room-change reasons, aggregates only. */
const created: string[] = [];
const BUILDING = "E2E Hall";

test.afterAll(async () => {
  await deleteUsers(created);
  await admin.from("room_change_requests").delete().eq("school_id", "asu").eq("building", BUILDING);
});

test("segments: changing the dimension redraws the table, and small groups stay hidden", async ({
  page,
}) => {
  // Demo University's seeded students (synthetic, and the same on every seed).
  const analyst = await createStaff("analyst", {}, "demo");
  created.push(analyst.email);
  await signIn(page, analyst.email);
  await page.goto("/staff/analytics/segments");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Segments", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Freshman: / })).toBeVisible();

  await page.getByLabel("Segment by").selectOption("residential_college");
  await expect(page).toHaveURL(/dim=residential_college/);
  await expect(page.getByRole("button", { name: /^Cedar Residential College: / })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Freshman: / })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /by residential college$/ })).toBeVisible();
  await expectAccessible(page);

  // Room changes by learning community: one group is under 5, so the smallest other group is
  // hidden too, or the total minus the rest would give it away.
  await page.getByLabel("Segment by").selectOption("llc");
  await expect(page).toHaveURL(/dim=llc/);
  await page.getByLabel("Metric").selectOption("room_change");
  await expect(page).toHaveURL(/dim=llc&metric=room_change/);
  await expect(page.getByRole("button", { name: /^Honors community: <5/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Women in STEM: Hidden/ })).toBeVisible();
  await expect(page.getByText(/“Hidden” keeps a group under 5/)).toBeVisible();
  await expectAccessible(page);
});

test("room changes: tagging a request updates the reasons chart", async ({ page }) => {
  // Five requests already tagged "Noise" and one imported without a reason.
  const rows = Array.from({ length: 6 }, (_, i) => ({
    school_id: "asu",
    building: BUILDING,
    source: i === 5 ? "import" : "staff",
    reason_keys: i === 5 ? [] : ["noise"],
  }));
  const { error } = await admin.from("room_change_requests").insert(rows);
  expect(error).toBeNull();

  const lead = await createStaff("housing_staff");
  created.push(lead.email);
  await signIn(page, lead.email);
  await page.goto("/staff/analytics/room-changes");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Room changes", level: 1 })).toBeVisible();
  const reasons = page.getByRole("region", { name: "Reasons" });
  await expect(reasons.getByRole("button", { name: "Noise: 5" })).toBeVisible();
  await expect(reasons.getByRole("button", { name: "Untagged: <5" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Tag now" }).click();
  await page.getByRole("group", { name: "Reasons, up to three" }).getByText("Noise").click();
  await page.getByRole("button", { name: "Save tags" }).click();
  await expect(page.getByText("Tags saved")).toBeVisible();
  await expect(reasons.getByRole("button", { name: "Noise: 6" })).toBeVisible();
  await expect(reasons.getByRole("button", { name: /^Untagged/ })).toHaveCount(0);

  // Retagging is audited.
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("actor_id", lead.id)
    .eq("action", "room_change_tagged");
  expect(audit?.length).toBe(1);
});
