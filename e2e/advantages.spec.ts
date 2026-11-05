import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  createStudent,
  deleteUsers,
  ready,
  recomputeScores,
  signIn,
  type Student,
} from "./support";

/**
 * Regression guard (master prompt §5): Rumi's eight verified advantages over StarRez must stay
 * visible. One test, one step per advantage.
 */
const created: string[] = [];
let ava: Student; // the viewer: no smokers, early to bed
let ben: Student; // a good fit who stays up late
let cal: Student; // smokes, so never shown to Ava
test.use({ reducedMotion: "reduce" });

let hideSeedBefore = false;

test.beforeAll(async () => {
  // Only real students compete for Ava's first page: hide the seeded demo profiles meanwhile.
  const { data } = await admin
    .from("schools")
    .select("hide_seed_profiles")
    .eq("id", "asu")
    .single();
  hideSeedBefore = Boolean(data?.hide_seed_profiles);
  await admin.from("schools").update({ hide_seed_profiles: true }).eq("id", "asu");
  const tag = Date.now().toString(36).slice(-4);
  ava = await createStudent(`Avalyn${tag}`, { dealbreakers: ["smoking"], sleep_schedule: 1 });
  ben = await createStudent(`Benedikt${tag}`, { sleep_schedule: 5 });
  cal = await createStudent(`Calloway${tag}`, { smoking: "regularly" });
  created.push(ava.email, ben.email, cal.email);
  await recomputeScores();
});
test.afterAll(async () => {
  await deleteUsers(created);
  await admin.from("schools").update({ hide_seed_profiles: hideSeedBefore }).eq("id", "asu");
});

const card = (page: Page, s: Student) => page.locator(`article[aria-label^="${s.firstName} T.,"]`);
const scoreOn = async (page: Page, s: Student) =>
  Number((await card(page, s).getAttribute("aria-label"))?.match(/(\d+)% match/)?.[1] ?? NaN);

test("the eight advantages: weights, two-way scores, dealbreakers, reasons, off-campus fit, intro-gated chat, group fit, scam flags", async ({
  browser,
  page,
}) => {
  await signIn(page, ava.email);
  await page.goto("/matches");
  await ready(page);
  await expect(card(page, ben)).toBeVisible();

  // 3. Hard dealbreakers: the smoker never shows up, in either direction.
  await expect(card(page, cal)).toHaveCount(0);

  // 2. Two-way mutual score: Ben sees the same score for Ava that she sees for him.
  const avaSeesBen = await scoreOn(page, ben);
  const benContext = await browser.newContext({ reducedMotion: "reduce" });
  const benPage = await benContext.newPage();
  await signIn(benPage, ben.email);
  await benPage.goto("/matches");
  await ready(benPage);
  await expect(card(benPage, ava)).toBeVisible();
  expect(await scoreOn(benPage, ava)).toBe(avaSeesBen);

  // 5. Off-campus factors: budget, move-in and area on the card; lease on the profile.
  await expect(card(page, ben)).toContainText("$800–$1,100");
  await expect(card(page, ben)).toContainText("Moves Aug 1");

  // 4. Per-match reasons and watch-outs.
  await card(page, ben).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/profile\//);
  await expect(page.getByText(/Why you match/i).first()).toBeVisible();
  await expect(page.getByText(/Worth talking about/i).first()).toBeVisible();
  await expect(
    page.getByText(`${ben.firstName} stays up a lot later than you`).first(),
  ).toBeVisible();
  await expect(page.getByText(/Academic year/).first()).toBeVisible();

  // 6. Intro-gated chat: before an intro is accepted the only way in is an intro request.
  await expect(page.getByRole("button", { name: "Send intro" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^Message/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // 1. Student-set weights: making sleep a must-match lowers the score with a late sleeper.
  await page.goto("/settings/profile");
  await ready(page);
  await page.getByRole("tab", { name: "Matching" }).click();
  const sleep = page.getByRole("radiogroup", { name: "How much sleep schedule matters" });
  await expect(sleep).toBeVisible();
  await sleep.getByRole("radio", { name: "Must match" }).click();
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("preferences")
        .select("weights")
        .eq("user_id", ava.id)
        .single();
      return (data?.weights as Record<string, number> | null)?.sleep;
    })
    .toBe(3);
  await recomputeScores();
  await page.goto("/matches");
  await ready(page);
  await expect(card(page, ben)).toBeVisible();
  expect(await scoreOn(page, ben)).toBeLessThan(avaSeesBen);

  // 7. Group combined fit: in a group, every pairing's compatibility shows.
  const { data: group } = await admin
    .from("groups")
    .insert({ name: "Guard group", owner_id: ava.id, target_size: 3, school_id: "asu" })
    .select("id")
    .single();
  await admin.from("group_members").insert([
    { group_id: group!.id, user_id: ava.id, role: "owner" },
    { group_id: group!.id, user_id: ben.id, role: "member" },
  ]);
  await page.goto(`/groups/${group!.id}`);
  await ready(page);
  await expect(page.getByText("How you all fit")).toBeVisible();
  await expect(
    page.getByText(new RegExp(`^(You & ${ben.firstName}|${ben.firstName} & you)$`)),
  ).toBeVisible();
  await expect(page.getByText(/^\d{1,3}%$/).first()).toBeVisible();

  // 8. Automatic scam flags: asking for a deposit up front posts a safety tip and a report.
  await admin.from("group_members").delete().eq("group_id", group!.id);
  await admin.from("groups").delete().eq("id", group!.id);
  const { data: conversation } = await admin
    .from("conversations")
    .insert({ kind: "direct" })
    .select("id")
    .single();
  await admin.from("conversation_members").insert([
    { conversation_id: conversation!.id, user_id: ava.id },
    { conversation_id: conversation!.id, user_id: ben.id },
  ]);
  await benPage.goto(`/messages/${conversation!.id}`);
  await ready(benPage);
  const composer = benPage.getByRole("textbox", { name: /^Message / });
  await composer.fill("Before the tour can you send me the deposit through Zelle?");
  await benPage.getByRole("button", { name: "Send message" }).click();
  await expect(benPage.getByRole("note").filter({ hasText: /Safety tip/ })).toBeVisible({
    timeout: 20_000,
  });
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("reports")
        .select("reason")
        .eq("reported_id", ben.id)
        .is("reporter_id", null);
      return data?.map((r) => r.reason);
    })
    .toContain("scam");
  await benContext.close();
});
