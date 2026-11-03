# Housing pilot build — progress

The plan is [`MASTER-PROMPT.md`](MASTER-PROMPT.md) (its first-pass build order is at the top). Each phase's design is in `phase-N.md`. This log is updated after every phase so work survives context resets.

## First pass (the §7 demo path)

| Step | Status | Notes |
| --- | --- | --- |
| Setup | Done | Local Supabase stack for development and tests; master prompt saved with corrections; demo-profile switch (`schools.hide_seed_profiles`, Admin → People). |
| Phase 0 — staff roles, consent, audit, retention | Done | `docs/phase-0.md`. Staff workspace at `/staff`, invites, roles with building scopes for RAs, last-admin rule, consent (onboarding step + Settings → Privacy), append-only audit log, per-school retention with a nightly job. RLS tests per role; e2e with axe. |
| Phase 1 core + 1.C — dashboard, pairings, term setup, auto-pair | Next | |
| Phase 2a — StarRez CSV export | Pending | |
| Phase 4 + 4.1 — roommate agreements, conversation starters | Pending | |
| Phase 5 core — check-ins, risk, RA workspace | Pending | |
| Phase 6 core — outcomes report | Pending | |
| Phase 7.2 — mutual connections | Pending | |
| Demo University seed | Pending | |

## How each phase ships

1. `docs/phase-N.md` first.
2. Build against the local stack; unit, RLS and e2e (with axe) tests; review at 375px and 1440px.
3. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` all green.
4. Apply the phase's migration to the live Supabase project (additive only), then merge to `main` (Vercel deploys it).

## Decisions worth remembering

- Platform admins are the existing `admins` table; school roles live in `staff_members`.
- Staff are `profiles.is_staff`: never matched, never visible to students, can't browse students through student tables.
- Students are never shown a housing-office consent prompt until the Rumi team sets `schools.housing_office_name` (no implied ASU partnership before a signed pilot).
- New nightly work registers in `src/lib/jobs/nightly.ts`, not `vercel.json`, to stay within the plan's cron limits.
- The audit log is append-only even for the service role; only `purge_audit_log()` (retention) deletes.
