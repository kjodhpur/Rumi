# Phase 1.H: Deadline-Aware Nudges

## Overview
Students often procrastinate on finalizing roommate groups and signing room agreements before strict university housing deadlines. Phase 1.H automates deadline-driven nudge notifications dispatched at $T-7$, $T-2$, and $T-0$ days relative to key term milestones (`roommate_deadline`, `selection_window`, `agreement_due`).

## Architecture
1. **Rule & Send Schema**:
   - `nudge_rules`: School-configurable rules specifying which deadlines trigger notifications, applicable offset days (`{7, 2, 0}`), channels, and pause controls.
   - `nudge_sends`: Strict unique constraint on `(rule_id, user_id, offset_days)` ensuring zero duplicate nudges for the same offset.
2. **Scheduling & Idempotency**:
   - `src/lib/notifications/deadline-nudges.ts`: Pure function calculating days until deadline with campus timezone awareness.
   - Unpaired students or groups with unsigned agreements receive tailored notifications linking directly to their next action.
   - Students who already completed the milestone or unsubscribed are automatically filtered out.
3. **Cron Job**:
   - `/api/cron/deadline-nudges` runs daily at 10:00 AM campus time (17:00 UTC), authenticated via `CRON_SECRET`.
