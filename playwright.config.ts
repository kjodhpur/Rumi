import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a local Supabase stack (`npm run db:start`) and the dev
 * server. Sign-in codes are read from Mailpit, which `supabase start` runs.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Production builds register Rumi's service worker, and page.route can't see requests
    // it handles (the calendar test mocks Google that way).
    serviceWorkers: "block",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    // Master prompt §5: every flow at 375px and 1440px, staff screens at 1024px too.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
      testMatch: /(staff[\w-]*|branding|import-outcomes|consent|checkins|safety)\.spec\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
        // Calendar and Spotify e2e run against mocked providers; these are not real credentials.
        env: {
          NEXT_PUBLIC_CALENDAR_ENABLED: "true",
          GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID || "e2e-google-client",
          GOOGLE_CALENDAR_CLIENT_SECRET:
            process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "e2e-google-secret",
          SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || "e2e-spotify-client",
          SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || "e2e-spotify-secret",
        },
      },
});
