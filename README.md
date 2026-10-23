# Rumi

**Roommates, ranked by how well you'd actually live together.**

Rumi is a free roommate-matching web app for college students, launching at Arizona State University. Students verify a school email, answer how they live, and get a ranked list of every compatible student: a 0–100 score, the reasons behind it, and their dealbreakers filtered out. No swiping. Intros unlock a realtime chat, and groups of 2–4 can match together for bigger places. The app installs as a PWA.

The school is configurable: allowed email domains and neighborhoods live in the database, and public copy comes from environment variables.

---

## Contents

- [Features](#features)
- [Stack](#stack)
- [How matching works](#how-matching-works)
- [Run it locally](#run-it-locally)
- [Environment variables](#environment-variables)
- [Seeding](#seeding)
- [Testing](#testing)
- [Deploy to Vercel](#deploy-to-vercel)
- [Adding a school](#adding-a-school)
- [Security and privacy](#security-and-privacy)
- [Project structure](#project-structure)

---

## Features

- **Landing page.** A scroll-linked story in which roommate posts scattered in a pile assemble into a ranked, scored list. Includes the why-you-match breakdown, safety, FAQ and smooth scrolling (Lenis).
- **Sign-in.**
  - 6-digit email codes, restricted to school domains.
  - Optional Google sign-in, which also requires a school Google account.
  - Verification lasts a year and renews on every sign-in.
- **Onboarding.**
  - Up to 10 steps (the music step appears when Spotify is enabled), with a progress bar, URL-synced steps and autosave on every change.
  - Photo upload with cropping and reordering.
  - Every lifestyle and housing field, each with an importance weight.
  - Dealbreakers and optional Spotify.
- **Matching.**
  - Weighted and mutual, computed on the server with hard dealbreakers.
  - Shows the top three reasons plus things worth talking about.
  - Re-ranks whenever preferences change.
- **Matches feed.**
  - Filters: budget, neighborhood, move-in window, gender, year.
  - Sort, search, saved view, infinite scroll, skeletons and empty states.
- **Profiles.**
  - Opening a card morphs it into the profile (shared-layout animation).
  - Photo carousel, score ring that counts up, per-factor breakdown, shared music, save, intro.
- **Messaging.**
  - Chats unlock only when an intro is accepted.
  - Realtime 1:1 and group chat with typing indicators, read receipts and unread badges.
- **Groups.**
  - Teams of 2–4 with combined fit and pairwise compatibility.
  - Invites, join requests and a group chat.
- **Notifications.**
  - In-app (live) and email for intros, messages, groups and strong new matches.
  - A daily digest email, with per-channel toggles.
- **Safety.**
  - Report and block from any profile or chat.
  - Automatic scam/abuse flags and a moderation webhook.
  - Hide profile, verified-students-only, and an admin dashboard: report queue, suspend/restore, revoke verification, people search, activity log.
- **Settings.** Profile and preferences, notifications, privacy, connected accounts, theme (synced to the account), JSON data export and account deletion.
- **PWA.** Installable, launch splash, offline fallback page, cached build assets.

Design: warm paper and near-black ink with one accent (Ember), Instrument Serif display type, Inter UI, layered shadows and a hand-tuned dark mode.

Motion:
- Spring-based (stiffness ~300, damping ~30) and animates only `transform` and `opacity`.
- Fully respects `prefers-reduced-motion`.
- Includes route transitions and edge swipe-back on mobile.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router, Server Actions), React 18, TypeScript |
| Styling | Tailwind CSS v4 (CSS-first tokens), shadcn-style components on Radix primitives, vaul, sonner |
| Motion | Motion (`motion/react`), Lenis (landing only) |
| Backend | Supabase: Postgres with RLS on every table, Auth, Storage, Realtime |
| Validation | Zod, shared by client and server |
| Email | Resend (production) / SMTP to Mailpit (local) |
| Tests | Vitest (matching engine), Playwright (end-to-end) |
| Hosting | Vercel, with Vercel Cron |

## How matching works

The engine lives in `src/lib/matching/engine.ts` (pure TypeScript, unit tested).

1. **Hard filters.** A pair is excluded outright if either person's gender preference or any of their dealbreakers fails. Dealbreakers can cover smoking, pets, drinking, guests, sleep, cleanliness, noise, budget overlap, shared area, move-in gap and housing type.
2. **Factor similarity.** Each factor yields a similarity from 0 to 1. Examples: budget overlap, shared neighborhoods, move-in gap, sleep and cleanliness distance, smoking/pets compatibility, shared Spotify artists.
3. **Directional satisfaction.** For each person, `S = Σ(weight × similarity) / Σ weight`. Weights come from their own importance settings: *skip* 0, *nice* 1, *important* 3, *must* 6.
4. **Mutual score.** `score = round(100 × √(S_a × S_b))`. A high score means each person fits what the *other* wants.
5. **Explanations.** The top reasons are the most salient high-weight, high-similarity factors. Watch-outs flag important factors that don't line up.

Scores are stored per direction in `match_scores`. Saving preferences or finishing onboarding recomputes every pair involving that person, in both directions, and prunes pairs that now fail a filter. A nightly job (`/api/cron/recompute`) repairs anything a recompute missed. Crossing 85 for the first time creates a "strong new match" notification, and `/api/cron/digest` emails a daily summary.

## Run it locally

**Prerequisites:** Node.js 20+, npm, and Docker (for the local Supabase stack). The Supabase CLI runs through `npx`, so there's nothing to install globally.

1. Install dependencies and create your env file:

   ```bash
   git clone https://github.com/kjodhpur/Rumi.git
   cd Rumi
   npm install
   cp .env.example .env.local
   ```

2. Start Supabase. This applies every migration in `supabase/migrations` and starts Postgres, Auth, Storage, Realtime and Mailpit:

   ```bash
   npm run db:start
   ```

3. Fill in `.env.local`:
   - Copy the printed **API URL**, **anon key** and **service_role key** into `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Generate the two secrets:

     ```bash
     echo "TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env.local
     echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
     ```

   - Set `ADMIN_EMAILS` to your school email to get the admin dashboard.

4. Seed demo students and start the app:

   ```bash
   npm run seed
   npm run dev
   ```

5. Open http://localhost:3000 and sign in with any `@asu.edu` address. Codes arrive in Mailpit at **http://127.0.0.1:54324**. Nothing is sent to a real inbox.

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / `tsc --noEmit` / Prettier |
| `npm test` | Vitest unit tests (matching engine) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:start` / `db:stop` | Start / stop the local Supabase stack |
| `npm run db:reset` | Recreate the local database from migrations (then re-run `npm run seed`) |
| `npm run db:types` | Regenerate `src/types/database.ts` from the local schema |
| `npm run seed` | Seed 50 fictional students, groups and chats (local only) |
| `npm run brand:generate` | Regenerate the wordmark glyphs and icons |

## Environment variables

`.env.example` documents every variable. The important ones:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | ✓ | Public URL, used for email links and OAuth redirects |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Server-only. Recompute, notifications, moderation, deletion |
| `TOKEN_ENCRYPTION_KEY` | ✓ | 64 hex chars. AES-256-GCM for third-party tokens |
| `CRON_SECRET` | ✓ in prod | Authenticates `/api/cron/*` (Vercel sends it automatically) |
| `ADMIN_EMAILS` | | Comma-separated admin accounts |
| `RESEND_API_KEY` / `SMTP_URL` / `EMAIL_FROM` | | Notification email delivery |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | | Shown on suspension, legal and footer pages |
| `NEXT_PUBLIC_LAUNCH_SCHOOL_*`, `NEXT_PUBLIC_CAMPUS_TZ` | | Campus copy and time zone (defaults: ASU) |
| `MODERATION_WEBHOOK_URL` | | Slack/Discord-style webhook for reports and auto-flags |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | | Shows "Continue with Google" |
| `NEXT_PUBLIC_SPOTIFY_ENABLED`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` | | Optional Spotify connection |
| `SEED_PHOTOS`, `SEED_ALLOW_REMOTE` | | Seeding options |
| `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_CHROMIUM_PATH`, `MAILPIT_URL` | | End-to-end test options |

## Seeding

```bash
npm run seed                          # 50 ASU students, two groups, sample chats
npm run seed -- --demo you@asu.edu    # also gives your account intros and a chat
SEED_PHOTOS=unsplash npm run seed     # try real portraits (falls back to monograms)
```

- Seed accounts use the `seed.asu.edu` domain and are marked `is_seed`. Re-running replaces them.
- The script refuses to seed anything except a local Supabase URL unless `SEED_ALLOW_REMOTE=true` is set. Use that for staging only, never production.
- After seeding it recomputes everyone's matches.

## Testing

**Unit tests** cover the matching engine: hard filters, weights, mutual scoring, reasons and edge cases.

```bash
npm test
```

**End-to-end tests** run against the local stack and the dev server, which Playwright starts if it isn't already running. They read sign-in codes from Mailpit and create, then delete, their own users through the service role. The suite covers:

- Sign-up and sign-out, rejection of non-school emails, and a wrong code.
- Full onboarding, including photo crop and autosave across a reload.
- Ranked matches: profile overlay, save, Saved view and filters.
- Intro → accept → realtime chat with typing indicator and read receipts, across two browsers.

Onboarding and matching also run at a 375px mobile viewport.

```bash
npm run db:start && npm run seed      # once
npx playwright install chromium       # once, or set PLAYWRIGHT_CHROMIUM_PATH
npm run test:e2e
```

## Deploy to Vercel

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com), then push the schema:

   ```bash
   npx supabase@2 login
   npx supabase@2 link --project-ref <your-project-ref>
   npx supabase@2 db push            # applies supabase/migrations (tables, RLS, functions, storage, realtime, ASU data)
   ```

2. **Authentication → URL Configuration**:
   - Set **Site URL** to your production URL.
   - Add `https://<your-domain>/auth/callback` and `https://<your-domain>/auth/confirm` to the redirect URLs.
3. **Authentication → Email Templates**: for both **Confirm signup** (first sign-in) and **Magic Link** (returning students):
   - Paste `supabase/templates/otp.html`.
   - Set the subject to `Your Rumi code: {{ .Token }}`.

   The app signs people in with the 6-digit code; local development uses the same template via `supabase/config.toml`.
4. **Authentication → SMTP Settings**: use your own SMTP (for example Resend's SMTP). The built-in sender is rate-limited and meant only for testing.
5. *(Optional)* **Authentication → Providers → Google**: enable it and set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

### 2. Vercel project

1. Import the repository in Vercel. The framework preset is detected as Next.js.
2. Add the environment variables from `.env.example`. At minimum:
   - `NEXT_PUBLIC_APP_URL`
   - the three Supabase keys
   - `TOKEN_ENCRYPTION_KEY`
   - `CRON_SECRET`
   - `ADMIN_EMAILS`
   - `RESEND_API_KEY` and `EMAIL_FROM`
3. Deploy. `vercel.json` schedules two cron jobs:
   - `/api/cron/recompute` daily at 09:15 UTC
   - `/api/cron/digest` daily at 17:00 UTC (10:00 in Phoenix)

   Hobby plans allow daily crons; on Pro you can run the repair job more often.
4. *(Optional)* Spotify:
   - Create an app at the Spotify developer dashboard.
   - Add `https://<your-domain>/api/spotify/callback` as a redirect URI.
   - Set the `SPOTIFY_*` variables and `NEXT_PUBLIC_SPOTIFY_ENABLED=true`.

Sign in with an address listed in `ADMIN_EMAILS` to reach **/admin**. On mobile it's under Settings → Safety admin.

## Adding a school

Allowed domains and neighborhoods are data:

```sql
insert into public.schools (id, name, short_name, email_domains, timezone)
values ('ucla', 'University of California, Los Angeles', 'UCLA', array['ucla.edu', 'g.ucla.edu'], 'America/Los_Angeles');

insert into public.areas (school_id, slug, name, description, sort_order) values
  ('ucla', 'westwood', 'Westwood', 'Walkable to campus.', 1),
  ('ucla', 'palms',    'Palms',    'Lower rents, Expo line.', 2);
```

Students are matched only within their own school. For a deployment dedicated to another campus, set the `NEXT_PUBLIC_LAUNCH_SCHOOL_*` variables so public pages use the right name, domain, city and campus police number.

## Security and privacy

- **Row Level Security on all 23 tables.**
  - Cross-user reads go through one function, `can_view_profile()`. It checks same school, onboarding finished, not banned, not blocked, the hidden profile setting and the verified-only setting.
  - Writes are limited by column-level grants.
  - Multi-step operations (accept intro, join group, send message) are `security definer` functions that check `auth.uid()`.
- **The service role is used only on the server**: recompute, notifications, moderation, rate limits and deletion.
- **Rate limiting** is backed by Postgres and works on serverless. It covers code requests (per email and per IP), code checks, messages (per minute and per day), intros, reports, group invites, exports and Spotify syncs.
- **Input handling.**
  - All input is validated with Zod and text is sanitized.
  - Messages are scanned for payment-scam, off-platform and abuse patterns. Severe matches file an automatic report, and payment requests add a safety tip to the thread (at most once a day per chat).
- **Tokens.** Spotify tokens are encrypted with AES-256-GCM. The OAuth flow uses a state cookie.
- **Headers.** Strict CSP and security headers (`next.config.mjs`).
- **Caching.** Supabase server clients opt out of Next's fetch cache, so every read reflects the database and RLS.
- **Your data.** Students can export everything as JSON and delete their account at any time. Deletion removes photos and direct chats, hands group ownership to another member, and then cascades.

**Next.js 14 advisories.** The project targets Next.js 14 as specified. The latest 14.x release (14.2.35) still has published advisories, several of them critical, that are only fixed in Next 15/16.

Mitigations in place:
- No custom server and no Pages Router or i18n.
- No rewrites to user-controlled hosts.
- Remote images are limited to Supabase Storage and Spotify's CDN.
- The image optimizer serves WebP only (AVIF is disabled).
- Vercel applies platform-level mitigations for Next.js CVEs.

Before a public launch, plan an upgrade to the current Next.js major (`npm audit` lists the advisories).

## Project structure

```
src/
  app/
    (app)/          signed-in app: matches, profile/[id], messages, groups, notifications, settings, admin
    (auth)/login    email-code sign-in
    onboarding/     10-step wizard
    api/            matches feed, profile detail, Spotify OAuth, data export, cron jobs
    actions/        server actions (auth, onboarding, photos, social, messages, groups, settings, admin…)
    privacy, terms, offline, suspended, manifest.ts
  components/       ui/ (design system), marketing/, matches/, profile/, chat/, groups/, settings/, admin/…
  lib/
    matching/       engine (pure) + recompute pipeline
    supabase/       browser, server, admin and middleware clients
    email/          templates, delivery, notification fan-out
    …               validation, rate limits, moderation, crypto, Spotify, time
supabase/
  migrations/       schema, functions, RLS and grants, storage and realtime, reference data
  templates/        sign-in code email
scripts/            seed data and brand asset generation
e2e/                Playwright specs and helpers
docs/PROPOSAL.md    schema, page map, design tokens and motion spec
```

---

Rumi is an independent student project and is not affiliated with Arizona State University.
