import { expect, test } from "@playwright/test";
import pg from "pg";
import { admin, deleteUsers, ready, uniqueEmail } from "./support";

/**
 * School SSO with a mocked identity provider (Phase 3): no live IdP is contacted. Local
 * stack only, since it writes the SSO identity straight into the auth schema.
 */
const created: string[] = [];
test.afterAll(async () => deleteUsers(created));

/** The local stack's Postgres (auth schema writes aren't exposed through the API). */
const DB_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const PROVIDER = "sso:00000000-0000-4000-8000-000000000001";

/**
 * An account as Supabase Auth SSO leaves it after a SAML sign-in: an "sso:" identity whose
 * data holds the attributes the IdP released. It then signs in through a one-tap link.
 */
async function ssoAccount(tag: string, affiliation: string[]) {
  const email = uniqueEmail(tag);
  created.push(email);
  const { data: user, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("createUser failed");
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  try {
    await db.query(
      "insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values (gen_random_uuid(), $1, $2, $3, $4, now(), now(), now())",
      [
        `asurite-${tag}`,
        user.user.id,
        JSON.stringify({
          sub: `asurite-${tag}`,
          email,
          affiliation,
          first_name: "Sam",
          last_name: "Rivera",
        }),
        PROVIDER,
      ],
    );
  } finally {
    await db.end();
  }
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !data.properties?.hashed_token) throw linkError ?? new Error("no link");
  return { email, tokenHash: data.properties.hashed_token };
}

test("a staff-affiliated school sign-on is kept out of matching", async ({ page }) => {
  const { email, tokenHash } = await ssoAccount("sso-staff", ["staff", "member"]);
  await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=magiclink`);
  await ready(page);
  await page.getByRole("button", { name: /continue|sign in/i }).click();
  await expect(page).toHaveURL(/\/not-a-student/);
  await expect(page.getByRole("heading", { name: "Rumi is for students" })).toBeVisible();

  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id")
    .eq("email", email)
    .single();
  const { data: profile } = await admin
    .from("profiles")
    .select("sso_non_student, is_hidden")
    .eq("id", settings!.user_id)
    .single();
  expect(profile).toEqual({ sso_non_student: true, is_hidden: true });

  // The student app stays closed to this account.
  await page.goto("/matches");
  await expect(page).toHaveURL(/\/not-a-student/);
});

test("a student-affiliated school sign-on goes on to onboarding", async ({ page }) => {
  const { tokenHash } = await ssoAccount("sso-student", ["student", "member"]);
  await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=magiclink`);
  await ready(page);
  await page.getByRole("button", { name: /continue|sign in/i }).click();
  await expect(page).toHaveURL(/\/onboarding/);
});
