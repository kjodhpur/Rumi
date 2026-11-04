# HECVAT Lite — draft answers

> **Status: draft — not reviewed.** Answers describe the product as built. Questions are
> paraphrased by area; map them to the current EDUCAUSE template before submitting.

| Area | Draft answer |
|---|---|
| Company and product | Rumi: roommate matching for verified students; free for students; schools may run a pilot. Independent; not affiliated with any school. |
| Hosting | Supabase (Postgres, Auth, Storage) and Vercel. See `subprocessors.md`. |
| Data collected | See `data-map.md`. No Social Security numbers, financial account numbers or health records are requested. Accommodation notes, if a school uses them, are encrypted and limited to designated staff. |
| Authentication | Email one-time codes to school addresses; optional SAML/OIDC SSO per school; staff accounts by invite. |
| Authorization | Row Level Security on every table; roles per school; RAs limited to assigned buildings. |
| Encryption | TLS in transit; encrypted at rest by the hosts; AES-256-GCM for sensitive columns. |
| Logging | Staff actions in an append-only audit log kept 3 years by default. |
| Vulnerability management | Dependency updates; `npm audit` reviewed before releases; disclosure policy at `/security`. |
| Incident response | Runbook in `incident-response.md`; school notification per contract. |
| Business continuity | Provider backups; restore procedure in `backup-restore.md` (test not yet recorded). |
| Third-party assessments | None. No SOC 2, ISO 27001 or penetration test report exists. |
| Accessibility | Built to WCAG 2.1 AA; automated axe checks in end-to-end tests; no VPAT yet. |
| Data deletion | Students delete their own accounts; schools handle requests in Staff → Privacy; retention jobs run nightly. |
