# Phase 1 — Staff dashboard, pairing review, term setup, auto-pair

Written before the code (master prompt §3, Phase 1 core + 1.C). It builds on Phase 0's roles, consent and audit log.

## Decisions

- **Population.** Metrics count every current student at the school: not staff, not suspended. Seed profiles are excluded unless the school is a demo school. That way ASU's numbers never include the 50 demo profiles.
- **A confirmed pair or group** is a Rumi group with at least two members. Housing-suggested pairs become a two-person group when both students accept, so everything downstream (pair review, roommate agreements, the StarRez export) has one shape.
- **Live metrics, not a materialized view.** A single security-definer SQL function (`staff_overview`) computes the overview, funnel, trends and score distribution on demand. At pilot scale (a few thousand students) it takes milliseconds, and the funnel stays current.
- **Terms carry dates; they don't filter people.** Rumi students don't belong to a term, so the overview is school-wide. The active term appears in the header with its next deadline. Trend charts take a range (8, 16 or 52 weeks).
- **Small-number suppression.** Every displayed count from 1 to 4 shows as "<5". A percentage over fewer than 5 students shows "—". It's one pure function (`lib/staff/metrics.ts`), unit-tested.
- **Consent gates student-level data.**
  - The unmatched list and the auto-pair pool include only students who chose to share.
  - Pair review shows groups with at least one sharing member. A non-sharing member appears as "Student (not shared)", with no name or scores.
  - Each page view of student-level data is written to the audit log.
- **Review state is stored; group state is read live.** `pairings` stores staff decisions (status, notes, approver, member snapshot). If an approved group's members change, the review shows "Needs review — members changed" without a background job.
- **Auto-pair proposes; it never places.**
  - **Algorithm:** maximum-cardinality, maximum-weight matching (Edmonds' blossom, `lib/matching/blossom.ts`). It pairs as many students as possible, then maximizes the total mutual score.
  - **Candidate pairs:** only pairs that already pass every hard filter (existing `match_scores` rows), at or above a minimum score the staff member chooses. Each student keeps at most their 40 best options, so 2,000 students solve in seconds.
  - **Ties** go to earlier sign-ups, and the result is deterministic.
  - **Staff** approve or reject each pair, or in bulk, then send.
  - **Students** each get a "Housing suggested a roommate" notification and can accept or decline. When both accept, Rumi creates a two-person group with a group chat. Nobody is ever placed without saying yes.
  - **This pass** proposes pairs only. Auto-grouping into 3–4 people (greedy plus local swaps) is listed as later work.

## Schema

```
terms                 id · school_id · name · starts_on · ends_on · deadlines jsonb
                      {roommate_request, selection_opens, selection_closes} · active (one per school)
pairings              id · school_id · group_id (unique) · member_ids uuid[] (snapshot) ·
                      status unreviewed|approved|needs_review · staff_notes · approved_by · approved_at · updated_at
campaigns             id · school_id · kind 'nudge' · audience_count · created_by · created_at
campaign_sends        campaign_id · user_id · sent_at   (a student gets at most one nudge per 7 days)
auto_pair_runs        id · school_id · params jsonb · stats jsonb · created_by · created_at · superseded_at
auto_pair_proposals   id · run_id · school_id · member_ids uuid[2] · score · reasons jsonb ·
                      status proposed|approved|rejected|sent|accepted|declined|superseded|invalid ·
                      responses jsonb {user_id: true|false} · decided_by · decided_at · sent_at
notifications.type    + 'housing_suggestion'
```

SQL functions (security definer; each checks `has_role` itself):

- `staff_overview(school, weeks)`: KPIs, funnel, weekly trends and score distribution, as JSON.
- `staff_unmatched(school)`: sharing, onboarded students without a confirmed group, with their best score and strong-match count.
- `staff_pairings(school)`: groups of two or more with members (consent-aware), pairwise scores, dealbreaker flags and review state.
- `respond_housing_suggestion(id, accept)`: the student's answer. The second "yes" creates the group and chat.

RLS:
- `terms` is readable by any staff member of the school.
- `pairings`, `campaigns` and auto-pair tables are readable by housing admins and housing staff.
- Students can read a proposal only once it has been sent to them.
- All writes go through server actions or the RPC.

## Pages

- `/staff` (overview):
  - KPI tiles: students, verified, onboarded, with a strong match, in a pair or group, intros, median days to match, unmatched, open reports.
  - Funnel, weekly trends (single series, table fallback), score distribution with a by-segment table.
  - The setup checklist adds "Set up your first term".
- `/staff/students`: unmatched students who chose to share. Select some or all, then "Send a nudge" (email and in-app, rate-limited, logged).
- `/staff/pairings`: groups with status filters and a detail sheet (pairwise matrix, flags, notes). Bulk select: approve or mark for review.
- `/staff/pairings/auto`: run settings (minimum score), results with stats, per-pair approve or reject, bulk approve, send.
- `/staff/settings/term`: term name, dates and key deadlines.
- `/suggestions/[id]` (student): the suggested roommate's score and reasons, a link to the full profile, Accept or Decline.

## Tests

- Unit tests:
  - Suppression and percentage helpers.
  - `assign.ts`: optimal against brute force on ≤10 students, never pairs across a hard filter, deterministic, honors the minimum score, lists unpaired students with a reason.
  - Blossom: brute force on 600 random graphs, plus a performance test at 2,000 vertices.
- RLS: analysts can't call the student-level functions; students can't read runs, pairings or other students' proposals; a sent proposal is readable by its two students only.
- E2E with axe:
  - The overview renders KPIs and charts.
  - Approve a pairing; it shows as approved.
  - Run auto-pair, approve, send; both students accept and land in a new group.
  - Term setup saves.
