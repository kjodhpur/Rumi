import { expect, test } from "@playwright/test";
import {
  admin,
  createStaff,
  createStudent,
  deleteUsers,
  expectAccessible,
  ready,
  signIn,
} from "./support";

/** §5: revoking consent removes the student from staff screens on the next request. */
const created: string[] = [];
let officeBefore: string | null = null;

test.beforeAll(async () => {
  const { data } = await admin
    .from("schools")
    .select("housing_office_name")
    .eq("id", "asu")
    .single();
  officeBefore = data?.housing_office_name ?? null;
  await admin.from("schools").update({ housing_office_name: "ASU Housing" }).eq("id", "asu");
});

test.afterAll(async () => {
  await deleteUsers(created);
  await admin.from("schools").update({ housing_office_name: officeBefore }).eq("id", "asu");
});

test("housing staff see a sharing student until the student turns sharing off", async ({
  browser,
  page,
}) => {
  const student = await createStudent("Quinn");
  const lead = await createStaff("housing_staff");
  created.push(student.email, lead.email);
  const name = `${student.firstName} T.`;

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await signIn(studentPage, student.email);
  await studentPage.goto("/settings/privacy");
  await ready(studentPage);
  const toggle = studentPage.getByRole("switch", {
    name: "Share my Rumi results with ASU Housing",
  });
  await toggle.click();
  await expect(studentPage.getByText("Sharing turned on")).toBeVisible();

  await signIn(page, lead.email);
  await page.goto("/staff/students");
  await ready(page);
  await expect(page.getByText(name)).toBeVisible();
  await expectAccessible(page);

  await toggle.click();
  await expect(studentPage.getByText("Sharing turned off")).toBeVisible();
  await page.reload();
  await ready(page);
  await expect(page.getByText(name)).toHaveCount(0);

  // Staff reads of the list are audited.
  const { count } = await admin
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", lead.id);
  expect(count ?? 0).toBeGreaterThan(0);
  await studentContext.close();
});
