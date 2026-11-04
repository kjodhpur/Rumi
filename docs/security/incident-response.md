# Incident response runbook

> **Status: draft — not audited.** Names and phone numbers are filled in per deployment.

**Severity.** S1: confirmed exposure of student data or credentials, or a safety-critical
failure (crisis resources not shown). S2: suspected exposure, auth bypass without evidence of
use, an outage over an hour. S3: other security bugs.

1. **Detect and declare.** Anyone can declare. Open an incident note with time, reporter and
   what is known. Page the on-call engineer for S1/S2.
2. **Contain.** Rotate exposed secrets (Supabase service key, `TOKEN_ENCRYPTION_KEY` needs a
   re-encryption plan, Twilio, Resend, CRON_SECRET); revoke sessions in Supabase Auth; disable
   the affected feature flag; pause cron jobs in Vercel if they are involved.
3. **Investigate.** Use Supabase logs, Vercel logs and `audit_log` (staff actions) to scope
   who and what was affected. Preserve logs before retention removes them.
4. **Notify.** Tell affected schools within the window agreed in their contract, and
   students where law or contract requires. State facts, scope, what students should do.
5. **Recover.** Fix, deploy, verify (tests, a manual check of the affected path).
6. **Review.** Within two weeks: timeline, root cause, what changed. Add a regression test.

Example: on 2026-11-04 two database functions (`purge_audit_log`, `school_students`) were
found executable by signed-in users. They were revoked in production the same day
(migration `revoke_internal_functions`), and `src/test/definer-functions.test.ts` now fails
if any security-definer function is callable without a caller check. The API logs available
(the last 24 hours) show only the nightly retention job calling `purge_audit_log` from the
server and no calls to `school_students`; older logs were not available to review.
