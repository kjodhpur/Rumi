# Phase 0.3 & 1.I — Escalation Routes & School-Scoped Safety Dashboard

Written before the code, following master prompt §0.3 and §1.I.

## Decisions

- **Clear separation between student support and emergency response.** Rumi never claims to replace emergency services, campus police, CARE/Dean of Students, or Title IX. The UI prominently shows 911, 988, and the school's official reporting resources.
- **Student consent on forwarding.** When filing a serious report, the student is shown the official campus destination and explicitly toggles whether to forward report details to that office (`student_consented: boolean`). If consent is off, the report is reviewed internally by school staff without external forwarding.
- **No ASU route configured fallback.** If a school has not configured a specific destination for a category, the student sees verified national resources (988 Lifeline, 911, National Sexual Assault Hotline) and Rumi staff warning. The UI never implies an office was notified unless an active route exists and was executed.
- **School-scoped moderation (`/staff/safety`).** School moderators and housing admins manage reports where the reported student belongs to their school. Cross-school reports go exclusively to platform admins (`/admin`).
- **Immediate safety protections.** Filing a report always offers an immediate one-tap block so the reported student can never view or message the reporter again.
- **Full audit trail.** Every route update, status change, warning, suspension, restoration, and escalation is recorded to `audit_log` and `moderation_log`.

## Schema

```sql
escalation_routes (
  id uuid PK · school_id references schools(id) · category text ·
  destination_label text · url text · phone text · email text ·
  active boolean default true · created_at · updated_at
)

escalations (
  id uuid PK · school_id references schools(id) · report_id references reports(id) ·
  category text · route_id references escalation_routes(id) ·
  student_consented boolean · status text default 'pending' ·
  forwarded_at timestamptz · forwarded_by references profiles(id) ·
  notes text · created_at
)
```

## Navigation & Page Map

- `/staff/safety`: Moderation queue scoped to `school_id`, filterable by status (`open`, `reviewing`, `actioned`, `dismissed`), user actions (warn, suspend, restore), escalation to campus offices, and escalations history.
- `/staff/settings/escalation`: Route configuration for `housing_admin` (Title IX, CARE, Housing On-call, Campus Police), with contact details and preview.

## Tests

- Unit: route resolution for school categories, student consent logic, fallback when no route is active.
- RLS: moderator in school A cannot read or write school B's reports or escalation routes; students can only view active routes for their own school.
- E2E: report flow with "This is serious" option -> destination shown -> escalation logged in `/staff/safety`.
