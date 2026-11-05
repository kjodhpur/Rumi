import { expect, test, type Browser } from "@playwright/test";
import {
  admin,
  createStaff,
  createStudent,
  deleteUsers,
  expectAccessible,
  ready,
  signIn,
  type Student,
} from "./support";

/** §5: check-in → risk → RA alert with consent, and no alert without it. */
const created: string[] = [];
const hall = `E2E Hall ${Date.now().toString(36)}`;
test.afterAll(async () => deleteUsers(created));

async function movedIn(student: Student) {
  const { data } = await admin
    .from("assignments")
    .insert({
      user_id: student.id,
      school_id: "asu",
      building: hall,
      room: "12",
      moved_in_at: "2027-08-16",
    })
    .select("id")
    .single();
  // A rough check-in two weeks ago: one more rough one makes a high read.
  await admin.from("checkins").insert({
    assignment_id: data!.id,
    user_id: student.id,
    due_on: "2027-08-30",
    score: 2,
    submitted_at: new Date(Date.now() - 14 * 86_400_000).toISOString(),
  });
}

async function sendRoughCheckin(browser: Browser, student: Student, share: boolean) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, student.email);
  await page.goto("/check-in");
  await ready(page);
  await page.getByRole("radio", { name: "1, rough" }).click();
  const toggle = page.getByRole("switch", { name: "Share this check-in with my RA" });
  if (share) await toggle.click();
  else await expect(toggle).toBeDisabled();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Send check-in" }).click();
  await expect(page.getByText("This needs attention").first()).toBeVisible();
  return { context, page };
}

test("a rough check-in alerts the student's RA only when they chose to share", async ({
  browser,
  page,
}) => {
  const sharer = await createStudent("Sasha");
  const private_ = await createStudent("Priya");
  created.push(sharer.email, private_.email);
  await movedIn(sharer);
  await movedIn(private_);
  // Only Sasha turned on check-in sharing in Privacy.
  await admin
    .from("consents")
    .insert({ user_id: sharer.id, school_id: "asu", kind: "checkins", version: "e2e" });
  const ra = await createStaff("ra", { buildings: [hall] });
  created.push(ra.email);

  const a = await sendRoughCheckin(browser, sharer, true);
  await expect(a.page.getByText("We let your RA know.")).toBeVisible();
  const b = await sendRoughCheckin(browser, private_, false);
  await expect(b.page.getByText("We let your RA know.")).toHaveCount(0);

  // The RA sees Sasha's case, in their building, and nothing about Priya.
  await signIn(page, ra.email);
  await page.goto("/staff/ra");
  await ready(page);
  const card = page.getByRole("listitem").filter({ hasText: sharer.firstName });
  await expect(card).toBeVisible();
  await expect(card.getByText("High risk")).toBeVisible();
  await expect(card.getByText(hall)).toBeVisible();
  await expect(page.getByText(private_.firstName)).toHaveCount(0);
  await expectAccessible(page);

  // The alert reached the RA's notifications too.
  const { data: notes } = await admin
    .from("notifications")
    .select("title")
    .eq("user_id", ra.id)
    .eq("type", "ra_followup");
  expect(notes?.map((n) => n.title)).toEqual([`A check-in in ${hall} needs a look`]);

  await a.context.close();
  await b.context.close();
});
