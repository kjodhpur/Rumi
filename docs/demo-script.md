# Demo script — Demo University (about 10 minutes)

Follows master prompt §7. Everything here is synthetic: Demo University (`demo.rumimatch.app`)
is fictional, every row is marked `is_demo`, staff screens carry a "Demo data" banner, student
screens a "Demo data" note, and the outcomes report says "Synthetic data for demonstration".
Never present these numbers as real outcomes.

## Before the demo

```bash
npm run db:start                  # local Supabase (Mailpit receives the sign-in codes)
npm run seed                      # ASU-styled students for the student app
npm run seed -- --demo-school     # Demo University: 200 students, 60 pairs, 15 groups,
                                  # 2 cohorts, 3 buildings, 8 weeks of check-ins,
                                  # agreements, one import with errors, one account per role
npm run dev
```

Sign-in codes arrive in Mailpit at http://127.0.0.1:54324. Seeding a hosted project needs
`SEED_ALLOW_REMOTE=true` and should only ever target a staging project.

| Role | Account |
| --- | --- |
| Housing admin | `housing_admin@demo.rumimatch.app` |
| Housing staff | `housing_staff@demo.rumimatch.app` |
| RA | `ra@demo.rumimatch.app` |
| Analyst | `analyst@demo.rumimatch.app` |
| Moderator | `moderator@demo.rumimatch.app` |
| Students | any seeded student, e.g. `sasha.abara.22@demo.rumimatch.app` |

Use a phone-sized window (375px) for the student part and a laptop for the staff part.

## 1. Student onboarding (phone)

Sign up with a new `@demo.rumimatch.app` address, or `npm run seed -- --demo you@asu.edu` to give
your own ASU-styled account intros and a chat. Show the importance weights ("What matters
most?"), dealbreakers ("hard filters in both directions") and the optional Spotify step. Point
out the Spanish option on the login page and in Settings → Language.

## 2. Matches

The ranked list: open a match to show the score ring, "Why you match", "Worth talking about"
(watch-outs) and mutual connections. Scores go both ways: the other student sees the same
number. Filters narrow the list, and dealbreakers always apply.

## 3. Intro, chat and the scam tip

Send an intro; accept it from the other account (Messages → Requests). The chat opens. Type
"Venmo me the deposit first": the payment safety tip appears in the thread and an automatic
report goes to the safety queue (Staff → Safety & reports). Nothing is blocked or hidden.

## 4. Group, agreement, PDF

Start a 3-person group (Groups → Start a group): "How you all fit" shows every pairing. Open the
roommate agreement: it's prefilled from everyone's answers (quiet hours, guests, chores) and the
watch-outs. Edit a section, accept, sign with typed names, then Save as PDF.

## 5. Staff overview (laptop)

Sign in as `housing_admin@demo.rumimatch.app`. `/staff` shows the "Demo data" banner, the
sign-up-to-pair funnel, the score distribution and unmatched students (counts of 1–4 show as
"<5"). Students → select a few → Send nudge.

## 6. Auto-pair, review, StarRez

Pairings → Auto-pair: proposals never violate a dealbreaker or school rule. Approve a few, then
Integrations → StarRez: map the columns to the school's headers and download the CSV. Explain
the REST adapter (the "REST connection" tab) once ASU's StarRez REST license and credentials
exist. The "Import assignments" tab shows the seeded import with its errors by
line, and undo.

## 7. After move-in

Sign in as `ra@demo.rumimatch.app`: Check-ins shows flagged rooms with the reasons behind each
(two rough check-ins in a row, roommates scoring differently) and only for students who shared
or asked for help. Open a case, add a note or a task, and from the group reopen the agreement.

## 8. Outcomes

Outcomes: Rumi vs control cohorts with 95% Wilson intervals, small cells suppressed, the
methodology, and the "Synthetic data" banner. Print the term report from the overview.

## 9. Privacy

Settings → Privacy (as a student): sharing with housing and check-in sharing, each revocable;
revoking removes the student from staff screens on the next request. Staff → Privacy &
retention: retention windows. Staff → Audit log: every staff read of student-level data.

## Close

Free for students, works alongside StarRez (it doesn't replace it), and a pilot with one
residential college (the overview counts down to the pilot's end; Plan & beds shows its scope).
