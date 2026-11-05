# Phase 9 — White-label branding, plan and pilot display

Master prompt §3 Phase 9. Students are always free; there's no billing code.

## Plan, beds and pilot (display only)

- `schools.plan` (`pilot`, `standard`) and `schools.licensed_beds` are set by the Rumi team.
  `/staff/settings/plan` shows the plan, the bed count and usage (onboarded students against
  licensed beds). No prices are hardcoded.
- `pilot_configs` scopes a free pilot to residential colleges with start and end dates and
  success metrics; the end date shows as a countdown on `/staff`, and the term report includes
  a pilot summary. `pilot_cohorts` defines the Rumi and control arms for the outcomes report.
- `/staff/setup` is the self-serve onboarding checklist: email domains, neighborhoods, term and
  deadlines, questions, single sign-on, StarRez, team, escalation routes and entry links.

## White-label ("Rumi for <School>")

Housing admins set it at `/staff/settings/branding`:

| Setting | Stored in `schools.branding` | Notes |
| --- | --- | --- |
| Display name | `display_name` | Shown as "Rumi for <name>"; empty falls back to the short name. Up to 60 characters. |
| Logo | `logo_path` | PNG, JPEG or WebP up to 512 KB, checked by its bytes (SVG isn't accepted). Stored in the public `school-branding` bucket, which only the service role writes to (migration `20261103000028`). Replacing or removing a logo deletes the old file. |
| Secondary accent | `secondary_accent` | Decorative only: a 3px band and a swatch. It must stay visible on Rumi's page background in light and dark mode (contrast of at least 1.3:1 against both). |

Where it appears: the staff shell (logo and "Rumi for <name>" under the wordmark, the band
across the top) and the school landing page `/s/<school>` (the same, in its header).

What never changes: Rumi's wordmark, Inter and Instrument Serif, and the Ember accent stay in
place everywhere, and the student app's chrome is untouched. The secondary accent is never used
for text, buttons, links or focus.

Every change (`branding_saved`, `branding_logo_uploaded`, `branding_logo_removed`) is audited.
`parseBranding` ignores anything malformed in the stored JSON, so a bad value can't break a page.

Tests: `src/lib/staff/branding.test.ts` (parsing, contrast, byte sniffing) and
`e2e/branding.spec.ts` (upload, a refused pale accent, staff chrome, the landing page with Ember
intact, the audit trail, axe).

## Demo data labels (seed spec §6)

Staff screens at a demo school carry a "Demo data" banner. Students with a demo account
(`profiles.is_demo`) or at a demo school (`schools.is_demo`) see a persistent note on every
screen, in their language (`e2e/demo-banner.spec.ts`). The outcomes report at a demo school says
"Synthetic data for demonstration".
