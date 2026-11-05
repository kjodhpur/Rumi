import { expect, test } from "@playwright/test";
import {
  MAILPIT,
  admin,
  createStaff,
  createStudent,
  deleteUsers,
  expectAccessible,
  ready,
  recomputeScores,
  signIn,
} from "./support";

/**
 * 0.3 and 1.I: a school routes serious reports to its own office; the student sees where a
 * report goes before sending it; moderators act on it and every action is audited.
 */
const created: string[] = [];
const OFFICE = "ASU Title IX (E2E)";
const OFFICE_EMAIL = `titleix-e2e-${Date.now().toString(36)}@asu.edu`;

test.afterAll(async () => {
  await deleteUsers(created);
  await admin
    .from("escalation_routes")
    .delete()
    .eq("school_id", "asu")
    .eq("category", "harassment");
});

test("a serious report shows its destination, reaches the office, and the moderator's action is audited", async ({
  browser,
  page,
}) => {
  // The housing admin routes harassment reports to the school's office.
  const lead = await createStaff("housing_admin");
  created.push(lead.email);
  await signIn(page, lead.email);
  await page.goto("/staff/settings/escalation");
  await ready(page);
  const card = page
    .locator("div.rounded-xl")
    .filter({ has: page.getByRole("heading", { name: "Harassment or sexual misconduct" }) });
  await card.getByLabel("Destination office name").fill(OFFICE);
  await card.getByLabel("Office email for forwarded reports").fill(OFFICE_EMAIL);
  await card.getByRole("switch", { name: /Toggle active state/ }).click();
  await card.getByRole("button", { name: /^Save .* route$/ }).click();
  await expect(
    page.getByText("Saved the route for harassment or sexual misconduct."),
  ).toBeVisible();
  await expectAccessible(page);

  // A student reports another and sees, before sending, exactly where it goes.
  const reporter = await createStudent("Rowan");
  const reported = await createStudent("Quill");
  created.push(reporter.email, reported.email);
  await recomputeScores();
  const student = await browser.newContext();
  const s = await student.newPage();
  await signIn(s, reporter.email);
  await s.goto(`/profile/${reported.id}`);
  await ready(s);
  await s.getByRole("button", { name: "More options" }).click();
  await s.getByRole("menuitem", { name: "Report Quill" }).click();
  await s.getByRole("switch", { name: "Toggle serious safety escalation" }).click();
  await expect(s.getByText("Official Destination:")).toBeVisible();
  await expect(s.getByText(OFFICE, { exact: true })).toBeVisible();
  await expect(s.getByText(/does not replace campus safety, police, Title IX/)).toBeVisible();
  await expectAccessible(s);
  // Content goes to the office only because the student chose to send it.
  await s.getByRole("switch", { name: `Forward report to ${OFFICE}` }).click();
  await s.getByRole("button", { name: "Submit and forward report" }).click();
  await expect(s.getByText(`We sent it to ${OFFICE}.`, { exact: false })).toBeVisible();
  await student.close();

  await expect
    .poll(
      async () => {
        const res = await fetch(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${OFFICE_EMAIL}`)}`,
        );
        return ((await res.json()).messages ?? []).length;
      },
      { timeout: 20_000 },
    )
    .toBe(1);

  // A moderator warns the reported student from the queue; the action lands in the audit log.
  const moderator = await createStaff("moderator");
  created.push(moderator.email);
  const mod = await browser.newContext();
  const m = await mod.newPage();
  await signIn(m, moderator.email);
  await m.goto("/staff/safety");
  await ready(m);
  const report = m
    .locator("div.rounded-xl")
    .filter({ hasText: "Quill T." })
    .filter({
      has: m.getByRole("button", { name: "Report actions" }),
    });
  await expect(report).toBeVisible();
  await expectAccessible(m);
  await report.getByRole("button", { name: "Report actions" }).click();
  await m.getByRole("menuitem", { name: "Send warning notice" }).click();
  await m.getByLabel("Warning message").fill("Please keep messages respectful.");
  await m.getByRole("button", { name: "Send warning" }).click();
  await expect(m.getByText("Warning notice sent to student.")).toBeVisible();
  await mod.close();

  const { data: audit } = await admin
    .from("audit_log")
    .select("action, entity_id")
    .eq("actor_id", moderator.id)
    .eq("action", "student_warned");
  expect(audit).toEqual([{ action: "student_warned", entity_id: reported.id }]);
});
