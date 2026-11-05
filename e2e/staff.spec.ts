import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUsers, otpFor, ready, signIn, uniqueEmail } from "./support";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const PLATFORM_ADMIN = (process.env.ADMIN_EMAILS ?? "admin@asu.edu")
  .split(",")[0]
  .trim()
  .toLowerCase();
const created: string[] = [];

test.afterAll(async () => deleteUsers(created));

async function inviteLinkFor(email: string, since: number) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const res = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`,
    );
    for (const message of (await res.json()).messages ?? []) {
      if (Date.parse(message.Created) < since) continue;
      const detail = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const path = String(detail.HTML ?? "").match(/href="[^"]*(\/invite\/[A-Za-z0-9_-]+)"/)?.[1];
      if (path) return path;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No invite email arrived for ${email}`);
}

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

test("a platform admin invites a housing admin, who accepts and can later be turned off", async ({
  browser,
}) => {
  const invitee = uniqueEmail("housing-admin");
  created.push(invitee, PLATFORM_ADMIN);

  // The Rumi team sends the first invite.
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, PLATFORM_ADMIN);
  await adminPage.goto("/staff/settings/team");
  await ready(adminPage);
  await expect(adminPage.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
  await expectAccessible(adminPage);

  const since = Date.now() - 2000;
  await adminPage.getByRole("button", { name: "Invite" }).click();
  await adminPage.getByLabel("Email").fill(invitee);
  await adminPage.getByRole("radio", { name: /Housing admin/ }).click();
  await adminPage.getByRole("button", { name: "Send invite" }).click();
  await expect(adminPage.getByText(`Invite sent to ${invitee}`)).toBeVisible();
  await expect(adminPage.getByText(invitee, { exact: true })).toBeVisible();

  // The invitee opens the emailed link, signs in, and accepts.
  const invitePath = await inviteLinkFor(invitee, since);
  const staffContext = await browser.newContext();
  const page = await staffContext.newPage();
  await admin.from("rate_limits").delete().like("key", "otp:%");
  await page.goto(invitePath);
  await expect(page).toHaveURL(/\/login\?next=/);
  await ready(page);
  const codeSince = Date.now() - 2000;
  await page.getByLabel("School email").fill(invitee);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("6-digit code").fill(await otpFor(invitee, codeSince));
  await page.waitForURL(/\/invite\//);
  await ready(page);
  await expect(
    page.getByRole("heading", { name: /Join Arizona State University on Rumi/ }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Accept invite" }).click();
  await expect(page.getByText("Add your first name.")).toBeVisible();
  await page.getByLabel("First name").fill("Jordan");
  await page.getByLabel("Last name").fill("Reyes");
  await page.getByRole("button", { name: "Accept invite" }).click();
  await page.waitForURL((url) => url.pathname === "/staff");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi, Jordan");
  await expectAccessible(page);

  // Housing admins see the whole settings area; each page passes axe.
  for (const path of ["/staff/settings/team", "/staff/settings/privacy", "/staff/audit"]) {
    await page.goto(path);
    await ready(page);
    await expectAccessible(page);
  }
  await expect(page.getByRole("cell", { name: "Joined the team" }).first()).toBeVisible();

  // Staff accounts never land in the student app.
  await page.goto("/matches");
  await expect(page).toHaveURL(/\/staff$/);

  // A school can't lose its last housing admin. Other admins in the local database are paused for this check.
  const { data: invitedUser } = await admin
    .from("user_settings")
    .select("user_id")
    .eq("email", invitee)
    .single();
  const { data: otherAdmins } = await admin
    .from("staff_members")
    .select("id")
    .eq("school_id", "asu")
    .eq("role", "housing_admin")
    .is("disabled_at", null)
    .neq("user_id", invitedUser!.user_id);
  const paused = (otherAdmins ?? []).map((row) => row.id);
  if (paused.length)
    await admin
      .from("staff_members")
      .update({ disabled_at: new Date().toISOString() })
      .in("id", paused);
  await adminPage.reload();
  await ready(adminPage);
  await adminPage.getByRole("button", { name: "Actions for Jordan R." }).click();
  await adminPage.getByRole("menuitem", { name: "Turn off access" }).click();
  await expect(adminPage.getByText(/needs at least one housing admin/)).toBeVisible();

  // With a second admin in place, turning off access takes effect on the invitee's very next request.
  const second = uniqueEmail("second-admin");
  created.push(second);
  const { data: secondUser } = await admin.auth.admin.createUser({
    email: second,
    email_confirm: true,
  });
  await admin
    .from("profiles")
    .update({ is_staff: true, first_name: "Sam" })
    .eq("id", secondUser.user!.id);
  await admin
    .from("staff_members")
    .insert({ user_id: secondUser.user!.id, school_id: "asu", role: "housing_admin", scopes: {} });
  await adminPage.reload();
  await ready(adminPage);
  await adminPage.getByRole("button", { name: "Actions for Jordan R." }).click();
  await adminPage.getByRole("menuitem", { name: "Turn off access" }).click();
  await expect(adminPage.getByText("Jordan R.'s access is off")).toBeVisible();

  await page.goto("/staff");
  await expect(page.getByRole("heading", { name: "No staff access" })).toBeVisible();
  if (paused.length)
    await admin.from("staff_members").update({ disabled_at: null }).in("id", paused);

  await adminContext.close();
  await staffContext.close();
});

test("students can turn housing sharing on and off from Settings", async ({ page }) => {
  const email = uniqueEmail("sharing");
  created.push(email);
  await admin.from("schools").update({ housing_office_name: "ASU Housing" }).eq("id", "asu");
  try {
    const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
    const id = data.user!.id;
    const now = new Date().toISOString();
    await admin
      .from("profiles")
      .update({
        first_name: "Sharer",
        last_initial: "T",
        class_year: "junior",
        student_verified_at: now,
        onboarding_completed_at: now,
      })
      .eq("id", id);
    await signIn(page, email);
    await page.goto("/settings/privacy");
    await ready(page);
    const toggle = page.getByRole("switch", { name: "Share my Rumi results with ASU Housing" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(page.getByText("Sharing turned on")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(page.getByText("Sharing turned off")).toBeVisible();
    await page.reload();
    await ready(page);
    await expect(page.getByText("Sharing history")).toBeVisible();
    await expectAccessible(page);
  } finally {
    await admin.from("schools").update({ housing_office_name: null }).eq("id", "asu");
  }
});
