# Phase 2a — StarRez CSV export

The export half of master prompt §2a. Import, the REST adapter and questionnaire import come later.

## Decisions

- **What's exported:** approved pairings whose members haven't changed since approval, and whose members have all chosen to share. Anything else is listed as left out, with the reason. Each student is one row, with their group, whether they lead it, the group size and the active term.
- **Identifiers:**
  - Students can add an optional student ID in Settings → Privacy, next to the sharing switch.
  - It's encrypted with the same AES-256-GCM key as OAuth tokens, kept in the owner-only `user_settings` table, outside the student-writable column grant, and set only through a server action.
  - Rows without an ID still carry the school email.
  - The sharing consent wording now says email and student ID are included.
- **Columns are configurable:** pick, rename and reorder fields per school (`integration_mappings`). The default is `EntryID, Email, GroupName, GroupLeader, GroupSize, Term`. The real StarRez field names must be confirmed with the school's StarRez administrator, so nothing is hard-coded.
- **CSV safety:** RFC 4180 quoting, CRLF line endings, and cells starting with `= + - @` are prefixed with `'` so spreadsheets don't run them as formulas.
- **Access:** housing admins only, rate-limited. Every view and download is in the audit log, and a download stamps `pairings.exported_at`.

## Schema

```
user_settings        + student_id_enc text (encrypted, owner-only)
pairings             + exported_at timestamptz
integration_mappings school_id · provider 'starrez' · direction 'export' · mapping jsonb [{field, header}] · updated_by · updated_at
```

## Pages

- `/staff/integrations/starrez`: notes on left-out groups and missing IDs, the column editor, a preview of the first 20 rows, and "Download CSV" (`/api/staff/starrez`).
- Settings → Privacy: "Student ID (optional)", shown only while the housing sharing consent is available.

## Tests

- Unit: quoting, formula defusing, column order and mapping clean-up.
- RLS: mappings are housing-admin only; another student can't read a student ID, and students can't write it directly.
- E2E: the Phase 1 flow continues into the export, renames a column, downloads the CSV and checks headers and rows.
