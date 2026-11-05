import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  admin,
  createStudent,
  deleteUsers,
  ready,
  recomputeScores,
  signIn,
  type Student,
} from "./support";

const created: string[] = [];
test.afterAll(async () => deleteUsers(created));

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

async function asStudent(browser: Browser, student: Student) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, student.email);
  return { context, page };
}

/** A two-person group with its chat, as if both had said yes to a housing suggestion. */
async function pairUp(a: Student, b: Student) {
  const { data: group } = await admin
    .from("groups")
    .insert({
      school_id: "asu",
      name: `${a.firstName} & ${b.firstName}`,
      owner_id: a.id,
      target_size: 2,
      status: "full",
    })
    .select("id")
    .single();
  await admin.from("group_members").insert([
    { group_id: group!.id, user_id: a.id, role: "owner" },
    { group_id: group!.id, user_id: b.id, role: "member" },
  ]);
  const { data: conversation } = await admin
    .from("conversations")
    .insert({ kind: "group", group_id: group!.id })
    .select("id")
    .single();
  await admin.from("conversation_members").insert([
    { conversation_id: conversation!.id, user_id: a.id },
    { conversation_id: conversation!.id, user_id: b.id },
  ]);
  return { groupId: group!.id, conversationId: conversation!.id };
}

async function acceptEverything(page: Page) {
  // One section by hand, the rest with "Accept all".
  const accepts = page.getByRole("button", { name: "Accept", exact: true });
  const before = await accepts.count();
  if (before > 0) {
    await accepts.first().click();
    await expect(accepts).toHaveCount(before - 1);
  }
  const all = page.getByRole("button", { name: /^Accept all/ });
  if (await all.isVisible().catch(() => false)) await all.click();
  await expect(accepts).toHaveCount(0);
}

test("two roommates draft, edit, accept and sign an agreement; chat offers starters", async ({
  browser,
}) => {
  // Different sleep and noise habits give the pair something to talk about.
  const ana = await createStudent("Amira", { sleep_schedule: 1, noise: 1 });
  const ben = await createStudent("Bruno", { sleep_schedule: 5, noise: 4 });
  created.push(ana.email, ben.email);
  await recomputeScores();
  const { groupId, conversationId } = await pairUp(ana, ben);

  // Amira starts the draft from the group page and edits the guest rule.
  const a = await asStudent(browser, ana);
  await a.page.goto(`/groups/${groupId}`);
  await ready(a.page);
  await a.page.getByRole("link", { name: /Roommate agreement/ }).click();
  await a.page.getByRole("button", { name: "Start the agreement" }).click();
  await expect(a.page.getByRole("heading", { name: "Sleep and quiet hours" })).toBeVisible();
  await expect(a.page.getByText(/Quiet hours start at 10pm on weeknights/)).toBeVisible();
  await expect(a.page.getByRole("heading", { name: "Talk about this" })).toBeVisible();
  await a.page.getByRole("button", { name: "Edit Guests and overnights" }).click();
  await a.page
    .getByRole("textbox", { name: "Guests and overnights" })
    .fill("Heads-up text before guests. Overnight guests twice a week at most.");
  await a.page.getByRole("button", { name: "Save change" }).click();
  await expect(a.page.getByText("Changed by You")).toBeVisible();
  await acceptEverything(a.page);
  await expectAccessible(a.page);
  await expect(
    a.page.getByText("Signing opens once everyone has accepted every section."),
  ).toBeVisible();

  // Bruno sees the change, accepts everything and signs.
  const b = await asStudent(browser, ben);
  await b.page.goto(`/groups/${groupId}/agreement`);
  await ready(b.page);
  await expect(b.page.getByText("Changed by Amira")).toBeVisible();
  // A change waiting on Bruno shows what changed until he hides it.
  await expect(b.page.getByRole("button", { name: "Hide changes" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(b.page.getByLabel("What changed")).toBeVisible();
  await acceptEverything(b.page);
  await b.page.getByLabel("Type your full name").fill("Someone Else");
  await b.page.getByRole("button", { name: "Sign agreement" }).click();
  await expect(b.page.getByText(/starting with your first name/)).toBeVisible();
  await b.page.getByLabel("Type your full name").fill("Bruno Torres");
  await b.page.getByRole("button", { name: "Sign agreement" }).click();
  await expect(b.page.getByText(/Waiting on 1 more person/)).toBeVisible();

  // Amira signs; the agreement is complete and prints.
  await a.page.reload();
  await ready(a.page);
  await a.page.getByLabel("Type your full name").fill("Amira Torres");
  await a.page.getByRole("button", { name: "Sign agreement" }).click();
  await expect(a.page.getByRole("heading", { name: "Signed by everyone" })).toBeVisible();
  await expectAccessible(a.page);
  await a.page.goto(`/print/agreement/${groupId}`);
  await expect(
    a.page.getByRole("heading", { level: 1, name: `${ana.firstName} & ${ben.firstName}` }),
  ).toBeVisible();
  await expect(a.page.getByText("Bruno Torres,")).toBeVisible();
  await expectAccessible(a.page);

  // Bruno reopens it: signatures clear and the version bumps.
  await b.page.reload();
  await ready(b.page);
  await b.page.getByRole("button", { name: "Reopen" }).click();
  await expect(b.page.getByText("version 2")).toBeVisible();
  await expect(b.page.getByText("Reopened", { exact: true })).toBeVisible();

  // Their chat offers openers for what the match flagged; tapping one fills the composer.
  await a.page.goto(`/messages/${conversationId}`);
  await ready(a.page);
  await expect(a.page.getByText("Talk about this")).toBeVisible();
  const starter = a.page.getByRole("button", { name: /later than me|quieter side/ }).first();
  const text = (await starter.locator("span").last().textContent()) ?? "";
  await starter.click();
  await expect(a.page.getByRole("textbox", { name: /^Message / })).toHaveValue(text);
  await expectAccessible(a.page);

  await a.context.close();
  await b.context.close();
});
