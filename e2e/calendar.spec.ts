import { expect, test } from "@playwright/test";
import { admin, createStudent, deleteUsers, ready, signIn, type Student } from "./support";

/**
 * Phase 7.3/7.4 with mocked providers: no request reaches Google or Microsoft. The dev
 * server needs NEXT_PUBLIC_CALENDAR_ENABLED=true and a (fake) Google client ID and secret,
 * which playwright.config.ts sets when it starts the server.
 */
let ana: Student;
let bea: Student;
test.beforeAll(async () => {
  ana = await createStudent("Calla");
  bea = await createStudent("Dara");
});
test.afterAll(async () => deleteUsers([ana.email, bea.email]));

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "SUMMARY:BIO 181",
  "DTSTART;TZID=America/Phoenix:20260818T103000",
  "DTEND;TZID=America/Phoenix:20260818T114500",
  "RRULE:FREQ=WEEKLY;BYDAY=TU,TH",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:HW 1 due",
  "DTSTART:20260905T065900Z",
  "DTEND:20260905T065900Z",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("calendar connect (mocked), class schedule and housing dates", async ({ page }) => {
  await signIn(page, ana.email);
  await page.goto("/settings/accounts");
  await ready(page);

  // Connect sends the student to Google asking only for free/busy, with a CSRF state. The
  // redirect is read here instead of followed, so nothing reaches Google.
  let authorize: URL | null = null;
  await page.route("**/api/calendar/connect/google", async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    authorize = new URL(response.headers()["location"] ?? "about:blank");
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "set-cookie": response.headers()["set-cookie"] ?? "" },
      body: "<p>Google (mocked)</p>",
    });
  });
  await page.getByRole("link", { name: "Connect Google Calendar" }).click();
  await expect(page.getByText("Google (mocked)")).toBeVisible();
  const url = authorize as URL | null;
  expect(url?.origin).toBe("https://accounts.google.com");
  expect(url?.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/calendar.freebusy");
  expect(url?.searchParams.get("redirect_uri")).toMatch(/\/api\/calendar\/callback\/google$/);
  expect(url?.searchParams.get("state")?.length ?? 0).toBeGreaterThan(20);

  // A callback with a forged state is refused.
  await page.goto("/api/calendar/callback/google?code=stolen&state=forged");
  await expect(page).toHaveURL(/calendar=error/);
  await expect(page.getByText("Couldn't connect your calendar. Try again.")).toBeVisible();

  // What a successful callback stores (tokens are opaque here), then disconnect deletes it.
  const { data: profile } = await admin
    .from("profiles")
    .select("school_id")
    .eq("id", ana.id)
    .single();
  await admin.from("calendar_accounts").insert({
    user_id: ana.id,
    provider: "google",
    access_token_enc: "e2e-not-a-real-token",
    refresh_token_enc: null,
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    scope: "https://www.googleapis.com/auth/calendar.freebusy",
  });
  await admin.from("consents").insert({
    user_id: ana.id,
    school_id: profile!.school_id,
    kind: "calendar",
    version: "2026-11",
  });
  await page.goto("/settings/accounts");
  await ready(page);
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Disconnect Google Calendar" }).click();
  await expect(page.getByText(/Google Calendar disconnected/)).toBeVisible();
  const { count } = await admin
    .from("calendar_accounts")
    .select("provider", { count: "exact", head: true })
    .eq("user_id", ana.id);
  expect(count).toBe(0);
  const { data: consent } = await admin
    .from("consents")
    .select("revoked_at")
    .eq("user_id", ana.id)
    .eq("kind", "calendar")
    .single();
  expect(consent?.revoked_at).not.toBeNull();

  // Class times by hand.
  await page.getByRole("button", { name: "Add by hand" }).click();
  await page.getByRole("button", { name: "Add a class time" }).click();
  await page.getByLabel("Class 1 day").selectOption("2");
  await page.getByLabel("Class 1 starts").fill("13:30");
  await page.getByLabel("Class 1 ends").fill("14:45");
  await page.getByRole("button", { name: "Save class times" }).click();
  await expect(page.getByText("Class times saved")).toBeVisible();
  await expect(page.getByText("Wed 13:30–14:45")).toBeVisible();

  // Or from an .ics export: weekly classes kept, the due date dropped.
  await page.locator("#class-file").setInputFiles({
    name: "schedule.ics",
    mimeType: "text/calendar",
    buffer: Buffer.from(ICS),
  });
  await expect(page.getByText("Found 2 weekly class times")).toBeVisible();
  await expect(page.getByText("Tue, Thu 10:30–11:45")).toBeVisible();
  const { data: schedule } = await admin
    .from("class_schedules")
    .select("source, blocks")
    .eq("user_id", ana.id)
    .single();
  expect(schedule?.source).toBe("ics");
  expect(schedule?.blocks).toEqual([
    { day: 1, start: "10:30", end: "11:45" },
    { day: 3, start: "10:30", end: "11:45" },
  ]);

  // Housing dates download as .ics, no OAuth needed.
  await expect(page.getByText("My planned move-in", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add My planned move-in to my calendar" }),
  ).toBeVisible();
  const ics = await page.request.get(`/api/calendar/deadlines?uid=${ana.id}-move-in`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("DTSTART;VALUE=DATE:20270801");
});

test("find a time to meet suggests slots without showing anyone's calendar", async ({ page }) => {
  const { data: conversation } = await admin
    .from("conversations")
    .insert({ kind: "direct" })
    .select("id")
    .single();
  await admin.from("conversation_members").insert([
    { conversation_id: conversation!.id, user_id: ana.id },
    { conversation_id: conversation!.id, user_id: bea.id },
  ]);
  await admin.from("class_schedules").upsert({
    user_id: bea.id,
    source: "manual",
    blocks: [{ day: 0, start: "09:00", end: "10:15" }],
  });

  await signIn(page, ana.email);
  await page.goto(`/messages/${conversation!.id}`);
  await ready(page);
  await page.getByRole("button", { name: "Conversation options" }).click();
  await page.getByRole("menuitem", { name: "Find a time to meet" }).click();
  const dialog = page.getByRole("dialog", { name: "Find a time to meet" });
  await expect(dialog.getByText(/class schedule/)).toBeVisible();
  const slots = dialog.getByRole("button", { name: /\d:\d\d/ });
  await expect(slots).toHaveCount(3);
  await slots.first().click();
  await expect(page.getByRole("textbox", { name: /Message/ })).toHaveValue(
    /^Does .+ work to meet\?$/,
  );
});
