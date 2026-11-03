# Rumi — ASU Housing Pilot Master Build Prompt

> Paste this whole document into the Cursor "roomie match" Project. It extends the existing Rumi app (repo `github.com/kjodhpur/Rumi`, formerly `kjodhpur/RoomieMatch`; Vercel project `kjodhpurs-projects/rumi`; live at https://rumimatch.app). Do **not** rebuild what exists. Build every feature below end to end, phase by phase, and merge each phase to `main`.

> **Corrections after checking the repo (Nov 3, 2026).** The original draft said a few things that weren't true of the code. Fixed inline below:
> 1. Seed rows are marked `is_seed`, but nothing hid them in production. The switch is a per-school database setting (`schools.hide_seed_profiles`) toggled in `/admin`, not an env flag: env changes need a redeploy, while a database setting takes effect on the next request. It is off by default, so the live demo profiles stay until the owner turns it on.
> 2. There is no hosted staging project. Development and tests run against the local Supabase stack (`npm run db:start`); migrations reach the live project only when a phase merges.
> 3. The Instagram handle did not exist yet. It is built with mutual connections (Phase 7.2).
> 4. `main` had moved past d1cec10 (hero one-liners, PR #3).
> 5. Spotify uses the server-side authorization-code flow with a client secret and a state cookie. That is correct for a confidential server client; PKCE is not needed.
> 6. There was no push-notification stub to finish; web push is built from scratch when it is scheduled.
>
> Build order for the first pass (the §7 demo path): setup → Phase 0.1–0.2 → Phase 1 core + 1.C → 2a export → Phase 4 + 4.1 → Phase 5 core → Phase 6 core → 7.2 mutuals → Demo University seed. Progress is logged in `docs/PROGRESS.md`.

---

## 0. Non-negotiable rules

These come from Kanha's earlier prompts in this Project, quoted verbatim, and from the repo's existing conventions. Where two rules conflict, the newer instruction wins (noted inline).

### 0.1 Verbatim from Kanha's prompts
- "It is FREE for students. There is NO swiping."
- "No swiping. Students set preferences and browse a ranked list of compatible matches, each with a clear compatibility score and a "why you match" explanation."
- "Free for students. ASU only at launch: require a verified @asu.edu email, but make the school configurable for future campuses."
- "ONLY allow emails ending in @asu.edu. Enforce this server-side (in the auth flow and in a DB check/trigger), not just in the UI."
- "It must work flawlessly on desktop and mobile (responsive web + installable PWA). It should feel like a world-class product designer made it: calm, modern, fast, accessible, with motion as good as the best apps on Mobbin."
- Tech stack: "Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui"; "Framer Motion (motion/react) for all UI motion; Lenis for smooth scrolling on the landing page"; "Supabase (Postgres, Auth, Storage, Realtime) with Row Level Security on every table"; "Zod for validation; typed data layer"; "Deploy-ready for Vercel; .env.example with every variable documented".
- "Optional Spotify integration (OAuth): pull top artists and genres, show shared artists, and factor them into the score. The app works fully without it."
- "Store refresh tokens encrypted server-side and refresh the data on demand and weekly (Vercel cron route)." / "Allow disconnecting Spotify, which deletes stored Spotify data." / "Note in README: the Spotify app starts in Development Mode … document how to request an extended quota."
- "Instagram handle (optional, displayed as a link only; do not call any Instagram API)."
- "Never show full last name, email, or exact address."
- "Block hides both users from each other everywhere, including chat."
- "Input sanitization, server-side validation with Zod on every action, rate limiting on auth and messaging."
- "Mark them is_seed = true and hide them in production by an env flag."
- UX & layout: "Mobile-first, thumb-friendly bottom nav on mobile, sidebar on desktop"; "Optimistic UI, skeletons, toasts, and helpful empty and error states"; "Bottom sheets with drag-to-dismiss on mobile instead of modals"; "WCAG AA accessibility: keyboard nav, focus states, aria labels, contrast"; "Lighthouse 95+ on performance, accessibility, best practices, and SEO".
- Visual style "(no generic AI look)": "Avoid: purple-blue gradients, glowing blobs, emoji icons, a centered hero over three feature cards, and fade-up on every element"; "Restrained palette: warm off-white and near-black base, one distinctive accent color, and a dark mode tuned by hand rather than inverted"; "Real depth: subtle borders, layered soft shadows, glass blur only on nav bars"; "8px grid with consistent radius, shadow, and color tokens"; "Lucide or Phosphor icons with one consistent stroke weight"; "Use 21st.dev, Aceternity, or Magic UI components only when they fit, and restyle them to the Rumi design system so nothing looks copy-pasted".
- Motion "(top priority)": "Every animation has a purpose: show where something came from, confirm an action, or guide attention"; "Spring physics (stiffness ~300, damping ~30), with UI durations of 150–300ms; nothing feels slow"; "Subtle staggered list reveals (opacity + 8px translate, 30ms stagger)"; "Tactile buttons: slight scale on press, a checkmark morph on success"; "Respect prefers-reduced-motion everywhere"; "Hold 60fps on mid-range phones by animating only transform and opacity".
- Quality: "Fully typed, no `any`. ESLint + Prettier."; "Loading, empty, and error states on every page."; "Clean folder structure and reusable components, with no TODOs or placeholder features. Every button must work."
- Process: "Propose the database schema, page map, and design system tokens before writing code."; "Build feature by feature, running and testing each one before moving on."; "At the end, test every flow at 375px mobile and 1440px desktop and fix anything broken."; "Review every screen and ask, "Would this be featured on Mobbin?" If not, redesign it."
- "Build everything end to end, run the tests, and fix any type or lint errors before finishing. At the end, summarize what was built and any manual setup steps left."
- Fonts (Kanha, Nov 3, overrides all earlier font instructions): keep exactly the fonts the live site rumimatch.app uses today: Inter for UI and body, Instrument Serif for display/wordmark. Do NOT add DM Sans or change fonts.
- Mutuals: "theres should also be a way for people to see mutuals via social media or something where they can see web of connections / points of contact so that person is more trusted".
- Git: "finish and always merge to main" / "merge everything to main".

### 0.2 Repo conventions (read before coding)
- Read `README.md`, `docs/PROPOSAL.md`, `.eslintrc.json` (`next/core-web-vitals` + `prettier`), `.prettierrc` (semi, double quotes, trailing commas, width 100, `prettier-plugin-tailwindcss` with `cn`/`cva`), `tsconfig.json`, `vitest.config.mts`, `playwright.config.ts`, `next.config.mjs` (strict CSP — extend it, never loosen it globally), `vercel.json`, `.env.example`. If an `AGENTS.md` or `.cursor/rules` gets added, follow it too.
- Folder layout (keep it): `src/app/(app)/*` signed-in routes; `src/app/(auth)`; `src/app/api/*` route handlers; `src/app/actions/*.ts` server actions (one file per domain); `src/components/<domain>/` + `src/components/ui/` design system (Radix + cva); `src/lib/*` domain logic (pure where possible: `lib/matching/engine.ts` is the model); `src/lib/supabase/` clients; `src/lib/email/`; `supabase/migrations/YYYYMMDDHHMMSS_name.sql` (new migrations only — never edit existing ones); `scripts/seed*.ts`; `e2e/*.spec.ts`.
- Reuse existing helpers: `lib/action.ts` (action result pattern), `lib/validation.ts` (Zod), `lib/sanitize.ts`, `lib/rate-limit.ts` (Postgres-backed), `lib/crypto.ts` (AES-256-GCM via `TOKEN_ENCRYPTION_KEY` for every third-party token), `lib/cron.ts` (`CRON_SECRET` bearer), `lib/email/*` (Resend → SMTP → console), `lib/motion.ts` springs, `lib/school.ts`, `lib/time.ts` (`NEXT_PUBLIC_CAMPUS_TZ`), `components/ui/{sheet,empty-state,error-state,skeleton,score-ring,segmented-control,toggle-chip,…}`.
- Security model: RLS on every new table; cross-user reads through `can_view_profile()` or a new equally narrow security-definer function; column-level grants for writes; service role only on the server. Run `npm run db:types` after each migration and commit `src/types/database.ts`.
- Design tokens live in `src/app/globals.css` (`--bg #f7f5f0`, `--ink #171614`, Ember accent `--accent #e8542a`, hand-tuned dark theme). Keep the brand, the `rumi` wordmark and the accent. Fonts: keep the current Inter + Instrument Serif setup in `src/app/fonts.ts` unchanged. Keep the Ember accent (confirmed by Kanha). Do not introduce new colors outside tokens.
- Every PR/phase must pass `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`, then **merge to `main`** (a direct merge if PR tooling is blocked, as done before). Vercel auto-deploys `main`.
- Staff features are **B2B but free for students**. Never put a student-facing paywall in.
- Do not claim ASU affiliation in UI copy until a signed pilot exists. Keep the footer line "not affiliated with Arizona State University".

---

## 1. What already exists — do NOT rebuild (main @ 1dcd8c3)

- Auth: 6-digit email OTP, school-domain gate in a DB trigger, optional school Google sign-in, yearly re-verification (`student_verified_at`).
- Onboarding: 10 autosaved steps, photo upload/crop/reorder (`photos`), per-factor weights (skip 0 / nice 1 / important 3 / must 6), dealbreakers, optional Spotify.
- Matching: `src/lib/matching/engine.ts` (pure, unit-tested) — hard filters (gender pref, dealbreakers on smoking/pets/drinking/guests/sleep/cleanliness/noise/budget/area/move_in/housing_type), weighted per-direction similarity, mutual score `round(100·√(S_a·S_b))`, reasons + watch-outs; stored in `match_scores`; recomputed on change and by `/api/cron/recompute` nightly.
- Matches feed (filters, sort, search, saved view), profile with score ring/breakdown/shared music, saves, hides, blocks.
- Intros → realtime 1:1 + group chat (typing, read receipts, unread), groups of 2–4 with combined + pairwise fit, invites and join requests.
- Notifications: in-app realtime, email, strong-match (≥85) alert, daily digest cron.
- Safety: report/block, regex moderation (`lib/moderation.ts`: payment/contact/link/abuse) with auto-reports + in-thread payment tip, moderation webhook, `/admin` (ADMIN_EMAILS) with report queue, suspend/restore, revoke verification, people search, activity log, stats.
- Settings: theme, notifications, JSON export, account deletion. PWA + offline page. Multi-school via `schools`/`areas` tables. Seed script (`is_seed`; hidden when the school's `hide_seed_profiles` switch is on).
- Tables: schools, areas, profiles, user_settings, admins, photos, preferences, spotify_accounts, music_profiles, match_scores, saves, blocks, groups, group_members, group_requests, conversations, conversation_members, messages, intros, notifications, reports, moderation_log, rate_limits.

**Verify, then fix if missing** (the v2 build reported these but they are not in current `main`): the social "see mutual connections" feature (confirmed wanted by Kanha, build it); weekly Spotify refresh cron; push notifications (no stub exists — build from scratch); the optional Instagram handle (not built yet); the seed-hiding switch (added as `schools.hide_seed_profiles`, toggled in `/admin`).

---

## 2. Global specs that apply to every feature

- **States**: each new screen ships loading (skeleton matching final layout), empty (helpful copy + one action), error (`error-state` with retry), offline (PWA banner), and permission-denied states.
- **Responsive**: verify at 375px and 1440px; staff dashboard also at 1024px. Bottom sheets on mobile, dialogs/side panels on desktop.
- **Accessibility**: WCAG 2.1 AA — labels, focus rings, `aria-live` for async results, keyboard-only flows, charts with a table fallback and text summary, color never the only signal, 44px touch targets. Add `@axe-core/playwright` checks to every new e2e spec (zero serious/critical violations).
- **Motion**: reuse `lib/motion.ts` springs; reduced-motion fallbacks; transform/opacity only.
- **Copy**: plain, warm, no emoji icons. Staff screens are denser (tables) but still use the same tokens.
- **Privacy**: student-level data shown to staff only where the student has consented (see Phase 1). Aggregates suppress any cell with fewer than 5 students ("<5").
- **Audit**: every staff read of student-level data and every staff write logs to `audit_log`.
- **Rate limits**: add buckets for every new write endpoint in `lib/rate-limit.ts`.
- **Feature flags**: each integration behind `NEXT_PUBLIC_<NAME>_ENABLED` + server checks, documented in `.env.example` and README; the app works with all of them off.

---

## 3. Phases (in priority order for the ASU Housing pilot)

Each phase: propose schema + page map in a short `docs/phase-N.md` first, build, test, merge to `main`, update README.

### Phase 0 — Foundations: roles, consent, audit, privacy (blocks everything else)

**0.1 Admin roles (RBAC)**
- Replace the binary `admins` model with roles while keeping `ADMIN_EMAILS` bootstrap working.
- Roles: `platform_admin` (Rumi team), `housing_admin` (school-scoped: full staff dashboard, config, exports), `housing_staff` (read dashboards, manage pairing review), `ra` (sees only assigned buildings/floors, check-in alerts, mediation), `analyst` (aggregates only, no student-level data), `moderator` (report queue).
- Data: `staff_members(id, user_id → auth.users, school_id, role, scopes jsonb {buildings[], communities[]}, invited_by, created_at, disabled_at)`; `staff_invites(id, school_id, email, role, scopes, token_hash, expires_at, accepted_at)`.
- Staff may use non-student emails of the school domain (e.g., `@asu.edu` staff) — they never appear in the student pool (`profiles` not created, or `is_staff=true` excluded in `can_view_profile`).
- SQL helpers: `has_role(school uuid, roles text[]) returns boolean`, `staff_scope_includes(building text)`. All staff RLS policies use them.
- UI: `/staff/settings/team` — invite by email (Resend), change role, disable; invite acceptance page.
- Edge cases: last `housing_admin` cannot remove themselves; disabled staff lose access immediately (check on every request, not only at sign-in); a student account cannot be upgraded to staff without platform_admin approval.
- Tests: unit tests on `has_role`; RLS tests (pgTAP or Vitest against local Supabase) proving each role sees only what it should; e2e invite → accept → dashboard.
- Acceptance: an `ra` scoped to building X cannot query any data for building Y through the UI, API, or direct Supabase client.

**0.2 Consent & FERPA posture**
- `consents(id, user_id, school_id, kind, version, granted_at, revoked_at)` with kinds: `share_with_housing` (match/group/agreement data visible to housing staff), `checkins`, `research_outcomes` (de-identified A/B analysis), `sms`, `calendar`, `social_verification`.
- Onboarding gains an optional "Share my Rumi results with ASU Housing" step (default off, clear explanation, revocable in Settings → Privacy). Without it staff only see aggregates.
- Privacy center in Settings: list of consents with toggles, what each shares, history.
- Data retention: `retention_policies(school_id, entity, days)`; nightly `/api/cron/retention` purges messages older than N days after both members leave, inactive accounts after 24 months (with 30-day warning email), check-in free text after term end + 90 days, audit logs kept 3 years. Make values configurable per school; defaults documented.
- Staff data-subject tools: export a student's records (with the student's consent or a logged legal basis), delete on request.
- Docs: `docs/security/` — data map, subprocessors (Supabase, Vercel, Resend, Spotify, Twilio if used), FERPA "school official" model statement draft (clearly marked "needs legal review"), incident-response runbook, DPA template placeholder (marked for review). No claims of SOC 2 or certification.
- `audit_log(id, actor_id, school_id, action, entity, entity_id, meta jsonb, ip, created_at)` — append-only (no update/delete grants).
- Acceptance: revoking `share_with_housing` removes the student from all staff student-level views within one request; retention cron is idempotent and tested with fixed clocks.

**0.3 Escalation to housing / Title IX / CARE (finish beyond crisis keywords)**
- Spec: report flow gains a "This is serious" path with categories (harassment/sexual misconduct, threat of harm, discrimination, wellbeing concern). Each school configures routing in `/staff/settings/escalation`: destination (Title IX office, Dean of Students/CARE, housing on-call, campus police) with the school's own public reporting URL/phone. The student always sees the destination and that Rumi does not replace those offices, plus 988 and 911 for emergencies. Content is forwarded only when the student chooses to send it, except where the school's documented policy requires it (marked "needs legal review").
- Data: `escalation_routes(school_id, category, destination_label, url, phone, email, active)`, `escalations(id, report_id, category, route_id, forwarded_at, forwarded_by, student_consented bool)`.
- Permissions: configure = `housing_admin`; view escalations = platform_admin + school `moderator`.
- Edge cases: no route configured → national resources only and a setup warning on `/staff`; reporter is the reported user's roommate → still allowed, block offered.
- Tests: unit routing; e2e report → destination shown; RLS.
- Acceptance: with no ASU route configured, the UI never implies an ASU office was notified.

**0.4 Security documentation pack (FERPA / SOC 2 readiness, no certification claims)**
- Extend `docs/security/`: control matrix mapped to SOC 2 Trust Services Criteria headings marked "readiness, not certified"; HECVAT Lite answers draft; access-review procedure; backup/restore test record; vulnerability-disclosure page `/security`. All marked for review.
- Acceptance: every document states its status ("draft — not audited").

**0.5 AI moderation upgrade (behind a flag)**
- Spec: `lib/moderation/classify.ts` interface with the existing regex as the default; optional model-based classifier via the Vercel AI Gateway (`AI_MODERATION_ENABLED`). Pipeline: regex first (fast block of payment/contact), then classifier for harassment/threat/scam intent with confidence; ≥ threshold auto-reports, never auto-bans. Message text sent to the model only if the school enables it (documented subprocessor). Timeouts fall back to regex.
- Data: `moderation_log.classifier`, `moderation_log.confidence`.
- Tests: fixture corpus with precision/recall report in CI (no live calls — mocked); fallback test.
- Acceptance: with the flag off, behaviour is byte-identical to today.

### Phase 1 — Housing-office staff dashboard & analytics

- Route group `src/app/(staff)/staff/*` with its own sidebar shell (same tokens), separate from the student app. Middleware: staff role required.
- **Overview** `/staff`: KPIs for the selected term — students verified, onboarding completion %, % with ≥1 mutual match ≥70, % in a confirmed pair/group, intros sent/accepted, median time to match, unmatched count, reports open. Trend charts by week. Every chart has a table fallback.
- **Funnel**: signup → verified → onboarded → first intro → accepted → pair/group confirmed → exported to StarRez.
- **Score distribution**: histogram of best-match scores; by class year, residential college/LLC, campus, gender-inclusive opt-in, housing_type (all with n<5 suppression).
- **Unmatched students** (consented only): table with filters and a "send nudge" campaign action (templated email/in-app; rate-limited; logged).
- **Pairs & groups review** `/staff/pairings`: confirmed pairs/groups with mutual score, pairwise matrix, dealbreaker status, flags (e.g., one member hid profile). Staff can mark "approved for assignment", "needs review", add notes. Bulk select → export (Phase 2).
- **Term configuration** `/staff/settings/term`: term name, key dates (roommate-request deadline, room selection windows), which questions are required, allowed weight ranges, extra school questions (question bank: type scale/choice/multi, label, options, factor key, Fair-Housing review checkbox — protected-class topics such as race, religion, national origin, disability, familial status are blocked by a server-side denylist + required reviewer sign-off).
- **Constraints**: optional rules like "freshmen must match within same academic college" (ASU FAQ rule), "LLC members match within LLC" — enforced as additional hard filters in the engine via a new `school_rules` input (pure function, unit-tested).
- **Reports export**: CSV and printable PDF term report (server-rendered HTML → print CSS) with KPIs + charts + methodology.
- Data: `terms(id, school_id, name, starts_on, ends_on, deadlines jsonb)`, `school_questions`, `school_rules`, `pairings(id, school_id, term_id, kind pair|group, member_ids uuid[], group_id, status, staff_notes, approved_by, approved_at)`, `campaigns`, `campaign_sends`, materialized view `staff_term_metrics` refreshed by cron.
- APIs: server actions in `src/app/actions/staff.ts`; read models in `src/lib/staff/*.ts` (pure aggregation functions, unit-tested).
- Edge cases: term with zero data (empty state with setup checklist), student changes groups after approval (status auto → needs review + notification), student deletes account (pairing shows "member left").
- Acceptance: a housing_admin can configure a term, watch the funnel update in near-real-time on seeded data, approve 10 pairings, and download the CSV — all keyboard-only.

**1.A Cohort / segment analytics (expanded)** — `/staff/analytics/segments`
- Spec: pick a segment dimension (class year, academic college, residential college/LLC, campus, gender-inclusive opt-in, housing_type, track: freshman/transfer/grad, pre-arrival vs enrolled) and a metric (onboarding %, matched %, median best score, intro acceptance, agreement completion, check-in average, room-change rate). Side-by-side bars + table; compare up to 3 segments.
- Data: reuse `staff_term_metrics`; add `segment_metrics(term_id, dimension, value, metric, n, numerator, computed_at)` refreshed by cron. Segment values come only from profile fields or imported assignments; never infer protected classes.
- Permissions: `analyst`, `housing_staff`, `housing_admin` (aggregates); `ra` limited to their buildings.
- Edge cases: n<5 → "<5" and the bar hidden; a student in multiple LLCs counts in each with a footnote; segment with no data → empty state.
- Tests: unit tests for suppression and numerator/denominator math; e2e change dimension → table updates; axe.
- Acceptance: every number reconciles with the overview KPIs for the same term (test asserts totals match).

**1.B Room-change reason analytics** — `/staff/analytics/room-changes`
- Spec: every room-change request (Phase 5 `room_change_requests`, or imported from StarRez in Phase 2) carries 1–3 reason tags from a school-editable taxonomy (noise, guests, cleanliness, schedule, communication, safety, accommodation, cost, other) + optional staff note. Charts: reasons over time, by building, by original match score band (<50, 50–69, 70–84, 85+), and by whether an agreement was signed.
- Data: `room_change_reasons(school_id, key, label, active)`, `room_change_requests.reason_keys text[]`, `room_change_requests.match_score_at_assignment int`.
- Permissions: tag write = `housing_staff`, `ra` (own scope); read aggregates = analyst+.
- Edge cases: imported changes without reasons show as "untagged" with a "tag now" queue; retagging is audited.
- Tests: unit (score banding, tagging), RLS, e2e tag → chart updates.
- Acceptance: staff can answer "do low-score pairs move more?" from one screen, with n<5 suppression.

**1.C Auto-pair the unmatched (staff-run proposal, never automatic placement)** — `/staff/pairings/auto`
- Spec: for consented students with no confirmed pair/group by a chosen cutoff, compute a proposed global pairing that maximises total mutual score subject to hard filters + `school_rules` + accommodation constraints (1.E). Algorithm: pure `lib/matching/assign.ts` — maximum-weight matching on the compatibility graph (Edmonds blossom for pairs; greedy + local-swap improvement for groups of 3–4), deterministic seed, ties broken by earlier signup. Output proposals with score and reasons; staff approve/reject per pair or in bulk; students get a "Housing suggested a roommate" intro they can accept or decline (never forced).
- Data: `auto_pair_runs(id, school_id, term_id, params jsonb, created_by, created_at, stats jsonb)`, `auto_pair_proposals(run_id, member_ids uuid[], score, status proposed|approved|sent|accepted|declined)`.
- Permissions: run/approve = `housing_admin`, `housing_staff`.
- Edge cases: odd count (one unpaired, listed); student with no feasible partner (listed with the blocking rule); student joins a group mid-run (proposal invalidated); re-running supersedes but never deletes accepted outcomes.
- Tests: unit — optimality vs brute force on ≤10 nodes, all hard filters respected, determinism; perf test 2,000 students < 30 s in a background job; e2e run → approve → student sees suggestion.
- Acceptance: on demo data, the run pairs ≥95% of feasible unmatched students with no dealbreaker violations.

**1.D Answer-consistency checks**
- Spec: pure rules in `lib/matching/consistency.ts` flag contradictory or "ideal-everything" answers (e.g., cleanliness 5 + chores "rarely"; sleep "early" + noise "late-night socialiser"; all factors set to "must" with the most socially desirable answer). Student sees a gentle, dismissible inline prompt during onboarding/edit ("These two answers pull in different directions — want to adjust?"). Never blocks submission; never shown to other students; staff see only the aggregate rate.
- Data: `preference_flags(user_id, rule_key, created_at, dismissed_at)`.
- Edge cases: re-flag only when the relevant answers change; disabled for skipped factors.
- Tests: table-driven unit tests per rule; e2e flag → adjust → disappears.
- Acceptance: no flag ever alters the score; flag copy passes plain-language review.

**1.E Accessibility & accommodation-aware matching**
- Spec: housing staff (not students) attach an approved-accommodation constraint to a consented student — e.g., "needs single-occupancy bathroom", "requires ESA-friendly roommate", "ground floor" — from a school-defined list. The engine treats them as hard constraints in auto-pair and as filters in pairing review. Nothing about the accommodation is ever shown to other students; the only student-visible effect is that some matches don't appear, and the explanation says "housing requirement" without detail. Students may also self-declare "pets/ESA: allergic" as a normal dealbreaker.
- Data: `accommodation_constraints(id, school_id, user_id, constraint_key, set_by, expires_on)` — encrypted note column optional; RLS: only `housing_admin` and assigned disability-coordination staff role scope; never selectable by `ra` or `analyst`.
- Edge cases: expired constraint stops applying at the next recompute; student revokes `share_with_housing` → constraint retained only if legally required (configurable, marked for legal review).
- Tests: RLS proves no student/RA/analyst can read rows; unit — engine respects constraints; e2e staff set → affected pair disappears from proposals.
- Acceptance: a pen-test-style script with each role's JWT cannot read `accommodation_constraints`.

**1.F Behavioral micro-questions (scenario questions)**
- Spec: question type `scenario` in the school question bank and a Rumi default set of 8 ("Your roommate's partner stays 3 nights a week — fine / talk first / not okay"). Each answer maps to a factor value and weight, explained in "why you match". Optional, shown after the core onboarding; max 8 per term.
- Data: `school_questions.type` adds `scenario`; `school_question_answers` stores choice; mapping in `school_questions.factor_map jsonb`.
- Edge cases: question edited after answers exist → new version, old answers kept for old version and excluded from scoring until re-answered.
- Tests: unit mapping → score; e2e answer → reason appears.
- Acceptance: adding/removing a scenario question never breaks existing scores (recompute test).

**1.G Outcome-trained weights (research mode, staff-reviewed)**
- Spec: after ≥1 term of outcome data (Phase 6), `scripts/fit-weights.ts` fits a regularised logistic model predicting room change / low end-of-term rating from per-factor mismatch. Output: a report of which factors predicted outcomes, with CIs and sample sizes, plus a *suggested* weight set. A `housing_admin` may adopt it as the term default; students' own weights still apply on top. Never auto-adopted; never uses protected attributes.
- Data: `weight_models(id, school_id, trained_on_terms, coefficients jsonb, metrics jsonb, status suggested|adopted|retired, adopted_by)`.
- Edge cases: <200 outcome rows → refuse with "not enough data"; model retired on new term.
- Tests: synthetic data with a known planted effect is recovered; refusal threshold tested.
- Acceptance: the adopted model changes ranking only via documented default weights, and the change is visible in the audit log.

**1.H Deadline-aware nudges**
- Spec: from `terms.deadlines` (roommate-request deadline, room-selection window, agreement due), cron `/api/cron/deadline-nudges` sends in-app + email (and SMS/push if opted in, Phase 7) at T-7, T-2, T-0 to students not yet in a confirmed pair/group or with unsigned agreements. Copy names the deadline and links the next action. Staff see a schedule preview and can pause.
- Data: `nudge_rules(school_id, deadline_key, offsets int[], channels text[], paused)`, `nudge_sends(rule_id, user_id, sent_at)` unique per offset.
- Edge cases: deadline edited → future sends rescheduled; quiet hours in campus TZ (America/Phoenix for ASU); student unsubscribed → skip.
- Tests: fixed-clock unit tests for scheduling; idempotency.
- Acceptance: no student receives a duplicate nudge for the same offset.

**1.I Moderation dashboard → school-scoped (finish the Partial)**
- Spec: keep the Rumi `/admin` for platform_admin; add `/staff/safety` for the school `moderator`/`housing_admin`: same report queue filtered to their school, actions (warn, suspend in this school, restore), escalation button (see 0.3). Activity log shows who did what.
- Edge cases: cross-school reports go to platform_admin only.
- Tests: RLS + e2e action → audit row.
- Acceptance: a school moderator cannot see or act on another school's reports.

### Phase 2 — StarRez interoperability

**2a. CSV first (no StarRez license needed)**
- Export `/staff/integrations/starrez/export`: approved pairings in a StarRez-friendly roommate-group CSV — columns configurable via a mapping UI (default: `EntryID/StudentID, Email, GroupName, GroupLeader, GroupSize, Term`). Student ID requires the student to enter their ASU ID (optional field, encrypted, only shared with consent).
- Import `/staff/integrations/starrez/import`: upload CSV of current assignments (StudentID/Email, Building, Room, Bed, Term) and roommate-group results → stored in `assignments` to power post-move-in features and outcomes. Zod-validated row by row with a preview, error list (downloadable), dry run, idempotent upsert, and undo of the last import.
- Data: `integration_mappings(school_id, provider, direction, mapping jsonb)`, `import_jobs(id, school_id, provider, file_path, status, counts jsonb, errors jsonb, created_by)`, `assignments(id, school_id, term_id, user_id, building, room, bed, source, external_ref)`.
- Storage: private bucket `imports`, staff-only RLS, auto-deleted after 30 days.
- Edge cases: duplicate emails, unknown students (report, don't create), BOM/encodings, 10k rows (stream + batch), mixed terms.

**2b. StarRez REST adapter**
- `src/lib/integrations/starrez/` with an interface `HousingSystemAdapter { pushRoommateGroups, pullAssignments, pullRoomChanges, testConnection }` and implementations `csv` and `starrezRest`. Keep it provider-agnostic so other systems can be added later.
- REST client: base URL + credentials per school stored encrypted (`integration_credentials`, via `lib/crypto.ts`); respect documented throttle (~100 calls / 60 s) with a token bucket and retries with backoff; all calls logged in `integration_runs`.
- The exact StarRez endpoints/tables must be confirmed against the school's StarRez REST documentation (requires the school's REST license) — implement behind a mock server (`msw`) with contract tests, and mark the field mapping as configurable, not hardcoded.
- Cron `/api/cron/starrez-sync` (opt-in per school) for nightly pull of assignments/room changes.
- Acceptance: with the mock, a round trip (push 50 groups → pull assignments) succeeds, is idempotent, and surfaces partial failures in the UI.

**2c. Portal deep link**: a signed link/QR (`/s/[school]`) staff can place on the StarRez roommate page; shows a school-branded landing.

**2d. StarRez questionnaire import**
- Spec: staff upload a StarRez roommate-profile export (CSV) or, with REST, pull it via the adapter; map StarRez question codes → Rumi factor keys in a mapping UI. Imported answers prefill the student's onboarding as "From your ASU Housing profile" and require one confirm tap; nothing is used for scoring until the student confirms.
- Data: `imported_answers(school_id, user_id, source, question_code, raw_value, mapped_factor, mapped_value, confirmed_at)`.
- Edge cases: unmapped codes listed; student's newer Rumi answer wins; student not yet in Rumi → held for 60 days then purged.
- Tests: mapping unit tests; e2e import → student confirms → score.
- Acceptance: a student with imported answers finishes onboarding in under 90 s.

**2e. Housing-system adapter stubs for off-campus partners (Entrata/Yardi) — interface only**
- Add `entrata` and `yardi` entries to the `HousingSystemAdapter` registry that throw `NotConfiguredError` and render "Contact us" in the UI. No API calls (no credentials or verified docs). This keeps the architecture ready without claiming support.

### Phase 3 — ASU SSO

- Add SAML 2.0 SSO via Supabase Auth SSO (requires Supabase plan support) or an OIDC provider, configured per school (`schools.sso_provider`, `sso_domain`). Keep OTP as fallback (toggle per school).
- Flow: "Continue with ASU" → IdP → callback → existing domain trigger still enforced → verification timestamp set from SSO assertion.
- Map optional attributes (affiliation student/staff) to block staff from the student pool.
- Document what ASU IT must provide (metadata URL, entity ID, attributes) in `docs/sso-asu.md`. Do not claim ASU has approved anything.
- Tests: mocked SAML assertion in e2e; unit tests for attribute mapping.

**3.1 Incoming-student pre-arrival mode**
- Spec: admitted-but-not-enrolled students may not have SSO yet. School toggles `pre_arrival_enabled`; these students verify via an emailed admissions code list uploaded by staff (CSV of hashed personal emails + admit term) or the school's admit email domain if one exists. They join a separate pool flag `pre_arrival=true`, matched only with other pre-arrival + incoming students of the same term. On first SSO login the account links (same email or staff-confirmed) and `pre_arrival` clears.
- Data: `admit_allowlist(school_id, email_hash, term_id, used_at)`, `profiles.pre_arrival bool`.
- Edge cases: admit withdraws → staff removes, profile hidden; duplicate accounts on SSO → merge flow keeps matches/chats.
- Tests: hashing, linking/merge unit + e2e.
- Acceptance: no non-allowlisted personal email can sign up.

**3.2 Transfer & grad tracks**
- Spec: `tracks(school_id, key freshman|returning|transfer|grad, label, question_set_id, timeline jsonb)`. Student picks a track at onboarding (staff can lock it via import). Pools are separate by default (school rule can merge). Each track can have its own questions and deadlines.
- Edge cases: track change resets only track-specific answers.
- Tests: engine respects pool separation; e2e grad sees grad questions.

**3.3 Entry points: StarRez portal, ASU app, Canvas/LMS**
- Spec: beyond 2c, provide (a) an embeddable "Find your roommate on Rumi" button snippet and QR assets, (b) a Canvas-compatible external link (a plain URL + icon kit staff can add to a Canvas course/module; LTI is out of scope until ASU requests it), (c) a deep link format `/s/[school]?src=starrez|canvas|asuapp` with source attribution in the funnel.
- Tests: link attribution unit test. Acceptance: funnel shows signups by source.

### Phase 4 — Prefilled roommate agreements

- When a pair/group is confirmed, generate a draft agreement seeded from both profiles: sleep/quiet hours, cleanliness and chores, guests and overnight limits, noise, shared items/food, smoking/drinking/pets, study time, temperature, conflict-resolution preference, plus every watch-out from the engine as a "talk about this" item.
- Template per school (`agreement_templates(school_id, version, sections jsonb)`), staff-editable in `/staff/settings/agreements`.
- Student UX `/groups/[id]/agreement`: section-by-section editor; each member proposes/accepts per section; diff highlighting; comments; all-sign step (typed name + timestamp); PDF download; reopen (by any member or RA) with version history.
- Data: `agreements(id, group_id, template_version, status draft|signed|reopened, signed_at)`, `agreement_sections(agreement_id, key, content jsonb, proposed_by, accepted_by uuid[])`, `agreement_events`.
- Staff/RA: completion dashboard (by building), view signed agreements only with consent.
- Edge cases: member leaves group (agreement → void, new draft), 4-person groups, unresolved section at deadline (reminder).
- Acceptance: two seeded students reach a signed agreement in under 3 minutes on mobile; PDF is accessible (tagged).

**4.1 Conversation starters (finish the Partial)**
- Spec: each watch-out becomes 2–3 ready-to-send openers in chat ("You're early-sleep, I'm a night owl — how do you feel about lights-out at midnight on weeknights?") via a "Talk about this" chip row above the composer; tapping inserts editable text. Starters are template-based (no AI required), per factor and per direction.
- Tests: unit — every factor has starters for each direction; e2e tap → composer filled.
- Acceptance: every watch-out shown on a profile has at least one starter.

**4.2 Quiet-hours & guest calendar (shared room calendar)**
- Spec: per group/room calendar at `/groups/[id]/calendar`: event types guest (with overnight flag), quiet/exam, away, shared event. Agreement guest limits are checked ("this is the 4th overnight this week; your agreement says 2") as a soft warning. Members can subscribe via a private .ics feed URL (rotatable token). Optional free/busy overlay from Phase 7 calendar.
- Data: `room_events(id, group_id, created_by, kind, starts_at, ends_at, overnight, note)`, `room_calendar_tokens(group_id, token_hash, rotated_at)`.
- Permissions: group members only; RA none unless reopened in mediation with consent.
- Edge cases: timezone = school TZ; member leaves → their future events removed; recurring quiet hours (RRULE weekly).
- Tests: unit — guest-limit check, RRULE expansion; e2e add guest → warning.
- Acceptance: works offline-read via PWA cache.

**4.3 Shared chores & expenses**
- Spec: `/groups/[id]/home` tabs Chores and Expenses. Chores: rotation templates seeded from the agreement's chore section, weekly assignment, done check-off, gentle reminder. Expenses: add expense (amount, payer, split equal/custom), running balances, "settle up" marks — Rumi never moves money and shows the payment-safety tip; no payment-app links auto-generated.
- Data: `chores(id, group_id, title, cadence, rotation uuid[])`, `chore_instances(chore_id, assignee, due_on, done_at)`, `expenses(id, group_id, payer_id, amount_cents, currency, note, created_at)`, `expense_splits(expense_id, user_id, share_cents)`, `settlements`.
- Edge cases: integer cents only; rounding remainder to payer; member leaves with balance → shown as outstanding; deleting an expense is soft + logged.
- Tests: unit balances (property tests: sums to zero); e2e add → balance.
- Acceptance: balances always sum to zero across members.

### Phase 5 — Post-move-in check-ins & conflict early warning

- After an assignment exists (from import or self-report "we moved in"), schedule pulse check-ins (week 2, 4, 8, then monthly; configurable). 3 taps: overall (1–5), 1–2 tagged areas (noise, guests, cleanliness, schedule, communication, other), optional private note.
- Risk model v1 (transparent rules, pure function `lib/retention/risk.ts`): drops of ≥2 points, two consecutive ≤2 scores, mismatch between roommates, or tags on factors that were watch-outs → risk level low/medium/high with reasons. No black-box ML in v1.
- High risk → student sees guided self-mediation (prompts based on the agreement section in question, suggested message, "ask my RA for help" button). RA gets an alert only if the student opted in (`checkins` consent + "share with RA" toggle) or chose "ask my RA".
- RA workspace `/staff/ra`: my floors, open alerts, notes, follow-up tasks, link to reopen agreement, outcome (resolved/room change/escalated).
- Safety escalation: any check-in text matching crisis/threat keywords shows 988 / campus police (`NEXT_PUBLIC_LAUNCH_SCHOOL_POLICE_*`) resources immediately and flags a platform_admin; never auto-share content with staff without consent except where legally required (document; mark for legal review).
- Room-swap suggestions (later in phase): for students who request a change, suggest mutually better swaps from compatible students who also opted in.
- Data: `checkin_schedules`, `checkins(id, user_id, assignment_id, term_id, score, tags text[], note_enc, created_at)`, `risk_events`, `ra_tasks`, `room_change_requests`.
- Acceptance: on seeded demo data, an RA dashboard shows the correct risk list with reasons; reduced-motion and screen reader flows pass.

**5.1 Smart room-swap marketplace (expanded)**
- Spec: students with an open `room_change_request` can opt into the swap pool. `lib/matching/swaps.ts` finds 2-way and 3-way cycles where every participant's new mutual score with new roommates exceeds the current one by ≥10 and respects hard filters, school rules, accommodations and assignment eligibility (same building type/gender rules imported from StarRez). Proposals go to staff first (`housing_staff` approve), then to students to accept; final move is executed in StarRez by staff (Rumi exports the approved swap CSV/REST).
- Data: `swap_pool(user_id, assignment_id, opted_in_at)`, `swap_proposals(id, cycle uuid[], scores jsonb, status)`.
- Edge cases: someone accepts then withdraws → whole cycle cancelled and notified; assignment changed externally → proposal invalidated on next sync.
- Tests: cycle finder unit tests vs brute force; e2e opt-in → staff approve → accept.
- Acceptance: no proposal ever lowers a participant's score.

### Phase 6 — Outcomes & A/B pilot reporting

- Pilot design support: cohort assignment (`pilot_cohorts(school_id, term_id, name, arm rumi|control, rule)`), e.g., a residential college using Rumi vs. a comparable one using StarRez only.
- Metrics (only from consented or imported data): room-change rate, time to first change, check-in averages, agreement completion, "would you room together again?" end-of-term survey, retention into next-year housing (from import).
- Report `/staff/outcomes`: arm comparison with counts, rates, 95% confidence intervals (Wilson for proportions), and an explicit "not statistically significant" label when applicable; methodology section; CSV export of de-identified rows.
- Next-year re-match: returning students can carry a pair/group forward.
- Acceptance: unit tests for every statistic with known fixtures; report renders with n<5 suppression.

**6.1 End-of-year "room again?" survey (expanded)**
- Spec: cron sends a 4-question survey 3 weeks before term end: room again? (yes/maybe/no), overall 1–5, biggest win, biggest friction (tags). Answers private to staff in aggregate unless `research_outcomes` consent; "yes" from all members pre-seeds 6.2.
- Data: `outcome_surveys(id, user_id, group_id, term_id, room_again, score, tags, created_at)` unique per user-term.
- Tests: scheduling with fixed clock; suppression.

**6.2 Next-year re-match (expanded)**
- Spec: returning-student term opens with "Keep your group?" for groups where all members said yes/maybe; one tap each to carry the group forward as a confirmed pairing in the new term (re-checks dealbreakers and new school rules). Others re-enter matching with prior answers prefilled.
- Edge cases: one member graduating/leaving → group shrinks, others asked to fill.
- Tests: e2e carry-forward; unit eligibility.

**6.3 Exportable term report — includes outcomes**
- The Phase 1 PDF/CSV adds outcome and A/B sections when available, each with methodology and the synthetic-data label on demo data.

### Phase 7 — Integrations

1. **Spotify (finish & verify)**: confirm OAuth (server-side authorization-code flow with client secret + state cookie; PKCE not needed), top artists + genres, shared artists on profile, score nudge, disconnect deletes data; add the weekly refresh cron (`/api/cron/spotify-refresh`) that Kanha's prompt required; handle revoked tokens, Development Mode allowlist errors (friendly message), and rate limits (429 + Retry-After). README section on extended quota.
2. **Mutuals / web of connections** (Kanha's rule): opt-in. Sources: (a) in-app — shared groups, accepted intros, saved-by-friends; (b) optional contacts-style "people I know at ASU" by mutually confirmed connections (both must confirm); (c) Instagram/LinkedIn as **handles displayed as links only, no API scraping** — optional "verified link" by placing a one-time code in bio/headline and the user confirming (manual check, no API). Show "N mutual connections" with avatars only of people who also opted in; never reveal non-consenting connections. Small, capped trust signal — do not let it override dealbreakers.
3. **Calendar (Google / Outlook)**: optional OAuth (read-only free/busy, `calendar.freebusy` / Microsoft Graph `Calendars.ReadBasic`), used to (a) suggest a time for roommates to meet/video call, (b) add move-in/agreement deadlines to the calendar via .ics download (no OAuth needed). Tokens encrypted; disconnect deletes.
4. **Class schedule (optional)**: manual entry or .ics import of class times (Canvas calendar feed URL) to compute schedule overlap (early classes vs. night owl) as an optional, low-weight factor shown in reasons; no Canvas API scraping or credentials.
5. **Email / SMS notifications**: keep Resend; add per-type preferences matrix (in-app / email / SMS / push); SMS via Twilio behind `SMS_ENABLED` with explicit `sms` consent, STOP/HELP handling, quiet hours in campus TZ; finish web push (VAPID) for the PWA with permission prompt only after a meaningful action.
6. **LinkedIn/Instagram optional verification** as in (2); clearly labeled as self-attested.
- Each integration: settings card in Settings → Connected accounts with connect/disconnect, last sync, error state.

7. **"Why we're a match" share card**: `/api/og/match/[id]` renders an image card (first names, initials avatars, score, top 3 reasons — never last name, email, building or watch-outs) via `next/og`; share sheet uses Web Share API with copy-link fallback. The link `/m/[token]` is a signed, expiring (14 days), revocable token showing the same card; requires both students' consent toggled on the card before it's shareable. Tests: unit token sign/verify/expiry; e2e share flow; ensure no PII in OG image (snapshot test). Acceptance: revoking makes the link 404 within one request.
8. **Video/voice intro**: optional ≤30 s clip recorded in-browser (MediaRecorder) or uploaded; stored in private Supabase bucket `intros-media`, served by signed URLs to verified students who can view the profile; auto-captions not required but a transcript text field is required for accessibility; moderation: reportable, auto-hidden after 2 reports pending review; max 20 MB; mp4/webm only; server-side duration check. Data: `profile_media(user_id, kind video|audio, path, duration_s, transcript, status)`. Tests: upload validation, RLS on bucket, e2e record (mocked media). Acceptance: profile remains complete without media.
9. **Parent view (read-only, opt-in)**: student generates a revocable link for a family member showing their own match summary (roommate first name, score, top reasons, agreement status) — never chat, never the roommate's photos unless the roommate also consents. Expires at term start. Data: `family_shares(id, user_id, token_hash, scope jsonb, expires_at, revoked_at)`. Tests: scope enforcement, expiry. Acceptance: roommate without consent appears as "Your student's roommate" only.

### Phase 8 — Accessibility, performance & polish pass
- Full axe + manual screen-reader pass (VoiceOver iOS, NVDA) on student and staff flows; keyboard traps none; focus management on sheets and route transitions.
- Lighthouse 95+ on landing, matches, profile, staff overview (mobile).
- Multilingual readiness: extract strings to a dictionary, ship English + Spanish for student flows.
- "Would this be featured on Mobbin?" review of every new screen; redesign if not.

- **Multilingual (expanded)**: `next-intl` (or equivalent) with locale routing off by default; English + Spanish complete for student flows, staff in English; Mandarin and Hindi structure-ready with translation files flagged "needs professional translation" (do not machine-translate and ship). Language picker in Settings; emails use the user's locale. Tests: missing-key check in CI; e2e Spanish onboarding.

### Phase 9 — Pricing & deployment readiness (no payments needed for pilot)
- `schools.plan` (`pilot`, `standard`) and `schools.branding` (logo, accent override within token rules) for white-label "Rumi for <School>".
- Self-serve school onboarding checklist in `/staff/setup` (domains, areas, term, questions, SSO, integrations, team).
- Students always free; no student paywall.
- **Free pilot for one residential college**: `pilot_configs(school_id, scope jsonb {residential_colleges[]}, starts_on, ends_on, success_metrics jsonb)`; scope limits the student pool and dashboards; pilot end date shows a countdown on `/staff` and the term report includes a pilot summary. No billing code.
- **Per-bed SaaS tier (display only)**: `schools.plan` + `schools.licensed_beds`; `/staff/settings/plan` shows plan, bed count and usage (active students vs licensed beds). Pricing numbers are configured by Rumi, not hardcoded; no payment integration in this build.
- **White-label**: logo, school name and an optional secondary accent applied only inside staff and school landing pages; the Rumi wordmark, Inter + Instrument Serif fonts and the Ember accent remain the default and are never removed from the student app chrome.

---

## 4. Data model additions (summary)

New tables (all RLS-enabled, all school-scoped, migrations under `supabase/migrations/2026110xxxxxxx_*.sql`):
`staff_members`, `staff_invites`, `consents`, `retention_policies`, `audit_log`, `terms`, `school_questions`, `school_question_answers`, `school_rules`, `pairings`, `campaigns`, `campaign_sends`, `integration_mappings`, `integration_credentials`, `integration_runs`, `import_jobs`, `assignments`, `agreement_templates`, `agreements`, `agreement_sections`, `agreement_events`, `checkin_schedules`, `checkins`, `risk_events`, `ra_tasks`, `room_change_requests`, `pilot_cohorts`, `outcome_surveys`, `connections` (mutuals), `social_links`, `calendar_accounts`, `class_schedules`, `notification_preferences`, `push_subscriptions`, `sms_messages`, `escalation_routes`, `escalations`, `segment_metrics`, `room_change_reasons`, `auto_pair_runs`, `auto_pair_proposals`, `preference_flags`, `accommodation_constraints`, `weight_models`, `nudge_rules`, `nudge_sends`, `imported_answers`, `admit_allowlist`, `tracks`, `room_events`, `room_calendar_tokens`, `chores`, `chore_instances`, `expenses`, `expense_splits`, `settlements`, `swap_pool`, `swap_proposals`, `profile_media`, `family_shares`, `pilot_configs`.
Column additions: `profiles.student_id_enc` (optional), `profiles.is_staff`, `profiles.is_demo`, `schools.sso_provider`, `schools.sso_domain`, `schools.plan`, `schools.branding`, `schools.licensed_beds`, `schools.pre_arrival_enabled`, `profiles.pre_arrival`, `profiles.track`, `room_change_requests.reason_keys`, `room_change_requests.match_score_at_assignment`, `school_questions.type scenario` + `factor_map`, `moderation_log.classifier/confidence`.
Views: `staff_term_metrics` (materialized), `staff_unmatched_consented`.
For each table write: columns, indexes, RLS policies per role, grants, and a pgTAP/Vitest RLS test.

---

## 5. Tests

- Unit (Vitest): every pure module — staff aggregations with suppression, school_rules filters inside the engine, CSV mapping/validation, StarRez adapter (msw), retention purge selection, risk model, statistics, agreement prefill, mutuals visibility.
- RLS tests: one file per new table proving allowed/denied access per role and for students.
- E2E (Playwright + axe): staff invite → dashboard; term setup; pairing approval → CSV export; CSV import with errors; SSO mock sign-in; agreement create → sign → PDF; check-in → risk → RA alert (with consent) and no alert (without); outcomes report; Spotify connect (mocked); calendar connect (mocked); notification preferences; consent revoke removes staff visibility. Run at 375px and 1440px.
- Added-feature tests: auto-pair optimality + determinism, consistency rules, accommodation RLS, scenario mapping, weight fitting on planted data, nudge idempotency, questionnaire import mapping, pre-arrival allowlist, track pools, starters coverage, room calendar guest-limit, expense balances sum to zero (property tests), swap cycles never lower a score, share-card token expiry + no-PII snapshot, media upload validation, family-share scope, i18n missing keys, AI moderation fallback.
- **Regression guard for Rumi's 8 verified advantages over StarRez** (must never break): student-set weights, two-way mutual score, hard dealbreakers, per-match reasons + watch-outs, off-campus factors (budget/area/move-in/lease), intro-gated realtime chat, group combined fit, automatic scam flags. Keep/extend the existing engine and moderation unit tests and add one e2e asserting each is visible.
- CI gate: lint, typecheck, unit, e2e, build — all green before merging to `main`.

---

## 6. Seed / demo data (clearly labeled)

- Extend `npm run seed` with `--demo-school` producing a fictional "Demo University" (domain `demo.rumimatch.app`, not ASU) plus an ASU-styled demo term only when `SEED_ALLOW_REMOTE` is set (there is no hosted staging project; the local stack is the default target).
- Every demo row: `is_seed = true` / `is_demo = true`; UI shows a persistent "Demo data" badge on staff screens and a banner on student screens; a school hides seed data when its `hide_seed_profiles` switch is on.
- Demo content: 200 students, 60 pairs, 15 groups, 2 cohorts (Rumi vs control), 3 buildings, 8 weeks of check-ins with a few realistic risk cases, signed and unsigned agreements, one CSV import with deliberate errors, staff accounts for each role (`housing_admin@demo…`, `ra@demo…`).
- Never present demo numbers as real outcomes; demo outcomes report says "Synthetic data for demonstration".

---

## 7. Demo script for the ASU Housing pitch (about 10 minutes)

1. (Student, phone) Sign in with a demo school email → 4-minute onboarding highlights: importance weights, dealbreakers, optional Spotify.
2. Matches: ranked list, open a match → score ring, "why you match", watch-outs, mutual connections.
3. Send intro → accepted → chat opens; type a "Venmo me the deposit" message → payment safety tip appears.
4. Form a 3-person group → pairwise fit → prefilled roommate agreement → sign → PDF.
5. (Staff, laptop) `/staff` overview with "Demo data" badge: funnel, score distribution, unmatched students → send nudge.
6. Auto-pair the unmatched → review proposals (no dealbreaker violations). Then pairings review → approve → export StarRez CSV (show mapping). Explain the REST adapter path once ASU's StarRez REST license/credentials are available.
7. Post-move-in: RA view shows a flagged room with reasons from check-ins → open mediation → reopen agreement.
8. Outcomes: Rumi vs control cohort report with confidence intervals and methodology (synthetic).
9. Privacy center: consent toggles, retention settings, audit log.
Close: free for students, works alongside StarRez (no replacement), pilot with one residential college.

---

## 8. Definition of done (every phase)
- Schema + page map proposed in `docs/phase-N.md` before code.
- No `any`, no TODOs, no placeholder buttons; every button works.
- Loading/empty/error/offline states; 375px + 1440px verified; axe clean; reduced motion respected.
- README, `.env.example`, and `docs/` updated; new env vars documented.
- lint + typecheck + unit + e2e + build green → merged to `main` → Vercel deploy checked.
- End-of-phase summary: what was built, manual setup left (e.g., ASU SSO metadata, StarRez REST credentials, Twilio, Google/Microsoft OAuth apps, Spotify quota).

---

## 9. Coverage checklist (69 roadmap features → where built)

Status key: Has = already in main, keep and don't rebuild; Build = specified in this prompt; Excluded = not a code task (reason given).

| # | Feature | Roadmap status | Covered in |
|---|---|---|---|
| 1 | Student-set importance weights | Has | §1, §5 regression guard |
| 2 | Mutual (two-way) score | Has | §1, §5 regression guard |
| 3 | Hard dealbreakers | Has | §1, §5 regression guard |
| 4 | Explained scores | Has | §1, §5 regression guard |
| 5 | Conversation starters from watch-outs | Partial | Phase 4 (watch-out items) + 4.1 |
| 6 | Group combined fit | Has | §1, §5 regression guard |
| 7 | Shared-interest signal (Spotify) | Has | §1, Phase 7.1 (weekly cron finish) |
| 8 | Live re-ranking | Has | §1 |
| 9 | Housing-office-configurable question bank | Not built | Phase 1 term configuration |
| 10 | Fair-Housing-safe question library | Not built | Phase 1 (denylist + reviewer sign-off) |
| 11 | Outcome-trained weights | Not built | 1.G |
| 12 | Answer-consistency checks | Not built | 1.D |
| 13 | Behavioral micro-questions | Not built | 1.F |
| 14 | LLC / major / residential-college constraints | Not built | Phase 1 constraints (`school_rules`) |
| 15 | Auto-pair the unmatched | Not built | 1.C |
| 16 | Accessibility & accommodation-aware matching | Not built | 1.E |
| 17 | Ranked list, no swiping | Has | §0.1, §1 |
| 18 | Intro-gated realtime chat | Has | §1, §5 regression guard |
| 19 | Group invites & join requests | Has | §1 |
| 20 | Strong-match alerts & daily digest | Has | §1 |
| 21 | Installable mobile PWA | Has | §1, Phase 7.5 (push) |
| 22 | Deadline-aware nudges | Not built | 1.H |
| 23 | "Why we're a match" share card | Not built | Phase 7.7 |
| 24 | Video/voice intro | Not built | Phase 7.8 |
| 25 | Incoming-student pre-arrival mode | Not built | 3.1 |
| 26 | Multilingual UI | Not built | Phase 8 + Phase 8 multilingual (expanded) |
| 27 | Transfer & grad tracks | Not built | 3.2 |
| 28 | Parent view (read-only, opt-in) | Not built | Phase 7.9 |
| 29 | Digital roommate agreement seeded from profiles | Not built | Phase 4 |
| 30 | Pulse check-ins | Not built | Phase 5 |
| 31 | Conflict risk alerts to RAs | Not built | Phase 5 risk model + RA alerts |
| 32 | Guided self-mediation | Not built | Phase 5 |
| 33 | RA mediation workspace | Not built | Phase 5 `/staff/ra` |
| 34 | Smart room-swap marketplace | Not built | Phase 5 + 5.1 |
| 35 | Shared chores & expenses | Not built | 4.3 |
| 36 | Quiet-hours & guest calendar | Not built | 4.2 |
| 37 | End-of-year "room again?" survey | Not built | Phase 6 + 6.1 |
| 38 | Next-year re-match | Not built | Phase 6 + 6.2 |
| 39 | Moderation dashboard | Partial | §1 (exists) + 1.I school-scoped |
| 40 | Housing-office dashboard | Not built | Phase 1 |
| 41 | Compatibility outcomes report | Not built | Phase 6 |
| 42 | Cohort/segment analytics | Not built | Phase 1 score distribution + 1.A |
| 43 | Room-change reason analytics | Not built | 1.B |
| 44 | Bulk pairing review & override | Not built | Phase 1 `/staff/pairings` |
| 45 | Campaign messaging to unmatched | Not built | Phase 1 unmatched → nudge campaign |
| 46 | Exportable term report (PDF/CSV) | Not built | Phase 1 reports export + 6.3 |
| 47 | Pilot A/B framework | Not built | Phase 6 |
| 48 | Verified school email (yearly re-verify) | Has | §1 |
| 49 | Scam & abuse detection | Has | §1, §5 regression guard, 0.5 upgrade |
| 50 | Report / block everywhere | Has | §1 |
| 51 | Privacy defaults & hide profile | Has | §0.1, §1 |
| 52 | Data export & deletion | Has | §1, 0.2 staff data-subject tools |
| 53 | Row-level security on all tables | Has | §0.2, §4 |
| 54 | Escalation to housing/Title IX/CARE | Not built | Phase 5 crisis resources + 0.3 |
| 55 | FERPA/SOC 2 documentation & DPA | Not built | 0.2 docs + 0.4 (readiness only, no certification) |
| 56 | AI moderation upgrade | Not built | 0.5 |
| 57 | Configurable multi-school setup | Has | §1 |
| 58 | StarRez roommate-group sync | Not built | 2a CSV + 2b REST adapter |
| 59 | StarRez questionnaire import | Not built | 2d |
| 60 | ASU SSO (SAML/Shibboleth) | Not built | Phase 3 |
| 61 | StarRez Partner Network listing | Not built | **Excluded from code** — business application to StarRez; prompt keeps the adapter docs/tests a partner review would need |
| 62 | Embed/deep link from StarRez portal | Not built | 2c + 3.3 |
| 63 | Entrata/Yardi for off-campus partners | Not built | 2e interface stubs only (no verified APIs/credentials; outside ASU pilot) |
| 64 | Canvas/LMS or ASU app entry point | Not built | 3.3 (links + attribution; LTI out of scope) |
| 65 | Free for students, no ads | Has | §0.1, Phase 9 |
| 66 | Free pilot for one residential college | Not built | Phase 9 pilot configs |
| 67 | Per-bed SaaS tier | Not built | Phase 9 plan display (no billing) |
| 68 | White-label campus branding | Not built | Phase 9 (fonts/Ember kept) |
| 69 | Self-serve office onboarding | Not built | Phase 9 `/staff/setup` |

**8 verified StarRez gaps (Rumi advantages)** — all already built; protected by the §5 regression guard and shown in §7 demo steps 1–4: student-set weights (#1), two-way score (#2), dealbreakers (#3), reasons/watch-outs (#4), off-campus factors (§1 matching: budget/area/move-in/housing type), intro-gated realtime chat (#18), group combined fit (#6), automatic scam flags (#49).
