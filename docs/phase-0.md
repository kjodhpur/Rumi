# Phase 0 — Staff roles, consent, audit, retention

Written before the code, per the master prompt (§3). Phase 0 is the foundation every staff feature sits on: who staff are, what a student has agreed to share, and a record of every staff action.

## Decisions

- **Platform admins stay in `admins`.** The Rumi team is `platform_admin`; the `ADMIN_EMAILS` bootstrap keeps working unchanged. School roles live in a new `staff_members` table.
- **Staff are never students.** Staff sign in with the school domain (the existing sign-up trigger still applies), and `profiles.is_staff` keeps them out of the matching pool and out of every student's view. Staff can't browse student profiles through the student tables either: `can_view_profile` returns false when the viewer is staff.
- **Upgrading a student needs a platform admin.** A housing admin can invite anyone, but if the invited email already belongs to an onboarded student, only an invite sent by a platform admin can be accepted.
- **Access is checked on every request.** The staff layout and every staff action call `has_role` against the database, so disabling a staff member takes effect on their next click, not their next sign-in.
- **Nothing claims an ASU partnership.** Consent prompts name the school's housing office only when `schools.housing_office_name` is set. ASU's is empty in production until a signed pilot exists, so students never see "Share with ASU Housing" before then.
- **Demo profiles switch.** `schools.hide_seed_profiles` hides seed profiles from every student view (enforced in `can_view_profile`) and from matching. It's toggled in `/admin`, so it takes effect without a redeploy. It's off by default.
- **No new cron entries.** The nightly `/api/cron/recompute` run also runs retention. `/api/cron/retention` exists for manual runs. This keeps `vercel.json` within plan limits.

## Schema

```
schools  + hide_seed_profiles bool default false
         + housing_office_name text            -- e.g. "ASU Housing"; null = no partnership, consent UI hidden
profiles + is_staff bool default false

staff_members
  id uuid PK · user_id → profiles · school_id → schools
  role ('housing_admin'|'housing_staff'|'ra'|'analyst'|'moderator')
  scopes jsonb { buildings: text[], communities: text[] }   -- ra only; empty = none
  invited_by → profiles · created_at · disabled_at
  unique (user_id, school_id)

staff_invites
  id uuid PK · school_id · email (lowercase) · role · scopes
  token_hash text unique (sha-256 of the emailed token) · expires_at (7 days)
  created_by → profiles · created_by_platform bool · accepted_at · accepted_by · revoked_at
  one pending invite per (school, email)

consents
  id uuid PK · user_id → profiles · school_id · kind · version · granted_at · revoked_at
  kind ∈ share_with_housing | checkins | research_outcomes | sms | calendar | social_verification
  at most one active (revoked_at is null) row per (user, kind); history is every row

audit_log  (append-only: no update/delete grant for any API role)
  id · actor_id · school_id · action · entity · entity_id · meta jsonb · ip · created_at

retention_policies
  school_id · entity · days · updated_by · updated_at     PK (school_id, entity)
  entity ∈ orphaned_messages (90) | inactive_accounts (730) | inactive_warning (30) | audit_log (1095)
           | checkin_notes (90 after term end — used from Phase 5)
profiles + inactivity_warned_at timestamptz
```

## SQL helpers

- `has_role(p_school text, p_roles text[], p_uid uuid default auth.uid())`: true for platform admins, or an enabled `staff_members` row with one of the roles whose profile isn't banned.
- `staff_scope_includes(p_school text, p_building text, p_uid uuid default auth.uid())`: true for every non-RA role. For an RA, only when the building is in their scope.
- `has_consent(p_uid uuid, p_kind text)`: an active consent row exists.
- `set_consent(p_kind text, p_granted boolean, p_version text)`: the only way a student changes a consent. It revokes the active row or inserts a new one.
- `purge_audit_log(p_before timestamptz)`: the only path that deletes audit rows (owner-run, service role only).

## RLS

| Table | Read | Write |
| --- | --- | --- |
| staff_members | self; housing_admin/housing_staff of the school | server actions (service role) after `has_role` |
| staff_invites | housing_admin of the school | server actions |
| consents | owner | `set_consent` RPC only |
| audit_log | housing_admin of the school (platform admins via `has_role`) | service role insert only; no update/delete |
| retention_policies | housing_admin | server actions |

## Pages

- `/staff`: staff home. Picks the school (platform admins can switch), shows a setup checklist and the people on the team. It becomes the metrics overview in Phase 1.
- `/staff/settings/team`: invite by email (role, plus building scope for RAs), change role, disable or enable, revoke or resend an invite. The last housing admin can't remove, demote or disable themselves.
- `/staff/settings/privacy`: per-school retention periods (housing admin).
- `/staff/audit`: audit log with filters (housing admin).
- `/staff/invite/[token]`: accept an invite. The person must sign in with the invited email.
- **Student side:**
  - **Settings → Privacy:** a "Sharing with your school" section with a toggle per consent, what each one shares, and its history.
  - **Onboarding:** a final, optional "Share with {housing office}" step, shown only when the school has a housing office configured.
- **Admin:** a "Demo profiles" switch per school.

## Retention (nightly)

All selection is pure (`lib/retention/policy.ts`) and runs against a clock argument, so tests use fixed dates.

- **Orphaned messages:** conversations with no members left lose their messages after N days, and are then deleted.
- **Inactive accounts:** after `inactive_accounts − inactive_warning` days of inactivity, a warning email goes out and `inactivity_warned_at` is set. After `inactive_accounts` days, the account is deleted, but only if it was warned at least `inactive_warning` days earlier. Staff, platform admins and seed profiles are skipped. Signing in clears the warning.
- **Audit log:** rows older than N days are purged through `purge_audit_log`.
- **Idempotent:** a second run the same day finds nothing to do.

## Tests

- Unit tests: retention cutoffs and selection with fixed clocks; role labels and invite-token hashing.
- RLS tests (Vitest against the local stack, skipped when it isn't running):
  - Each role sees only what it should.
  - Students can't read staff tables or other students' consents.
  - Nobody can update or delete `audit_log`.
  - Staff can't read student profiles.
  - An RA scoped to building X fails `staff_scope_includes` for building Y.
- E2E: a platform admin invites a housing admin, the invitee signs in, accepts and lands on `/staff`, then disables the invitee, who loses access on the next request. Axe checks run on every staff page.
