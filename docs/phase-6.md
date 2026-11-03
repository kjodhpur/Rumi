# Phase 6 core — Outcomes report

Written before the code. Cohort assignment, the end-of-term survey and next-year re-match stay later. This slice is the numbers a housing office can already see, with the statistics rules in place.

## Decisions

- **Aggregates only, and only from people who consented.** Confirmed groups (2+ members, at least one sharing with housing) and how many of those have a signed agreement. Check-in count and average score only from students with `checkins` consent. No names, notes or agreement text.
- **Wilson 95% intervals** for the agreement-completion rate (`src/lib/stats/wilson.ts`). A second arm can be compared later; two intervals that do not overlap count as a difference, and anything else is labeled not statistically significant. Overlap is a conservative stand-in for a formal test.
- **Counts from 1 to 4 show as "<5".** Zero stays zero. A rate is hidden when its denominator is under 5.
- **Who can open it.** Housing admins, housing staff and analysts (`viewDashboard`). RAs stay on the check-in list.

## Schema

No new tables. `staff_outcomes(school)` returns four integers.

## Tests

- Wilson fixtures: 50/100 and 10/20, to three decimals.
- Suppression and the overlap rule.
