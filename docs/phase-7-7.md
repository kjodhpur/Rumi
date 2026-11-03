# Phase 7.7 — "Why We're a Match" Share Card & Share Links

Written before code per master prompt §7.7.

## Decisions

- **Zero PII exposure.** OG images and public share pages only display first names, initials avatars, the compatibility score, and top 3 reasons. Last names, emails, campus buildings, and watch-outs are strictly forbidden.
- **Mutual consent gate.** The public share page `/m/[token]` only renders when BOTH students have toggled consent to share. If either student revokes consent or the token expires (14 days), the link immediately 404s.
- **Signed expiring tokens.** Tokens are 32-byte cryptographically secure random values stored as SHA-256 hashes with a 14-day expiry.
- **Dynamic OG Image.** Rendered at `/api/og/match/[id]` via `ImageResponse` (`@vercel/og` / `next/og`) at 1200x630 resolution using Rumi's Ember accent and design tokens.

## Schema

```sql
match_share_tokens (
  id uuid PK ·
  user_a uuid references profiles(id) on delete cascade ·
  user_b uuid references profiles(id) on delete cascade ·
  token_hash text unique ·
  user_a_consented boolean default false ·
  user_b_consented boolean default false ·
  expires_at timestamptz ·
  revoked_at timestamptz ·
  created_at timestamptz
)
```

## Routes & Pages

- `/api/og/match/[id]`: Dynamic OG image endpoint using `ImageResponse`.
- `/m/[token]`: Public share viewer with Web Share API and copy link fallback.
