import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUsers, ready, signIn, uniqueEmail } from "./support";

/** Phase 9 white-label: a housing admin brands staff screens and the school landing page. */
const created: string[] = [];
let brandingBefore: unknown = null;

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

test.beforeAll(async () => {
  const { data } = await admin.from("schools").select("branding").eq("id", "asu").single();
  brandingBefore = data?.branding ?? {};
  await admin.from("schools").update({ branding: {} }).eq("id", "asu");
});

test.afterAll(async () => {
  await deleteUsers(created);
  const { data: files } = await admin.storage.from("school-branding").list("asu");
  if (files?.length)
    await admin.storage.from("school-branding").remove(files.map((f) => `asu/${f.name}`));
  await admin
    .from("schools")
    .update({ branding: (brandingBefore ?? {}) as Record<string, never> })
    .eq("id", "asu");
});

test("a housing admin sets the school's name, logo and accent; Ember and the wordmark stay", async ({
  page,
}) => {
  const email = uniqueEmail("branding");
  created.push(email);
  const { data: staffUser } = await admin.auth.admin.createUser({ email, email_confirm: true });
  await admin
    .from("profiles")
    .update({ is_staff: true, first_name: "Robin", last_initial: "B" })
    .eq("id", staffUser.user!.id);
  await admin
    .from("staff_members")
    .insert({ user_id: staffUser.user!.id, school_id: "asu", role: "housing_admin", scopes: {} });

  await signIn(page, email);
  await page.goto("/staff/settings/branding");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Branding", level: 1 })).toBeVisible();

  // Logo: checked by its bytes on the server.
  await page.locator("#logo-file").setInputFiles(path.join(__dirname, "fixtures", "logo.png"));
  await expect(page.getByText("Logo updated")).toBeVisible();
  await expect(page.getByAltText("ASU logo")).toBeVisible();

  // A pale accent that would vanish on Rumi's pages is refused before saving.
  await page.getByLabel("Display name").fill("Sun Devils");
  await page.getByLabel("Secondary accent (optional)").fill("#fafafa");
  await expect(page.getByText("That color is too light to see on Rumi's pages.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save branding" })).toBeDisabled();
  await page.getByLabel("Secondary accent (optional)").fill("#8c1d40");
  await page.getByRole("button", { name: "Save branding" }).click();
  await expect(page.getByText("Branding saved")).toBeVisible();
  await expectAccessible(page);

  // Staff chrome: Rumi's wordmark plus "Rumi for <name>".
  await page.goto("/staff");
  await ready(page);
  // The sidebar copy is hidden on phones; whichever header is showing carries it.
  await expect(
    page.getByText("Rumi for Sun Devils").filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Rumi staff — overview" }).first()).toBeVisible();

  // The school landing page carries the logo and name; Rumi's own colors, Ember included, stay.
  await page.goto("/s/asu");
  await ready(page);
  await expect(page.getByText("for Sun Devils")).toBeVisible();
  await expect(page.getByAltText("Arizona State University logo")).toBeVisible();
  await expect(page.getByRole("link", { name: "Rumi home" })).toBeVisible();
  const kicker = page.getByText("For Arizona State University students");
  expect(await kicker.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(184, 63, 27)"); // --accent-ink
  await expectAccessible(page);

  // Every change is audited.
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("actor_id", staffUser.user!.id)
    .in("action", ["branding_saved", "branding_logo_uploaded"]);
  expect(new Set((audit ?? []).map((a) => a.action))).toEqual(
    new Set(["branding_saved", "branding_logo_uploaded"]),
  );
});
