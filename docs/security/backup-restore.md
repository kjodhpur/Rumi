# Backup and restore

> **Status: draft — no restore test has been recorded yet.**

**Backups.** Supabase takes daily database backups on paid plans (point-in-time recovery is an
add-on). Storage buckets (`photos`, `intros-media`, `imports`) are not covered by database
backups; photos can be re-uploaded by students, import files are temporary by design.

**Restore test (run quarterly, and before a school pilot starts):**

1. Restore the latest backup into a new Supabase project (never over production).
2. Point a preview deployment at it with its own `TOKEN_ENCRYPTION_KEY` copy so encrypted
   columns can be read.
3. Check: sign-in works; a student's matches, chats and agreement load; staff overview totals
   match production for the backup date; an encrypted check-in note decrypts.
4. Record the time taken and anything that failed below, then delete the test project.

| Date | Backup used | Restore time | Checks passed | Issues | By |
|---|---|---|---|---|---|
| — | — | — | — | No test recorded yet | — |
