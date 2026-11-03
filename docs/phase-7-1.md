# Phase 7.1 — Weekly Spotify Refresh Cron

Written before code per master prompt §1 and §7.1.

## Decisions

- **Weekly batch cadence.** A Vercel cron runs every Sunday at 04:00 UTC (`0 4 * * 0`) querying users whose Spotify account has not synced within the last 7 days.
- **Graceful error handling.** If a refresh token was revoked by the student or Spotify returns 400/401, the account is flagged or disconnected rather than crashing the batch. If Spotify returns 429 (rate limited), the run honors `Retry-After` or backs off to avoid quota depletion.
- **Match score recomputation.** After a successful taste refresh, affected user matches are queued for recomputation so updated taste profiles take effect in rankings.

## Endpoints & Schedules

- `/api/cron/spotify-refresh`: Bearer `CRON_SECRET` authorized endpoint.
- `vercel.json`: Added weekly schedule `0 4 * * 0`.
