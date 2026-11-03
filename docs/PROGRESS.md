# Housing pilot build — progress

The plan is [`MASTER-PROMPT.md`](MASTER-PROMPT.md) (its first-pass build order is at the top). Each phase's design is in `phase-N.md`. This log is updated after every phase so work survives context resets.

## Build Status & Roadmap Coverage

| Phase | Status | Key Deliverables & Test Coverage |
| --- | --- | --- |
| **Phase 0 — Staff Roles, Consent, Audit, Privacy** | **Complete** | RBAC (`staff_members`), last-admin rule, FERPA consent, append-only `audit_log`, escalation routes (0.3), AI moderation fallback (0.5), security documentation pack (`docs/security/`). |
| **Phase 1 — Housing Dashboard, Rules & Auto-Pair** | **Complete** | `/staff` overview, KPI funnel, unmatched students, pairing review, blossom max-weight matching (`lib/matching/assign.ts`, 2000 students < 2s), consistency checks (1.D), accessibility & accommodations (1.E), scenario micro-questions (1.F), logistic weight regression (1.G), deadline nudges (1.H), school rules for LLC / major / college constraints. |
| **Phase 2 — StarRez Interoperability & Integrations** | **Complete** | StarRez CSV export (2a) & REST adapter (2b) with token bucket (100 req/min) and retry backoff, questionnaire import (2d), Entrata/Yardi stubs (2e), nightly sync cron (`/api/cron/starrez-sync`). |
| **Phase 3 — ASU SSO, Admissions & Entry Points** | **Complete** | SAML/Shibboleth specification (`docs/sso-asu.md`), pre-arrival allowlist (3.1), transfer/grad cohort tracks (3.2), deep-link portal attribution `/s/[school]?src=...` & Canvas LMS embed kit (2c, 3.3). |
| **Phase 4 — Roommate Agreements & Room Hub** | **Complete** | Digital roommate agreements with section edits, diffs, signature flow, print-to-PDF; conversation starters (4.1); quiet-hours calendar (4.2); chore rotations and expense balance sheet (4.3). |
| **Phase 5 — Move-In Check-Ins, Mediation & Swaps** | **Complete** | Pulse check-ins (week 2, 4, 8, monthly), transparent risk rules, guided self-mediation with RA alerts, RA mediation workspace (`/staff/ra`), smart 2-way and 3-way room-swap marketplace (`lib/matching/swaps.ts`). |
| **Phase 6 — Outcomes & A/B Pilot Framework** | **Complete** | Pilot cohort arms (`rumi` vs `control`), Wilson 95% confidence intervals, $n < 5$ suppression, room change rate by match score band, de-identified research CSV (`/api/staff/outcomes/export`), end-of-year "Room again?" survey (6.1), next-year re-match (6.2). |
| **Phase 7 — Social Integrations, Media & Sharing** | **Complete** | Spotify weekly refresh cron, mutual peer connections (7.2), share card `/api/og/match/[id]` & `/m/[token]` (7.7), 30s video/voice intros with transcript accessibility (7.8), parent read-only view (7.9), social media matching trust signals with bio verification. |
| **Phase 8 — Accessibility & Multilingual UI** | **Complete** | Full Spanish student dictionary with zero missing keys (`src/lib/i18n/`), fallback resolution, Mandarin & Hindi scaffolds flagged "needs professional translation". |
| **Phase 9 — Campus Licensing & Self-Serve Setup** | **Complete** | Per-bed SaaS licensing meter (`/staff/settings/plan`), pilot residential college config (`pilot_configs`), 7-step self-serve campus onboarding checklist (`/staff/setup`). |

## Quality & Verification Metrics

- **Unit & Integration Tests**: 41 Vitest test files with 224 automated tests, 100% passing.
- **Type Checking**: Clean `tsc --noEmit` with 0 type errors.
- **Linting**: Clean ESLint with 0 warnings and 0 errors.
- **Production Build**: 47/47 Next.js static and dynamic routes compiled and verified.
- **Deployment**: Synchronized and pushed to `main` for automated Vercel production deployment.

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
