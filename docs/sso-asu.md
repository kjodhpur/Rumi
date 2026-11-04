# Single sign-on for ASU (draft for ASU IT review)

> **Status: draft. ASU has not reviewed or approved this configuration.** It describes what
> Rumi supports and what ASU's identity team would need to provide if ASU chooses to connect.

Rumi is an independent service and is not affiliated with Arizona State University.

## How it works

- Rumi uses **Supabase Auth SSO** (SAML 2.0; OIDC also possible). Supabase hosts the service
  provider, so the endpoints below live on Rumi's Supabase project URL. SAML SSO needs a
  Supabase plan that includes it.
- Login page → **Continue with ASU sign-in** → ASU's IdP → Supabase → `/auth/callback` →
  Rumi. The existing database rule still applies: only `@asu.edu` accounts become student
  accounts (`handle_new_user`), and the sign-in re-stamps the yearly student verification.
- **Affiliation mapping.** If the assertion releases `eduPersonAffiliation` and it doesn't
  include `student` (for example only `staff` or `faculty`), the account is kept out of
  roommate matching (`profiles.sso_non_student`, hidden from the pool and from staff totals)
  and the person sees "Rumi is for students". With no affiliation released, the school email
  check alone decides, as with code sign-in. Code: `src/lib/auth/sso.ts`.
- **Code sign-in fallback** stays on by default. A housing admin can turn it off in
  Staff → Single sign-on once SSO works. Admitted students without an ASU account
  (pre-arrival, `docs/phase-3-tracks-and-prearrival.md`) always use codes.
- **Pre-arrival accounts** move to the ASU email on the same account (Settings → "Got your
  school email?"), keeping matches and chats. A housing admin can link a duplicate account
  in Staff → Admitted students.

## What ASU IT would provide

1. IdP metadata: a metadata URL (preferred) or XML with the entity ID, SSO endpoint and
   signing certificate.
2. Attribute release for Rumi's service provider:

| Attribute     | SAML name                                                   | Use                                | Needed      |
| ------------- | ----------------------------------------------------------- | ---------------------------------- | ----------- |
| Persistent ID | NameID (persistent) or `eduPersonPrincipalName`             | Stable account key                 | Required    |
| Email         | `urn:oid:0.9.2342.19200300.100.1.3` (`mail`)                | School email check                 | Required    |
| Given name    | `urn:oid:2.5.4.42`                                          | First name on the profile          | Required    |
| Surname       | `urn:oid:2.5.4.4`                                           | Last initial only                  | Required    |
| Affiliation   | `urn:oid:1.3.6.1.4.1.5923.1.1.1.1` (`eduPersonAffiliation`) | Keep staff/faculty out of matching | Recommended |

Rumi doesn't ask for student IDs, majors, colleges or any directory data beyond these.

## What Rumi gives ASU IT

Shown with copy buttons in Staff → Single sign-on. For a Supabase project at
`https://<project>.supabase.co`:

| Item                 | Value                                                     |
| -------------------- | --------------------------------------------------------- |
| Entity ID / metadata | `https://<project>.supabase.co/auth/v1/sso/saml/metadata` |
| ACS URL              | `https://<project>.supabase.co/auth/v1/sso/saml/acs`      |
| NameID format        | `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent`    |

## Setup steps (Rumi team)

1. Register the provider with the Supabase CLI, mapping attributes into user metadata:

   ```sh
   supabase sso add --type saml --project-ref <ref> \
     --metadata-url "<ASU metadata URL>" --domains asu.edu \
     --attribute-mapping-file sso-asu-mapping.json
   ```

   `sso-asu-mapping.json`:

   ```json
   {
     "keys": {
       "email": { "name": "urn:oid:0.9.2342.19200300.100.1.3" },
       "first_name": { "name": "urn:oid:2.5.4.42" },
       "last_name": { "name": "urn:oid:2.5.4.4" },
       "affiliation": { "name": "urn:oid:1.3.6.1.4.1.5923.1.1.1.1", "array": true }
     }
   }
   ```

2. Copy the provider ID from `supabase sso list` into Staff → Single sign-on (Rumi team
   accounts only) with the domain `asu.edu`.
3. Set `NEXT_PUBLIC_SSO_ENABLED=true` and redeploy. Test with an ASU test account, including
   a staff-affiliated one (it should land on "Rumi is for students").
4. Optionally turn off code sign-in for the school.

## Tests

- Unit: attribute mapping and the student/non-student decision (`src/lib/auth/sso.test.ts`).
- End to end: a mocked SSO identity (an account provisioned with an `sso:` provider and
  affiliation metadata, signed in through a magic link) lands on "Rumi is for students"
  (`e2e/sso.spec.ts`). No live IdP is contacted.
