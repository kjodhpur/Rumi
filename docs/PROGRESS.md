# Housing pilot build — progress

The plan is [`MASTER-PROMPT.md`](MASTER-PROMPT.md) (its first-pass build order is at the top). Each phase's design is in `phase-N.md`. This log is updated after every phase so work survives context resets.

## First pass (the §7 demo path)

| Step | Status | Notes |
| --- | --- | --- |
| Setup | Done | Local Supabase stack for development and tests; master prompt saved with corrections; demo-profile switch (`schools.hide_seed_profiles`, Admin → People). |
| Phase 0 — staff roles, consent, audit, retention | Done | `docs/phase-0.md`. Staff workspace at `/staff`, invites, roles with building scopes for RAs, last-admin rule, consent (onboarding step + Settings → Privacy), append-only audit log, per-school retention with a nightly job. RLS tests per role; e2e with axe. |
| Phase 1 core + 1.C — dashboard, pairings, term setup, auto-pair | Done | `docs/phase-1.md`. Live overview (KPIs, funnel, trends, score distribution with "<5" suppression), unmatched students with nudges, pairing review, term setup, auto-pair (blossom matching, tested against brute force and at 2,000 students) with student accept/decline. RLS tests; e2e with axe. Auto-grouping into 3–4 is later work. |
| Phase 2a — StarRez CSV export | Done | `docs/phase-2a.md`. Approved, fully-sharing groups to CSV with configurable columns, optional encrypted student ID, formula-safe CSV, audited downloads. Import comes later. |
| Phase 4 + 4.1 — roommate agreements, conversation starters | Done | `docs/phase-4.md`. Prefilled agreement per group, section-by-section edit/accept with history, typed-name signing, print-to-PDF page, reopen/void; staff see status only. Template-based conversation starters in one-to-one chats. Staff-editable templates, room calendar and chores/expenses are later work. |
| Phase 5 core — check-ins, risk, RA workspace | Done | `docs/phase-5.md`. Self-reported move-in, pulses at week 2/4/8, rule-based risk, RA list only when the student shared or asked for help. Monthly pulses, StarRez assignment import and room swaps are later. |
| Phase 6 core — outcomes report | Done | `docs/phase-6.md`. Agreement completion and check-in average for consented students, Wilson 95% intervals, "<5" suppression. Cohort comparison, the end-of-term survey and next-year re-match are later. |
| Phase 7.2 — mutual connections | Next | |
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
- Staff metrics count seed profiles only at demo schools (`school_students()`), so a real school's numbers never include demo data.
- A "confirmed pair" is a Rumi group with 2+ members; housing suggestions become a two-person group when both students accept.
