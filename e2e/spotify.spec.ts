import { expect, test } from "@playwright/test";
import {
  admin,
  createStudent,
  deleteUsers,
  expectAccessible,
  ready,
  signIn,
  type Student,
} from "./support";

/** §5: Spotify connect (mocked). Nothing reaches Spotify: the authorize redirect is read, not followed. */
const created: string[] = [];
let ana: Student;

test.beforeAll(async () => {
  ana = await createStudent("Mila");
  created.push(ana.email);
});
test.afterAll(async () => deleteUsers(created));

test("Spotify connect asks only for top artists, refuses a forged callback, and disconnects", async ({
  page,
}) => {
  await signIn(page, ana.email);
  await page.goto("/settings/accounts");
  await ready(page);

  let authorize: URL | null = null;
  await page.route(/\/api\/spotify\/connect\b/, async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    authorize = new URL(response.headers()["location"] ?? "about:blank");
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "set-cookie": response.headers()["set-cookie"] ?? "" },
      body: "<p>Spotify (mocked)</p>",
    });
  });
  await page.locator('a[href^="/api/spotify/connect"]').click();
  await expect(page.getByText("Spotify (mocked)")).toBeVisible();
  const url = authorize as URL | null;
  expect(url?.origin).toBe("https://accounts.spotify.com");
  expect(url?.searchParams.get("scope")).toBe("user-top-read");
  expect(url?.searchParams.get("redirect_uri")).toMatch(/\/api\/spotify\/callback$/);
  expect(url?.searchParams.get("state")?.length ?? 0).toBeGreaterThan(20);

  // A callback whose state doesn't match the cookie is refused.
  await page.goto("/api/spotify/callback?code=stolen&state=forged");
  await expect(page).toHaveURL(/spotify=error/);
  await expect(page.getByText("Couldn't connect Spotify")).toBeVisible();

  // What a successful callback stores (tokens are opaque here); disconnecting deletes it.
  await admin.from("spotify_accounts").insert({
    user_id: ana.id,
    spotify_user_id: "e2e-listener",
    display_name: "E2E Listener",
    access_token_enc: "e2e-not-a-real-token",
    refresh_token_enc: "e2e-not-a-real-token",
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    scopes: "user-top-read",
  });
  await page.goto("/settings/accounts");
  await ready(page);
  await expect(page.getByText("E2E Listener")).toBeVisible();
  await expectAccessible(page);
  // Disconnect sits beside Refresh in the Spotify block.
  await page
    .getByRole("button", { name: "Refresh" })
    .locator("xpath=..")
    .getByRole("button", { name: "Disconnect" })
    .click();
  await expect(page.getByText("Spotify disconnected")).toBeVisible();
  const { data } = await admin.from("spotify_accounts").select("user_id").eq("user_id", ana.id);
  expect(data).toEqual([]);
});
