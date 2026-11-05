# Phase 8 — Multilingual (English + Spanish for student flows)

Master prompt §3 Phase 8, "Multilingual (expanded)": English and Spanish complete for student
flows, staff in English, Mandarin and Hindi structure-ready but flagged "needs professional
translation" (never machine-translated), a language picker in Settings, emails in the user's
locale, a missing-key check in CI and an e2e Spanish onboarding.

## Locales

| Locale | Status | Offered in the picker |
| --- | --- | --- |
| `en` | Source of truth | Yes |
| `es` | Complete for every student screen, email, notification and server error | Yes |
| `zh` | Structure only. Status: needs professional translation | No |
| `hi` | Structure only. Status: needs professional translation | No |

`src/lib/i18n/config.ts` holds `LOCALES` and `SELECTABLE_LOCALES`. A locale is only offered once
its dictionary is complete; `zh.ts` and `hi.ts` are empty `DeepPartial<Messages>` objects that
fall back to English, and a unit test fails if anyone adds an unreviewed string to them.

There's no locale routing (URLs don't change). Like `next-intl` with routing off, the language
comes from the account (`user_settings.locale`), then the `rumi_locale` cookie (set by the picker
on the login page and in Settings), then English.

## Dictionaries

- `src/lib/i18n/messages/en/<namespace>.ts` is the source of truth. Each Spanish file is typed
  `Messages["<namespace>"]`, so a missing or extra key fails to compile.
- Plurals use `Intl.PluralRules` (`{ one, other }` entries, keyed on `count`); placeholders are
  `{name}`. Ordinals that vary by language (the room calendar's "4th" / "4.ª") are their own
  entries picked by `Intl.PluralRules({ type: "ordinal" })`.
- Namespaces cover the shell, auth, onboarding, matching and reasons, matches, profile, chat,
  groups, roommate agreements, the room hub (chores, expenses, calendar), check-ins, retention
  (mediation, end-of-term survey), settings, safety, sharing, the family view, notifications,
  emails, server errors and standalone pages (suspended, offline, error).

## Using it

- Client components: `useT("namespace")`, `useOptions()` for localized option lists,
  `useIntlLocale()` for dates and numbers. Student layouts wrap pages in `WithI18n`.
- Server components and actions: `getT("namespace")` / `getLocale()` for the current request;
  `tFor(userId, namespace)` and `localesOf(ids)` when writing for someone else (emails, push, SMS,
  match reasons).
- Staff screens render outside the provider, so they stay English even for a staff member whose
  account is set to Spanish.

## Text that's stored, not rendered

Some English is stored and shown later. It's translated at display or send time instead of
changing the schema:

- **Server errors**: `fail()` answers in the request's language by matching the English message
  (and `{placeholder}` templates) against the `errors` dictionary. `errors-coverage.test.ts`
  reads every student-facing action, the shared validation and the database-error map and fails
  if a message has no Spanish entry; staff-only messages are listed as such.
- **Chat system messages and notifications**: matched against `chat.system` and
  `notifications.templates` when shown or sent.
- **Match reasons and watch-outs** are written by the engine in each viewer's language;
  changing language recomputes that student's scores.
- **Shared documents**: a roommate agreement is drafted in the language of whoever starts it
  (watch-outs only from viewers who read the same language); suggested chores are named in the
  adder's language. Default section titles and chore names read in each viewer's language while
  they're unchanged; anything the group or school wrote stays as written.
- **Risk reasons** stay English in the database (staff read them) and are shown translated to
  students. Room-change reasons a school hasn't renamed read in the student's language.
- **The family view** renders in the student's language, because the match reasons on it are
  stored in that language.

## Emails

- App emails (`lib/email/templates.ts`) take a locale; dispatch resolves each recipient's.
- The sign-in code email is sent by Supabase. `supabase/templates/otp.html` and the subject
  switch on the auth user's `locale` metadata (`{{ if eq (printf "%v" .Data.locale) "es" }}`),
  falling back to English when it's unset. A new account takes it from the login page's
  language; sign-in and language changes keep it in step (`lib/auth-locale.ts`). On a hosted
  project, paste the template and subject into Authentication → Email Templates (README).

## Safety in Spanish

Check-in notes are screened for crisis and threat language in Spanish as well as English, so a
Spanish note surfaces 988 (with "press 2 for Spanish") and 911 the same way.

## Tests

- `src/lib/i18n/i18n.test.ts`: every English key has Spanish and no extras, matching
  `{placeholders}`, no empty strings, zh/hi hold nothing unreviewed, error and notification
  translation, email rendering.
- `src/lib/i18n/errors-coverage.test.ts`: every server error a student can see has Spanish.
- Unit tests for Spanish agreement drafts, chore seeding, guest-limit warnings, mediation tips
  and crisis detection.
- `e2e/i18n.spec.ts`: picks Spanish on the login page, checks the code email's subject, onboards
  with Spanish validation messages, then visits groups and check-ins in Spanish.
- CI (`.github/workflows/ci.yml`) runs all of the above.

## Not translated, on purpose

- The marketing landing page and staff screens (English by design).
- Free text people write (bios, messages, agreement edits) and school-authored names.
- The majors in the onboarding suggestions list: the field is free text other students read, so
  the suggestions don't switch language under it.
