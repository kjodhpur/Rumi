# Phase 7.2 — Mutual connections

## Decisions

- **Opt-in.** A count appears only when both students have `social_verification` on, and each person in the count has it on too. Otherwise the profile shows nothing, including no zero.
- **Who counts.** Someone both students know through an accepted intro or a shared group. The two students themselves never count. Pending intros do not.
- **Count only for this pass.** Avatars and Instagram/LinkedIn handles are later. The number is not a match score and does not override dealbreakers.

## Tests

- Unit: opted-out people drop out, duplicates collapse, one-sided acquaintances do not count.
