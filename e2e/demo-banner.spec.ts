import { expect, test } from "@playwright/test";
import { admin, createStudent, deleteUsers, signIn } from "./support";

/** Seed spec §6: demo data is labeled on student screens, in the student's language. */
const created: string[] = [];
let schoolWasDemo = false;

test.beforeAll(async () => {
  const { data } = await admin.from("schools").select("is_demo").eq("id", "asu").single();
  schoolWasDemo = Boolean(data?.is_demo);
  await admin.from("schools").update({ is_demo: false }).eq("id", "asu");
});

test.afterAll(async () => {
  await deleteUsers(created);
  await admin.from("schools").update({ is_demo: schoolWasDemo }).eq("id", "asu");
});

const BANNER =
  "Demo data — a fictional school for demonstrations. The people here aren't real students.";

test("real students see no banner; demo accounts and demo schools always do", async ({ page }) => {
  const real = await createStudent("Rena");
  created.push(real.email);
  await signIn(page, real.email);
  await page.goto("/matches");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByText(BANNER)).toHaveCount(0);

  // A demo account.
  await admin.from("profiles").update({ is_demo: true }).eq("id", real.id);
  await page.reload();
  await expect(page.getByRole("note").filter({ hasText: BANNER })).toBeVisible();

  // A demo school, read through the student's own session (RLS), shown on every screen.
  await admin.from("profiles").update({ is_demo: false }).eq("id", real.id);
  await admin.from("schools").update({ is_demo: true }).eq("id", "asu");
  await page.goto("/settings");
  await expect(page.getByText(BANNER)).toBeVisible();

  // In Spanish for a Spanish reader.
  await admin.from("user_settings").update({ locale: "es" }).eq("user_id", real.id);
  await page.context().addCookies([{ name: "rumi_locale", value: "es", url: page.url() }]);
  await page.goto("/groups");
  await expect(page.getByText(/^Datos de demostración: una escuela ficticia/)).toBeVisible();
});
