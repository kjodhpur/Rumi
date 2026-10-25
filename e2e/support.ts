import fs from "node:fs";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
export const SCHOOL_DOMAIN = process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_DOMAIN ?? "asu.edu";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(SUPABASE_URL)) {
  throw new Error("E2E tests create and delete users — point NEXT_PUBLIC_SUPABASE_URL at a local stack.");
}

export const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@${SCHOOL_DOMAIN}`;
}

/** Waits for the sign-in email in Mailpit and returns its 6-digit code and one-tap link. */
export async function signInEmailFor(email: string, since: number) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`);
    const message = (await res.json()).messages?.[0];
    if (message && Date.parse(message.Created) >= since) {
      const code = String(message.Subject ?? "").match(/\b(\d{6})\b/)?.[1];
      if (code) {
        const detail = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`);
        const html = String((await detail.json()).HTML ?? "");
        const link = html.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)?.[1]?.replace(/&amp;/g, "&");
        return { code, link: link ?? null };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No sign-in code arrived for ${email}`);
}

/** Waits for the sign-in email in Mailpit and returns its 6-digit code. */
export async function otpFor(email: string, since: number) {
  return (await signInEmailFor(email, since)).code;
}

/** Resolves once React has hydrated the page, so typing and clicks reach real handlers. */
export async function ready(page: Page) {
  await page.waitForSelector("html[data-hydrated]", { state: "attached", timeout: 30_000 });
}

/** Full email-code sign-in through the real UI. Clears the shared IP rate limit first so reruns stay green. */
export async function signIn(page: Page, email: string) {
  await admin.from("rate_limits").delete().like("key", "otp:%");
  await page.goto("/login");
  await ready(page);
  const since = Date.now() - 2000;
  await page.getByLabel("School email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Check your inbox.")).toBeVisible();
  await page.getByLabel("6-digit code").fill(await otpFor(email, since));
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await ready(page);
}

export interface Student {
  id: string;
  email: string;
  firstName: string;
}

/**
 * A fully onboarded student created straight in the database — the fast path
 * for specs that aren't about onboarding. Scores are computed by the same
 * repair job production runs (`/api/cron/recompute`).
 */
export async function createStudent(firstName: string, overrides: Record<string, unknown> = {}): Promise<Student> {
  const email = uniqueEmail(firstName.toLowerCase());
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const id = data.user.id;
  const now = new Date().toISOString();

  const profile = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_initial: "T",
      gender: "woman",
      class_year: "junior",
      major: "Psychology",
      bio: `${firstName} is an end-to-end test student who keeps the kitchen clean and the music low.`,
      student_verified_at: now,
      onboarding_step: 10,
      onboarding_completed_at: now,
    })
    .eq("id", id);
  if (profile.error) throw profile.error;

  const prefs = await admin
    .from("preferences")
    .update({
      budget_min: 800,
      budget_max: 1100,
      areas: ["tempe-campus"],
      move_in_date: "2027-08-01",
      lease_length: "academic_year",
      housing_type: "off_campus",
      gender_pref: [],
      sleep_schedule: 3,
      cleanliness: 4,
      noise: 2,
      guests: 3,
      smoking: "never",
      drinking: "socially",
      pets: "none",
      study: "mix",
      dealbreakers: [],
      ...overrides,
    })
    .eq("user_id", id);
  if (prefs.error) throw prefs.error;
  return { id, email, firstName };
}

/** Re-scores everyone whose preferences changed — the nightly repair job, run on demand. */
export async function recomputeScores() {
  const res = await fetch(`${BASE_URL}/api/cron/recompute`, {
    headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
  if (!res.ok) throw new Error(`recompute failed: ${res.status} ${await res.text()}`);
}

export async function deleteUsers(emails: string[]) {
  if (!emails.length) return;
  const { data } = await admin.from("user_settings").select("user_id").in("email", emails);
  for (const row of data ?? []) await admin.auth.admin.deleteUser(row.user_id);
}
