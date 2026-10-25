# Rumi — Product & Technical Proposal

> Written before any code, per the build process. It covers the database schema, the page map, and the design system tokens. The rest of the build follows it. Where the implementation had to deviate, the change is noted inline.

Rumi is a roommate-matching web app for college students. It launches at Arizona State University. Students verify a school email, describe how they live, and browse a **ranked list** of compatible roommates. Each match shows a score and the reasons behind it. There is no swiping.

---

## 1. Architecture at a glance

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 14 App Router, React 18, TypeScript (strict) | Server Components for data-heavy pages; Server Actions for mutations |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) + shadcn-style components on Radix primitives | Tokens live in one CSS file; components are owned code, restyled to Rumi |
| Motion | `motion/react` (Framer Motion) everywhere, `lenis` on the landing page only | Springs, shared layout (`layoutId`), drag gestures |
| Data | Supabase: Postgres + RLS, Auth (email OTP, Google), Storage, Realtime | One managed backend; RLS on every table |
| Validation | Zod schemas shared by client and server | One source of truth for input rules |
| Email | Resend (HTTP API) in production, SMTP (Mailpit) locally | Notification emails work end to end in dev |
| Tests | Vitest (matching engine and pure utilities), Playwright (E2E against a local Supabase stack) | |
| Hosting | Vercel (+ Vercel Cron) | |

**Mutation pattern.** Client → Server Action → Zod validate → rate-limit check → Supabase call using the *user's* session, so RLS applies. Multi-step writes (accepting an intro, joining a group) are single `security definer` SQL functions. Each one checks `auth.uid()` itself, so the writes are atomic. The service-role key is used only in trusted server code: match recompute, notifications fan-out, admin actions, rate limiting, and account deletion.

---

## 2. Database schema

Every table has Row Level Security enabled. "Owner" means `auth.uid() = user_id`. Visibility of other students is decided by one SQL function, `can_view_profile(viewer, target)`. Every cross-user read policy uses it.

`can_view_profile(viewer, target)` is true when all of these hold:

- the target has finished onboarding and is not banned;
- the target is not hidden, or the viewer already shares a conversation with them;
- neither user has blocked the other;
- both are at the same school;
- if the target turned on *verified students only*, the viewer's student verification is current.

### 2.1 Identity & profile

```
schools
  id text PK ('asu') · name · short_name · email_domains text[] · timezone · active bool

areas
  id uuid PK · school_id → schools · slug · name · description · sort_order
  unique (school_id, slug)

profiles                         -- public-safe fields only
  id uuid PK → auth.users (cascade)
  school_id → schools
  first_name · last_initial · pronouns · gender ('woman'|'man'|'nonbinary'|'other'|'undisclosed')
  class_year ('freshman'|'sophomore'|'junior'|'senior'|'grad')
  major · bio (≤ 500) · avatar_path
  is_hidden bool                 -- privacy: hide me from matches
  verified_only bool (default true)  -- privacy: only verified students can see me
  student_verified_at timestamptz    -- set by OTP or school-domain Google; re-verify yearly
  onboarding_step smallint · onboarding_completed_at
  banned_at · is_seed bool · last_active_at · created_at · updated_at

user_settings                    -- owner-only, never readable by others
  user_id PK → profiles · email · last_name
  theme ('system'|'light'|'dark')
  notify_inapp_{intros,messages,matches,groups} bool
  notify_email_{intros,messages,matches,groups} bool
  last_match_digest_at · created_at

admins
  user_id PK → profiles          -- read: self only; writes: service role
```

Users cannot update system columns such as `student_verified_at`, `banned_at`, `onboarding_completed_at`, or `is_seed`. `profiles` grants `UPDATE` only on the editable columns (column-level privileges).

### 2.2 Photos & preferences

