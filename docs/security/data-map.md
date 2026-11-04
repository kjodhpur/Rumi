# Data map

> **Status: draft — not audited.**

All application data lives in one Supabase project (Postgres, Auth and Storage). Row Level
Security (RLS) is enabled on every table; the service role (server only) bypasses it for
jobs such as matching and retention. "Staff" below means a housing office account with a
role (`housing_admin`, `housing_staff`, `ra`, `analyst`, `moderator`); staff see student-level
data only when the student turned on **Share my Rumi results with my housing office**
(`share_with_housing`), and otherwise totals with counts under 5 shown as "<5". Staff reads
of student-level data are written to `audit_log`.

| Data | Where | Who can read it | Kept |
|---|---|---|---|
| Account email, sign-in history | Supabase Auth, `user_settings.email` | The student; service role | Until deleted; inactive accounts deleted after 24 months (30-day warning) |
| Profile (first name, last initial, pronouns, gender, year, major, bio, photos) | `profiles`, `photos`, Storage `photos` | Verified students at the same school who can contact them; staff with consent | Until deleted |
| Campus fields (campus, colleges, LLC, gender-inclusive interest, track) | `profiles` | The student; matching; staff as totals (with consent: individually where shown) | Until deleted |
| Housing preferences and weights | `preferences`, `school_question_answers` | The student; matching (service role); compatibility shown to matches | Until deleted |
| Match scores, reasons, watch-outs | `match_scores` | The two students | Recomputed nightly; removed when a pair stops qualifying |
| Messages | `messages`, `conversations` | Conversation members | Deleted N days (default 90) after every member has left |
| Phone number (texts) | `user_settings.phone_enc` (AES-256-GCM), `phone_last4`, `phone_hash` (keyed hash) | The student (last 4 only); service role to send | Until removed or account deleted |
| Check-ins and notes | `checkins` (notes AES-256-GCM in `note_enc`) | The student; RA only for students who chose to share; crisis flags carry no content | Notes cleared N days (default 90) after term end; scores kept |
| Accommodations | `accommodation_constraints` (notes encrypted) | Housing admins and staff with the accommodations scope | Removed when expired (unless legal hold) or consent revoked |
| Safety reports | `reports`, `moderation_log`, `escalations` | Reporter; school moderators/admins for their school; Rumi admins | Kept for safety review |
| Agreements, room calendar, chores, expenses | `agreements*`, `room_events`, `chore_*`, `expenses`, `settlements` | Group members; signed agreements to staff only with every member's consent | Until the group or accounts are deleted |
| Admitted-student list | `admit_allowlist` (SHA-256 of personal email only) | Housing staff | Until removed |
| StarRez imports and credentials | Storage `imports`; `import_jobs`; `integration_credentials` (encrypted) | Housing admins; credentials service role only | Import files deleted after 30 days; unclaimed imported answers after 60 days |
| Spotify | `spotify_accounts` (tokens encrypted), `music_profiles` | The student; shared artists shown to matches | Deleted on disconnect |
| Notifications, push subscriptions, text log | `notifications`, `push_subscriptions`, `sms_messages` (no message text) | The student; service role | Push subscriptions removed when the browser rejects them |
| Consents | `consents` | The student; staff see their own school's consent state as needed | Kept as a history |
| Staff activity | `audit_log` (append-only) | Housing admins for their school | 3 years by default |
| Research rows | `outcome_surveys`, de-identified exports | Totals to staff; de-identified rows only for students with `research_outcomes` consent | Per school policy |

Encryption: data at rest is encrypted by the hosting provider; the columns marked above are
also encrypted by the application with `TOKEN_ENCRYPTION_KEY` (AES-256-GCM). Share, family
and calendar links store only a SHA-256 hash of an HMAC-derived token.
