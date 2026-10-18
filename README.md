# Rumi

**Rumi** is a free roommate-matching app for Arizona State University students. No swiping — students set preferences (and optionally Spotify), then browse a ranked, filterable list of compatible roommates and message the people they choose.

> Formerly referred to as “RoomieMatch ASU” in early specs. The product name is **Rumi**. The GitHub repo remains `kjodhpur/RoomieMatch`.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth magic link, Postgres + RLS, Realtime chat, Storage)
- Spotify Web API (OAuth PKCE)
- Vitest for matching unit tests
- Deploy target: **Vercel**

## Local setup

### 1. Clone & install

```bash
git clone https://github.com/kjodhpur/RoomieMatch.git
cd RoomieMatch
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL**, **anon key**, and **service role key** into `.env.local`.
3. In the SQL editor, run the migration file:

   `supabase/migrations/001_initial.sql`

4. Auth → URL configuration: add redirect URL  
   `http://localhost:3000/auth/callback`  
   (and your production URL later).
5. Enable **Email** provider (magic link / OTP).
6. Confirm Storage bucket `profile-photos` exists (created by the migration).

### 3. Spotify developer app

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Add redirect URI: `http://localhost:3000/api/spotify/callback` (and production URI).
3. Copy Client ID (and optional Client Secret) into `.env.local`.
4. Generate encryption key: `openssl rand -hex 32` → `TOKEN_ENCRYPTION_KEY`.
5. **Development Mode** allows ~25 allowlisted users. Add test accounts in the Spotify dashboard, or [request an extended quota](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) before launch.

### 4. Env vars

See `.env.example` for the full list. Minimum for local:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed, cron, Spotify persistence, admin |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REDIRECT_URI` | Spotify OAuth |
| `TOKEN_ENCRYPTION_KEY` | Encrypt Spotify refresh tokens |
| `ADMIN_EMAILS` | Comma-separated `@asu.edu` admins for `/admin` |
| `CRON_SECRET` | Protect `/api/cron/*` |
| `NEXT_PUBLIC_SHOW_SEED_PROFILES` | `true` to include seed users in matching |

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with an `@asu.edu` email.

### 6. Seed demo profiles

```bash
npm run seed
```

Creates 60 `is_seed = true` profiles with fake Spotify data. Hidden in production when `NEXT_PUBLIC_SHOW_SEED_PROFILES` is not `true`.

### 7. Tests

```bash
npm test
npm run typecheck
npm run lint
```

## Deploy to Vercel (manual — required)

Vercel CLI auth was **not** available in the cloud agent environment (`vercel whoami` → logged out; no `VERCEL_TOKEN`). Link the project yourself:

### Click / paste checklist

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** GitHub repository **`kjodhpur/RoomieMatch`**.
3. Set **Project Name** to **`rumi`** (preferred).
4. Framework preset: **Next.js** (auto-detected). Root directory: `.`
5. Open **Environment Variables** and paste every key from `.env.example` with production values:
   - `NEXT_PUBLIC_APP_URL` = `https://rumi.vercel.app` (or your custom domain)
   - Supabase URL + anon + **service role**
   - Spotify client ID/secret + redirect `https://YOUR_DOMAIN/api/spotify/callback`
   - `TOKEN_ENCRYPTION_KEY`, `ADMIN_EMAILS`, `CRON_SECRET`
   - `NEXT_PUBLIC_SHOW_SEED_PROFILES=false` for production
6. Click **Deploy**.
7. After deploy:
   - Supabase Auth redirect: `https://YOUR_DOMAIN/auth/callback`
   - Spotify redirect URI: `https://YOUR_DOMAIN/api/spotify/callback`
8. Cron jobs are declared in `vercel.json`:
   - Weekly Spotify refresh: `/api/cron/spotify-refresh` (Sundays 06:00 UTC)
   - Nightly match cache: `/api/cron/match-cache` (03:00 UTC)  
   Vercel Hobby/Pro sends `Authorization: Bearer $CRON_SECRET` — set `CRON_SECRET` in the project env so the routes accept the calls.
9. Optional custom domain: Project → Settings → Domains.

### CLI alternative (when logged in)

```bash
npx vercel login
npx vercel link --yes --project rumi
npx vercel env pull
npx vercel --prod
```

## Project layout

```
src/app/               # App Router pages + API routes
src/lib/matching.ts    # Compatibility scoring (unit tested)
src/lib/spotify.ts     # OAuth + sync
supabase/migrations/   # Postgres schema + RLS
scripts/seed.ts        # Demo data
vercel.json            # Cron schedules
```

## Auth note

Only `@asu.edu` emails are allowed (Zod validation + DB check on `profiles.email` + signup trigger). Non-ASU addresses get a friendly error.

## License

Private / student project — not an official ASU product.