```
photos
  id uuid PK · user_id → profiles · storage_path · position smallint (0–5)
  width · height · placeholder (tiny base64 LQIP) · created_at
  unique (user_id, position)
  storage bucket `photos` (public read, unguessable paths `{user_id}/{uuid}.jpg`,
  write/delete only inside your own folder, 5 MB, jpeg/png/webp)

preferences                      -- one row per user
  user_id PK → profiles
  -- housing
  budget_min int · budget_max int (USD / month)
  areas text[] (area slugs) · move_in_date date
  lease_length ('semester'|'academic_year'|'twelve_months'|'flexible')
  housing_type ('on_campus'|'off_campus'|'either')
  gender_pref text[]             -- acceptable roommate genders; empty = anyone
  -- lifestyle (1–5 scales unless noted)
  sleep_schedule (early bird → night owl) · cleanliness (relaxed → spotless)
  noise (quiet → lively) · guests (rarely → often)
  smoking ('never'|'sometimes'|'regularly') · drinking ('never'|'socially'|'often')
  pets ('none'|'have'|'want') · study ('campus'|'home_quiet'|'home_social'|'mix')
  -- matching controls
  dealbreakers text[]            -- see §2.4
  weights jsonb                  -- importance 0–3 per factor
  updated_at
```

### 2.3 Music (optional Spotify)

```
spotify_accounts                 -- owner-only; tokens AES-256-GCM encrypted at the app layer
  user_id PK · spotify_user_id · display_name · access_token_enc · refresh_token_enc
  expires_at · scopes · connected_at · last_synced_at

music_profiles                   -- readable when can_view_profile
  user_id PK · top_artists jsonb [{id,name,image,genres}] · top_genres text[] · synced_at
```

### 2.4 Matching

```
match_scores                     -- directed: how viewer sees candidate
  viewer_id · candidate_id · PK (viewer_id, candidate_id)
  score smallint (0–100)
  reasons jsonb      -- top 3 [{key, label}]
  watchouts jsonb    -- up to 2 friction points
  breakdown jsonb    -- per-factor {key, similarity, weight}
  shared_artists jsonb · computed_at · notified_at
  index (viewer_id, score desc, candidate_id)
  RLS: viewer reads own rows; writes only via service role
```

**Engine** (`src/lib/matching`, pure TypeScript, unit tested):

- **Hard filters**, applied before scoring:
  - mutual gender preference;
  - each side's selected dealbreakers: no smokers, no pets, no frequent drinkers, no frequent guests, similar sleep, as tidy as me, quiet home, budgets overlap, shared area, move-in within 30 days, same housing type.
- **Factors:** budget, areas, move-in, lease, housing type, sleep, cleanliness, noise, guests, smoking, drinking, pets, study, and music (only when both users connected Spotify). Each factor gives a similarity from 0 to 1.
- **Directional satisfaction:** `S(A→B) = Σ wA·sim / Σ wA`. Importance levels 0–3 map to weights 0, 1, 3, 6.
- **Score:** `round(100 · √(S(A→B) · S(B→A)))`. It is symmetric, and it is high only when *both* people would be happy.
- **Reasons:** the top three factors by `similarity × combined weight`, each rendered as a human sentence ("You're both night owls", "Budgets overlap by $250"). **Watch-outs** are the biggest weighted gaps.
- **Recompute:**
  - triggers: onboarding completion, a preference edit, a Spotify sync, and a nightly cron;
  - recomputes both directions for every same-school candidate and deletes pairs that now fail a filter;
  - when a score crosses 85 for the first time, it creates a strong-match notification.
- **Read path:** `get_match_feed(filters, sort, cursor, limit)` (security invoker, so RLS applies).
  - filters: budget, area, move-in window, gender, class year, search, saved only;
  - sorts: best match, newest, soonest move-in, lowest budget;
  - keyset cursor, which gives infinite scroll.

### 2.5 Social graph

```
saves          user_id · target_id · created_at · PK both             (owner)
blocks         blocker_id · blocked_id · created_at · PK both         (owner)
intros         id · sender_id · recipient_id · message (≤ 500)
               status ('pending'|'accepted'|'declined'|'withdrawn') · conversation_id
               created_at · responded_at
               unique pending per unordered pair; 20 / day per sender
               RLS: parties read; sender inserts (can_contact); updates via accept_intro()/decline/withdraw
```

### 2.6 Messaging

```
conversations         id · kind ('direct'|'group') · group_id · created_at · last_message_at · last_message_preview
conversation_members  conversation_id · user_id · joined_at · last_read_at · PK both
messages              id · conversation_id · sender_id · body (1–2000) · client_id (optimistic dedupe) · created_at
                      index (conversation_id, created_at desc)
```

