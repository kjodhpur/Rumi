# Phase 7.2 & 7.6 — Social Media Accounts, Verified Handles & Web of Connections

Written before the code, following master prompt §0.1 (Rule 32), §1, §7.2, and §7.6.

## Decisions

- **No scraping, handles as links only.** Following Kanha's non-negotiable rule: "Instagram handle (optional, displayed as a link only; do not call any Instagram API)". Links open directly to `instagram.com/<handle>` and `linkedin.com/in/<handle>`.
- **Self-attested with optional one-time bio verification code.** A student can link their handle anytime. To earn a "Verified handle" trust badge, Rumi generates a short, unique code (e.g. `RUMI-9A4B`) that the student places in their bio/headline and confirms. Clearly labeled "self-attested / bio verified".
- **Points of contact & avatars (opt-in only).** When both students have `social_verification` consent turned on, the profile displays mutual connections with their first names and avatars (only for connections who also have `social_verification` on). Never reveals non-consenting users.
- **Capped trust signal in matching.** Having verified social profiles or mutual connections adds a small, capped trust signal (+2 to +5 points) to the overall compatibility explanation ("Verified student accounts", "Shared campus connections"). It never overrides hard dealbreakers (smoking, pets, gender preference, etc.).
- **Connected accounts hub.** In Settings → Connected accounts, students see dedicated cards for Instagram and LinkedIn with handle input, verification code generator, verification status, and one-tap disconnect (which deletes the stored link).

## Schema

```sql
social_links (
  id uuid PK · user_id references profiles(id) on delete cascade ·
  platform text check (platform in ('instagram', 'linkedin')) ·
  handle text not null ·
  verification_code text ·
  verified_at timestamptz ·
  created_at timestamptz ·
  updated_at timestamptz ·
  unique (user_id, platform)
)

connections (
  id uuid PK ·
  user_a uuid references profiles(id) on delete cascade ·
  user_b uuid references profiles(id) on delete cascade ·
  source text not null check (source in ('in_app', 'campus_peer', 'group', 'intro')) ·
  status text not null check (status in ('pending', 'confirmed')) ·
  confirmed_at timestamptz ·
  created_at timestamptz ·
  unique (user_a, user_b)
)
```

## Navigation & Page Map

- `src/app/(app)/settings/accounts`: Adds Instagram and LinkedIn cards with connect, verification, and disconnect.
- `src/components/profile/profile-view.tsx`: Displays verified social chips (Instagram, LinkedIn) and "Mutual connections" card with avatars and points of contact.
- `src/lib/matching/engine.ts`: Evaluates social trust bonus (capped at 5 points) and adds reasons ("Verified student accounts").

## Tests

- Unit: handle formatting & sanitization (removing `@`, `https://`), bio verification code generation and validation.
- Unit: mutual connection resolution ensuring non-consented users are strictly excluded.
- Unit: matching engine trust bonus is strictly capped and never overrides dealbreakers.
