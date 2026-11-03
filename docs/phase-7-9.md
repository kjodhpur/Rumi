# Phase 7.9 — Parent View (Read-Only, Opt-In)

Written before code per master prompt §7.9.

## 1. Principles

- **Student agency & opt-in:** Students can generate an expiring, revocable share link for parents/family members.
- **Strict scope isolation:**
  - Shows student's match summary (student first name, roommate first name, score, top reasons, agreement status).
  - Strictly **never** chat.
  - Strictly **never** the roommate's photos unless the roommate has consented.
  - Roommate without consent appears as "Your student's roommate" only.
- **Revocable & expiring:**
  - Token is 32-byte cryptographically secure random value stored as SHA-256 hash.
  - Revoking immediately causes the `/parent/[token]` route to 404.
  - Token expires at term start (or 90 days default).

## 2. Schema

```sql
create table public.family_shares (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  token_hash  text not null unique,
  scope       jsonb not null default '{"include_agreement": true, "include_photos": false}'::jsonb,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
```

## 3. Pure Calculation & Logic

`src/lib/family/scope.ts`:
- Pure function `buildParentViewData`:
  - Input: studentProfile, roommateProfile, matchScore, agreementStatus, roommateConsentedPhotos
  - Sanitizes:
    - If roommate consented: roommate name = `roommate.firstName`.
    - If roommate NOT consented: roommate name = `"Your student's roommate"`, roommate avatar = `null`.
    - Top 3 reasons sanitized of PII.
    - Zero chat messages.
