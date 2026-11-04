# Control matrix (SOC 2 Trust Services Criteria headings)

> **Status: readiness only — not certified, not audited.** Rumi has no SOC 2 report. This maps
> what exists in the product to the criteria headings so gaps are visible.

| Criteria | Control in Rumi | Evidence | Gap |
|---|---|---|---|
| CC1 Control environment | Written security docs (this folder); role definitions in `src/lib/staff/roles.ts` | Repository history | No formal policies signed by staff |
| CC2 Communication | `/security` disclosure page; privacy page; consent copy shown before sharing | Pages in the app | No security training program |
| CC3 Risk assessment | Threats reviewed per feature in `docs/phase-*.md` | Phase docs | No annual risk assessment |
| CC5 Control activities | RLS on every table; security-definer functions check roles; server-side rate limits | Migrations; `src/test/rls-*.test.ts` | — |
| CC6.1 Logical access | Supabase Auth (email codes, optional SSO); staff roles scoped per school; RA building scopes | `staff_members`, `has_role()` | No MFA requirement for staff |
| CC6.2 Access provisioning | Staff invites expire; admins disable members; [access-review.md](access-review.md) | `staff_invites`, audit log | Reviews not yet performed |
| CC6.6 Boundary protection | HTTPS only; CSP and security headers in `next.config.mjs`; webhook signature checks (Twilio) | Config | No WAF rules beyond the host's |
| CC6.7 Data in transit/at rest | TLS; provider encryption at rest; AES-256-GCM for tokens, phone numbers, notes | `src/lib/crypto.ts` | Key rotation is manual |
| CC7.2 Monitoring | Audit log of staff actions; moderation log; host logs | `audit_log` | No alerting on anomalous staff access |
| CC7.3–7.5 Incident response | [incident-response.md](incident-response.md) | Runbook | Not yet exercised |
| CC8 Change management | Pull requests, CI (lint, types, tests, e2e), migrations reviewed | GitHub history | No formal change approval |
| CC9 Vendor management | [subprocessors.md](subprocessors.md) | List | No vendor reviews on file |
| A1 Availability | Hosted on Supabase and Vercel; nightly jobs idempotent | — | No uptime target; backups per [backup-restore.md](backup-restore.md) |
| C1 Confidentiality | Consent-gated staff views; small-count suppression; retention jobs | `consents`, `src/lib/retention` | — |
| P (Privacy) | Student data export and deletion; staff records requests; retention settings | Settings → Your data; Staff → Privacy | Privacy notice needs legal review |
