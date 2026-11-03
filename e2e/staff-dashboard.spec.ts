import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { admin, createStudent, deleteUsers, ready, recomputeScores, signIn, uniqueEmail, type Student } from "./support";

const created: string[] = [];
let schoolBefore: { is_demo: boolean; housing_office_name: string | null } | null = null;

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function asStudent(browser: Browser, student: Student) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, student.email);
  return { context, page };
}

test.beforeAll(async () => {
  const { data } = await admin.from("schools").select("is_demo, housing_office_name").eq("id", "asu").single();
  schoolBefore = data;
  // Real (non-demo) numbers, with a partnered office so students can share.
  await admin.from("schools").update({ is_demo: false, housing_office_name: "ASU Housing" }).eq("id", "asu");
});

test.afterAll(async () => {
  await deleteUsers(created);
  await admin.from("terms").delete().eq("school_id", "asu").eq("name", "E2E Fall 2027");
  if (schoolBefore) await admin.from("schools").update(schoolBefore).eq("id", "asu");
});

test("housing staff set a term, read the overview, auto-pair two students and approve the pair", async ({ browser, page }) => {
  // Two compatible students who chose to share, plus a housing admin.
  const ana = await createStudent("Anaya");
  const ben = await createStudent("Bennett");
  created.push(ana.email, ben.email);
  await admin.from("consents").insert([
    { user_id: ana.id, school_id: "asu", kind: "share_with_housing", version: "e2e" },
    { user_id: ben.id, school_id: "asu", kind: "share_with_housing", version: "e2e" },
  ]);
  await recomputeScores();

  const staffEmail = uniqueEmail("housing");
  created.push(staffEmail);
  const { data: staffUser } = await admin.auth.admin.createUser({ email: staffEmail, email_confirm: true });
  await admin.from("profiles").update({ is_staff: true, first_name: "Riley", last_initial: "H" }).eq("id", staffUser.user!.id);
  await admin.from("staff_members").insert({ user_id: staffUser.user!.id, school_id: "asu", role: "housing_admin", scopes: {} });

  await signIn(page, staffEmail);
  await expect(page).toHaveURL(/\/staff$/);

  // Term setup.
  await page.goto("/staff/settings/term");
  await ready(page);
  await page.getByLabel("Name").fill("E2E Fall 2027");
  await page.getByLabel("Starts").fill("2027-08-15");
  await page.getByLabel("Ends").fill("2027-12-15");
  await page.getByLabel("Roommate request deadline").fill("2099-01-01");
  await page.getByRole("button", { name: "Create term" }).click();
  await expect(page.getByText("Term created")).toBeVisible();
  await expectAccessible(page);

  // Overview: KPIs and charts, with the term and its next deadline.
  await page.goto("/staff");
  await ready(page);
  await expect(page.getByText("E2E Fall 2027")).toBeVisible();
  await expect(page.getByRole("list", { name: "Key numbers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Funnel" })).toBeVisible();
  await page.getByRole("group", { name: "Funnel: view" }).getByRole("button", { name: "table" }).click();
  await expect(page.getByRole("rowheader", { name: "Finished profile" })).toBeVisible();
  await expectAccessible(page);

  // Both sharing students appear on the unmatched list.
  await page.goto("/staff/students");
  await ready(page);
  await expect(page.getByText("Anaya T.")).toBeVisible();
  await expect(page.getByText("Bennett T.")).toBeVisible();
  await expectAccessible(page);

  // Auto-pair proposes them, staff approve and send.
  await page.goto("/staff/pairings/auto");
  await ready(page);
  await page.getByLabel("Minimum score").selectOption("50");
  await page.getByRole("button", { name: "Run auto-pair" }).click();
  await expect(page.getByText(/pairs? proposed/)).toBeVisible();
  const pair = page.getByRole("listitem").filter({ hasText: "Anaya T." }).filter({ hasText: "Bennett T." });
  await expect(pair).toBeVisible();
  await pair.getByRole("button", { name: /^Approve / }).click();
  await expect(pair.getByText("Approved")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: /Send \d* ?to students/ }).click();
  await expect(page.getByText(/suggestions? sent/)).toBeVisible();
  await expect(pair.getByText("Waiting on students")).toBeVisible();

  // Each student says yes; the second yes creates their group.
  const { data: proposal } = await admin
    .from("auto_pair_proposals")
    .select("id")
    .contains("member_ids", [ana.id, ben.id])
    .eq("status", "sent")
    .single();
  const first = await asStudent(browser, ana);
  await first.page.goto(`/suggestions/${proposal!.id}`);
  await ready(first.page);
  await expect(first.page.getByRole("heading", { name: "Meet Bennett" })).toBeVisible();
  await expectAccessible(first.page);
  await first.page.getByRole("button", { name: "Yes, I'm interested" }).click();
  await expect(first.page.getByText(/We'll let you know when Bennett answers/)).toBeVisible();

  const second = await asStudent(browser, ben);
  await second.page.goto(`/suggestions/${proposal!.id}`);
  await ready(second.page);
  await second.page.getByRole("button", { name: "Yes, I'm interested" }).click();
  await expect(second.page.getByRole("link", { name: "Open your group" })).toBeVisible();
  await second.page.getByRole("link", { name: "Open your group" }).click();
  await expect(second.page).toHaveURL(/\/groups\//);
  await first.context.close();
  await second.context.close();

  // The new pair shows up for review; staff approve it.
  await page.goto("/staff/pairings?status=unreviewed");
  await ready(page);
  await page.getByRole("button", { name: /Anaya T\.|Bennett T\./ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Approve for assignment" }).click();
  await expect(page.getByText("1 approved for assignment")).toBeVisible();
  await page.goto("/staff/pairings?status=approved");
  await ready(page);
  await expect(page.getByText(/Anaya T\., Bennett T\.|Bennett T\., Anaya T\./)).toBeVisible();
  await expectAccessible(page);

  // The approved pair exports to a StarRez CSV with the school's own column names.
  await page.goto("/staff/integrations/starrez");
  await ready(page);
  await expect(page.getByRole("cell", { name: ana.email })).toBeVisible();
  await page.getByLabel("CSV header for School email").fill("PrimaryEmail");
  await page.getByRole("button", { name: "Save columns" }).click();
  await expect(page.getByText("Columns saved")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "PrimaryEmail" })).toBeVisible();
  await expectAccessible(page);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CSV" }).click();
  const file = await (await download).path();
  const csv = (await import("node:fs")).readFileSync(file!, "utf8");
  expect(csv.split("\r\n")[0]).toBe("EntryID,PrimaryEmail,GroupName,GroupLeader,GroupSize,Term");
  expect(csv).toContain(ana.email);
  expect(csv).toContain(ben.email);
  expect(csv).toContain("E2E Fall 2027");
  await admin.from("integration_mappings").delete().eq("school_id", "asu");
});
