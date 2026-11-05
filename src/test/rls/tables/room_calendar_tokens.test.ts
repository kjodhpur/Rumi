import { rlsTable, seedRow } from "../harness";
import { hex64 } from "../fixtures";

// A member's private feed link: only they read, create or remove it.
rlsTable("room_calendar_tokens", {
  seed: (w, db, n) =>
    seedRow(db, "room_calendar_tokens", {
      group_id: w.groupId,
      user_id: w.ids.studentA,
      token_hash: hex64(`c${n}`),
    }),
  read: ["studentA"],
  update: { patch: () => ({ token_hash: "stolen" }) },
  remove: ["studentA"],
  insert: {
    row: (w, n) => ({ group_id: w.groupId, user_id: w.ids.studentA, token_hash: hex64(`d${n}`) }),
    allowed: ["studentA"],
  },
});
