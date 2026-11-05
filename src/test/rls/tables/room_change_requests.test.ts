import { rlsTable, seedRow } from "../harness";

// A student sees their own request; staff read through audited functions.
rlsTable("room_change_requests", {
  seed: (w, db) =>
    seedRow(db, "room_change_requests", { school_id: w.school, user_id: w.ids.studentA }),
  read: ["studentA"],
  update: { patch: () => ({ status: "moved" }) },
  insert: { row: (w) => ({ school_id: w.school, user_id: w.ids.studentA, status: "closed" }) },
});
