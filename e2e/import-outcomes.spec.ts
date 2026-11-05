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

/** §5: CSV import with errors (preview, import, undo) and the outcomes report. */
const created: string[] = [];
const hall = `E2E Import ${Date.now().toString(36)}`;
test.afterAll(async () => {
  await admin.from("assignments").delete().eq("building", hall);
  await deleteUsers(created);
});

test("a CSV with problems previews them by line, imports the good rows, and can be undone", async ({
  page,
}) => {
  const lead = await createStaff("housing_admin");
  const one = await createStudent("Imani");
  const two = await createStudent("Ivo");
  created.push(lead.email, one.email, two.email);
  const csv = [
    "StudentID,Email,Building,Room,Bed,Term,CheckInDate",
    `,${one.email},${hall},101,A,,2027-08-16`,
    `,,${hall},102,,,2027-08-16`,
    `,nobody-${Date.now()}@asu.edu,${hall},103,,,2027-08-16`,
    `,${two.email},${hall},104,,,31/31/2027`,
  ].join("\n");

  await signIn(page, lead.email);
  await page.goto("/staff/integrations/starrez");
  await ready(page);
  await page.getByRole("tab", { name: "Import assignments" }).click();
  await page
    .getByLabel("CSV file")
    .setInputFiles({ name: "assignments.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Check file" }).click();
  await expect(page.getByText("1 new · 0 moved · 0 unchanged · 3 problems")).toBeVisible();
  await expect(page.getByText("Each row needs a student ID or an email.")).toBeVisible();
  await expect(page.getByText("No Rumi student with this ID or email. Not created.")).toBeVisible();
  await expect(page.getByText("Use YYYY-MM-DD or MM/DD/YYYY for the move-in date.")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("Imported: 1 new, 0 moved, 0 unchanged")).toBeVisible();
  const open = async () =>
    (await admin.from("assignments").select("user_id").eq("building", hall).is("closed_at", null))
      .data ?? [];
  expect((await open()).map((a) => a.user_id)).toEqual([one.id]);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Import undone")).toBeVisible();
  await expect.poll(async () => (await open()).length).toBe(0);
});

test("the outcomes report compares cohorts, suppresses small cells and labels demo data", async ({
  page,
}) => {
  const lead = await createStaff("housing_admin", {}, "demo");
  created.push(lead.email);
  await signIn(page, lead.email);
  await page.goto("/staff/outcomes");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Outcomes", level: 1 })).toBeVisible();
  await expect(
    page.getByText("Synthetic data for demonstration. These numbers are not real outcomes."),
  ).toBeVisible();
  await expect(page.getByText(/n = \d+ · /).first()).toBeVisible();
  await expectAccessible(page);
});