- A direct conversation is created only by `accept_intro()`, so chat unlocks after an accepted intro.
- **Realtime:**
  - `postgres_changes` on `messages` and `conversation_members` (filtered by RLS) carries new messages and read receipts;
  - **private** broadcast channels (`realtime.messages` RLS: members only) carry the typing indicator and presence.
- **Unread counts:** `unread_counts()` RPC (messages newer than `last_read_at`, not sent by me).

### 2.7 Groups

```
groups         id · school_id · name · owner_id · target_size (2–4) · status ('open'|'full'|'closed') · created_at
group_members  group_id · user_id · role ('owner'|'member') · joined_at · unique (user_id)   -- one group per student
group_invites  id · group_id · inviter_id · invitee_id · message · status · created_at · responded_at
```

- **Group fit for candidate C:** the mean of `match_scores(member → C)`, counted only when every member has a row (that is, C passes everyone's dealbreakers). The weakest pair is reported as a "watch-out".
- **RPCs:**
  - `group_candidates(group_id)` ranks people for an open group;
  - `groups_for_me()` lists open groups you'd fit;
  - `accept_group_invite()` joins the group and its chat atomically.

### 2.8 Notifications, safety, ops

```
notifications     id · user_id · type ('intro_received'|'intro_accepted'|'message'|'strong_match'|'group_invite'|'group_joined')
                  actor_id · entity_id · title · body · href · read_at · emailed_at · created_at   (owner read/update)
reports           id · reporter_id · reported_id · reason ('fake'|'harassment'|'spam'|'scam'|'inappropriate'|'safety'|'other')
                  details · context jsonb (message excerpt, conversation) · source ('user'|'auto')
                  status ('open'|'reviewing'|'actioned'|'dismissed') · resolution_note · reviewed_by · reviewed_at · created_at
                  RLS: reporter inserts/reads own; admins read/update all (is_admin())
moderation_log    id · actor_id · action · target_id · report_id · meta · created_at   (admins)
rate_limits       key · window_start · count · PK both  — rate_limit(key, max, window_seconds) (service role only)
```

**Moderation hooks:**

- `moderateText()` scans intros and messages for payment-scam patterns (deposits, Zelle, wire transfers, gift cards), contact harvesting, and slurs.
- **Flagged content is not blocked.** It creates an `auto` report for review, can be forwarded to `MODERATION_WEBHOOK_URL`, and shows a gentle safety tip in the chat.

**Bans:**

- `profiles.banned_at` hides the user everywhere;
- Supabase Auth ban duration blocks sign-in.

---

## 3. Page map

```
Public
  /                       Landing: hero, scroll story, why-you-match, trust & safety, FAQ, CTA
  /login                  Email → 6-digit code (OTP); Google (school accounts only)
  /auth/callback          OAuth / PKCE code exchange (route handler)
  /auth/confirm           Magic-link token_hash check behind a button press (scanner-safe)
  /privacy, /terms        Legal
  /offline                PWA offline fallback

Onboarding (focused layout, no nav)
  /onboarding             10 steps, URL-synced (?step=), progress bar, autosave on every change
                          basics → photos → about → housing → areas → lifestyle → habits → priorities → dealbreakers → music

App (sidebar ≥ 1024px, bottom tabs below)
  /matches                Ranked feed · filters (bottom sheet on mobile) · sort · search · saved view · infinite scroll
                          → card opens the profile as an overlay (URL becomes /profile/[id], layoutId morph)
  /profile/[id]           Full profile (deep link / refresh): carousel, score ring, breakdown, music, save, intro
  /messages               Chats + Requests (intros & group invites) tabs, unread badges
  /messages/[id]          Thread: realtime, typing, read receipts, safety menu (report / block)
  /groups                 Your group or create one · groups looking for someone like you
  /groups/[id]            Members, combined fit, suggested roommates for the group, invite, group chat
  /notifications          Activity feed (bell in the mobile top bar, sidebar on desktop)
  /settings               Index → profile & preferences · notifications · privacy & safety (hidden, verified-only,
                          blocked list) · connected accounts (Spotify, Google) · appearance · your data (export) · account
  /admin                  Reports queue, report detail sheet, user search, ban / unban, revoke verification, stats

API
  /api/matches                    GET feed page (infinite scroll)
  /api/profiles/[id]              GET profile detail for the overlay
  /api/spotify/connect|callback   OAuth
  /api/account/export             GET JSON export of everything we store about you
  /api/cron/recompute             Nightly safety-net recompute
  /api/cron/digest                Daily strong-match email digest
```

**Navigation.**

- Mobile bottom tabs: Matches · Messages · Groups · You. The You tab opens your profile preview and settings.
- The bell and the page title sit in a glass top bar.
- Desktop gets the same destinations in a 248px sidebar, plus Notifications and Admin.

---

## 4. Design system

### 4.1 Principles

1. **Calm by default.** Warm paper surfaces, near-black type, and **one** accent used sparingly for meaning: the score, unread state, and focus.
2. **Depth through light, not decoration.** Hairline borders plus layered soft shadows. Glass blur appears only on nav bars.
3. **Motion explains.** Every animation shows where something came from, confirms an action, or guides attention. Nothing is decorative.
4. **Thumb first.** Primary actions sit in the bottom 40% of the screen on mobile. Tap targets are at least 44px.

### 4.2 Color tokens

| Token | Light | Dark (hand-tuned) | Use |
| --- | --- | --- | --- |
| `--bg` | `#F7F5F0` | `#121110` | Page |
| `--surface` | `#FFFFFF` | `#1A1917` | Cards, sheets |
| `--surface-raised` | `#FFFFFF` | `#222120` | Popovers, menus |
| `--surface-sunken` | `#F0EDE6` | `#0E0D0C` | Inputs, wells, tracks |
| `--ink` | `#171614` (16.6:1) | `#F2EFE9` (16.4:1) | Primary text |
| `--ink-2` | `#5E5A53` (6.3:1) | `#ABA69D` (7.8:1) | Secondary text |
| `--ink-3` | `#6F6A62` (4.9:1) | `#8A857D` (5.2:1) | Meta, placeholders |
| `--line` | `#E7E3DB` | `#2A2826` | Hairlines |
| `--line-strong` | `#D7D2C8` | `#3A3734` | Input borders, dividers |
| `--accent` | `#E8542A` Ember | `#FF6B3D` | Score ring, highlights, badges |
| `--accent-ink` | `#C2441E` (4.7:1) | `#FF7A4D` (6.8:1) | Accent text |
| `--accent-soft` | `rgb(232 84 42 / 0.10)` | `rgb(255 107 61 / 0.14)` | Tinted backgrounds |
| `--success` / `--warning` / `--danger` | `#2F7A55` / `#B7791F` / `#C2362B` | `#4FB585` / `#E0A33E` / `#F06B5E` | Status |

Primary buttons are **ink**: near-black on light, off-white on dark. Ember is reserved for meaning. Ember was chosen as a desert/sunset orange because it is distinctive, warm, and nowhere near the purple-blue AI look.

The dark theme is not an inversion:

- Surfaces lift in lightness instead of using shadows.
- Ember is brightened about 8% to hold vibrance on charcoal.
- Text is warm off-white, not pure white.

### 4.3 Typography

- **Display:** *Instrument Serif* 400 (+ italic for emphasis). Used for page titles, onboarding questions, profile names, landing headlines, and empty-state titles. Tracking is −0.02em at display sizes.
- **UI:** *Inter* variable (optical sizes on), 400/500/600. Headings in Inter use −0.02em tracking.
- **Wordmark:** lowercase **rumi** set as an outlined SVG (Inter Display, weight 700, −0.06em tracking, tuned pairs). This is a bold, compact, lowercase geometric-grotesque wordmark in the style of the Rho reference. It appears in the nav, the splash screen, and the favicon (the `r`).

| Style | Size / line | Font |
| --- | --- | --- |
| display-2xl | 72 / 72 | Serif |
| display-xl | 56 / 56 | Serif |
| display-lg | 40 / 44 | Serif |
| display-md | 32 / 36 | Serif |
| display-sm | 24 / 28 | Serif |
| title | 18 / 24 · 600 | Inter |
| body | 16 / 24 | Inter |
| body-sm | 14 / 20 | Inter |
| caption | 12 / 16 · 500 | Inter |

### 4.4 Space, radius, elevation

- **Spacing:** 8px grid, with 4px half-steps only inside components. The page gutter is 16px on mobile and 32px on desktop.
- **Radius:** `--r-sm 8px` (chips, small controls) · `--r-md 12px` (buttons, inputs) · `--r-lg 16px` (cards) · `--r-xl 24px` (sheets, hero cards) · `--r-full`.
- **Shadows** are layered and warm-tinted, with dark-mode variants deeper and subtler:
  - `--shadow-xs`: `0 1px 2px rgb(23 22 20 / .05)`
  - `--shadow-sm`: `0 1px 2px rgb(23 22 20 / .04), 0 2px 8px rgb(23 22 20 / .04)`
  - `--shadow-md`: `0 1px 2px rgb(23 22 20 / .04), 0 4px 12px rgb(23 22 20 / .05), 0 16px 32px rgb(23 22 20 / .06)`
  - `--shadow-lg`: `0 2px 4px rgb(23 22 20 / .04), 0 12px 24px rgb(23 22 20 / .08), 0 32px 64px rgb(23 22 20 / .10)`
- **Glass:** `--glass-bg` (bg at 72% alpha) + `backdrop-filter: blur(20px) saturate(1.4)`. Used only on the top bar, bottom tabs, and sidebar.
- **Icons:** Lucide, 1.75 stroke everywhere, sized 16 / 20 / 24.

### 4.5 Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `spring` | stiffness 300, damping 30 | Default for layout and enter |
| `springSnappy` | stiffness 500, damping 35 | Press, toggles, small elements |
| `springSheet` | stiffness 320, damping 34 | Sheets, overlays |
| `dur.fast / base / slow` | 150 / 200 / 300ms | Opacity and color |
| `ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Non-spring tweens |
| `stagger` | 30ms, y 8px → 0 + opacity | List reveals (first page only, never on scroll-loaded pages) |
| `press` | scale 0.97 | Every button |

**Signature moments:**

- A match card morphs into the profile (`layoutId` on photo, name, and score).
- The score ring draws while the number counts up.
- A button morphs into a checkmark on success.
- Chat bubbles spring in.
- Routes slide and fade on push/pop, with a swipe-back edge gesture.
- On the landing page, profile cards assemble into a ranked list as you scroll.

**Constraints:**

- Only `transform` and `opacity` animate.
- `MotionConfig reducedMotion="user"` plus CSS overrides disable movement for `prefers-reduced-motion`, and fades are capped at 150ms.

### 4.6 Core components

Built on Radix and owned in `src/components/ui`:

- **Controls:** Button (press + loading + success morph), Input, Textarea (auto-grow), Field, Select, Slider (range), SegmentedControl (sliding pill), ToggleChip, Switch, Checkbox.
- **Display:** Avatar, Badge, Skeleton (transform shimmer), Card, ScoreRing, PhotoCarousel, EmptyState, ErrorState, Spinner.
- **Overlays:** ResponsiveSheet (vaul drawer with drag-to-dismiss on mobile, Radix dialog on desktop), DropdownMenu, Popover, Tooltip, Tabs, Accordion.
- **Feedback:** Toast (sonner).

---

## 5. Quality bar

- **Accessibility (WCAG AA):**
  - every color pair above meets 4.5:1 for text;
  - visible 2px focus rings;
  - full keyboard paths for every flow;
  - labelled icon buttons;
  - live regions for toasts, typing, and new messages.
- **Performance:**
  - RSC by default, client components only where interactive;
  - `next/image` with blur placeholders;
  - self-hosted subset fonts;
  - no animation libraries on the server path;
  - target: Lighthouse 95+.
- **Security:**
  - RLS on every table;
  - column-level update grants;
  - security-definer functions check `auth.uid()`;
  - Zod on every input;
  - text sanitization (control and zero-width characters stripped);
  - Postgres-backed rate limits on OTP send and verify, intros, messages, and reports;
  - security headers.
- **Testing:**
  - Vitest for the matching engine;
  - Playwright E2E for sign-up, onboarding, matching, and chat, run against the local Supabase stack, with OTP codes read from Mailpit.
