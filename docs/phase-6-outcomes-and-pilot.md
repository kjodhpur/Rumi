# Phase 6 & Phase 9 — Outcomes Report, A/B Pilot Framework & Campus Plan Management

Implements master prompt §3 Phase 6 (Outcomes & A/B pilot reporting) and Phase 9 (Pricing, pilot config, and campus self-serve onboarding).

## Architecture

1. **A/B Pilot Cohorts (`pilot_cohorts`)**:
   - Supports comparing two student cohorts (e.g. `rumi` vs `control` residential colleges).
   - Tracks metrics across arms: room-change rate, agreement completion %, check-in average satisfaction, and retention.
   - Computes Wilson 95% score confidence intervals for all proportions.
   - Suppresses counts and rates when $n < 5$ to protect privacy.
   - Explicitly displays `"Not statistically significant"` whenever confidence intervals overlap or sample size is insufficient.

2. **Room-Change Rate by Score Band**:
   - Groups pairings into 4 score tiers: `< 50`, `50–69`, `70–84`, `85+`.
   - Answers housing office questions: "Do low-score pairs move more?"

3. **De-identified CSV Export (`/api/staff/outcomes/export`)**:
   - De-identified research export containing cohort arm, score band, agreement signed (Y/N), check-in satisfaction average, and room change status. Zero PII.

4. **Self-Serve Campus Setup (`/staff/setup`) & Plan Dashboard (`/staff/settings/plan`)**:
   - 7-step campus onboarding checklist for new universities.
   - Bed-license usage meter (licensed beds vs active student profiles) without student paywalls.
