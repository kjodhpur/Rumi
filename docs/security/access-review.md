# Access review procedure

> **Status: draft — not audited. No reviews have been recorded yet.**

**Every quarter, and when someone leaves:**

1. **Rumi team (platform admins).** List `admins` and the `ADMIN_EMAILS` setting; remove anyone
   who no longer needs access. Review Supabase and Vercel project members and remove leavers.
2. **School staff.** Each housing admin opens Staff → Team, disables members who left, and
   checks roles and RA building scopes. Pending invites older than their expiry are revoked
   automatically; revoke any others not needed.
3. **Secrets.** Confirm who can read production environment variables in Vercel. Rotate
   `CRON_SECRET` and third-party keys when someone with access leaves.
4. **Audit log spot-check.** Filter the audit log for exports, records requests and signed
   agreement views; confirm each had a reason.
5. **Record.** Add a row below.

| Date | Scope | Reviewer | Changes | Notes |
|---|---|---|---|---|
| — | — | — | — | No review recorded yet |
