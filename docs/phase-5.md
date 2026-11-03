# Phase 5 core — Check-ins, risk, RA workspace

Written before the code (master prompt, Phase 5 core). Room-swap marketplace (5.1) is later.

## Decisions

- **Move-in is self-reported for now.** A student says which building and room they moved into. StarRez import of assignments comes later. One open assignment per student; a new move-in closes the old one.
- **Pulses at week 2, 4 and 8.** Created when they move in. They can submit the next one early so a pilot doesn't wait two weeks. Monthly pulses are later nightly work.
- **Risk is a pure function** (`src/lib/retention/risk.ts`). High: two scores in a row at 2 or below, a drop of 3 or more (or a drop of 2 that lands on 2 or below), or roommate scores 3+ apart (or one at ≤2 and one at ≥4). Medium: a drop of 2, roommate scores 2 apart, a tag that matches a known watch-out, or a missed check-in. Otherwise low.
- **RAs see a person only when that person asked them to.** The list includes medium and high risk when the student has `checkins` consent and turned on "share with my RA", or they tapped "Ask my RA". The private note is included only when they shared it. Building scope from Phase 0 still applies. Housing admins and housing staff use the same list.
- **Crisis text stays with the student.** A note that matches crisis language shows 988 on their screen and is stored as a flag. It is not copied into the RA list unless they also chose to share the note.

## Schema

```
assignments   id · user_id · school_id · building · room · moved_in_at · closed_at
checkins      id · assignment_id · user_id · due_on · score · tags · note ·
              share_with_ra · ask_ra · crisis · submitted_at
risk_events   id · user_id · assignment_id · level low|medium|high · reasons text[] · created_at
```

Students read their own rows. Writes go through server actions. `ra_risk_list(school)` is the only staff read.

## Tests

- Unit: each risk rule, plus crisis phrasing that must not match ordinary complaints.
- RLS for the new tables is the same shape as agreements (owner read, no direct writes) and can run with the local stack.
