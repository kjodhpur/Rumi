# Phase 4 + 4.1 — Roommate agreements and conversation starters

Written before the code (master prompt §3, Phase 4 and 4.1).

## Decisions

- **One agreement per group of two or more.** Housing-suggested pairs are already two-person groups (Phase 1), so pairs and groups work the same way.
- **The draft is prefilled from the members' profiles.** Quiet hours come from the earliest sleeper, chores from the tidiest member, and the overnight-guest limit from whoever wants fewest guests. Smoking, drinking and pet rules follow the strictest member. A "Talk about this" section lists every pairwise watch-out from the matching engine. The default template lives in code (`lib/agreements/template.ts`). Staff-editable school templates are later work.
- **Section by section.**
  - Editing a section makes the editor its proposer and clears everyone else's acceptance. Each other member then accepts it or edits it again.
  - Every change is an `agreement_events` row with the before and after text, so a section shows "Changed by X" and the previous version.
  - Comments happen in the group chat.
- **Signing:**
  - It unlocks only when every section is accepted by every member.
  - Each member types their full name to sign. The agreement is signed when everyone has.
  - Any member can reopen it, which clears signatures, bumps the version and keeps the history.
- **Membership changes void it.** If the group's members no longer match the agreement's, it's void and members can start a new draft.
- **PDF:** a print-ready page (`/print/agreement/[groupId]`) with semantic headings and lists, so the browser's "Save as PDF" produces a tagged, accessible PDF.
- **Staff see status only:** none, draft, signed or void, and only for groups that appear in pair review (consent rules from Phase 1). Never the text.
- **Conversation starters (4.1).** Template-based, no AI. Each watch-out between two students becomes 2–3 editable openers. The wording depends on who is higher on the factor (for example "You're up later than me…" versus "I tend to stay up later…"). They show as a chip row above the chat composer in direct chats and two-person groups; tapping one fills the composer, and the row can be dismissed.

## Schema

```
agreements            id · group_id → groups · version · status draft|signed|reopened|void · member_ids uuid[] ·
                      signed_at · created_at · updated_at        (one live agreement per group)
agreement_sections    agreement_id · key · title · position · content · proposed_by · accepted_by uuid[] · updated_at
agreement_signatures  agreement_id · user_id · version · typed_name · signed_at
agreement_events      id · agreement_id · actor_id · kind created|edited|accepted|signed|reopened|voided · section_key · before · after · created_at
```

RLS: group members read every agreement table for their group. All writes go through server actions that check membership with `is_group_member`, using the service role, so the rules (acceptance resets and signing gates) live in one place.

## Tests

- **Unit:**
  - Template prefill: quiet hours follow the earliest sleeper; the guest limit is the strictest; a watch-out section appears only when there are watch-outs.
  - Acceptance logic: an edit resets acceptance; signing needs all sections accepted.
  - Every factor has starters in both directions.
- **RLS:** members read, non-members can't, and nobody writes directly.
- **E2E:** two students in a pair open the agreement, edit and accept sections, both sign, the printable page renders, and one reopens. A chat shows starters and tapping one fills the composer.
