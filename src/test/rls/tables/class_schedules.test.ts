import { rlsTable, seedRow } from "../harness";
import { cleanupFresh, freshUser } from "../fixtures";

rlsTable("class_schedules", {
  seed: (w, db) =>
    seedRow(db, "class_schedules", { user_id: w.ids.studentA, source: "manual" }, ["user_id"]),
  read: ["studentA"],
  update: { patch: () => ({ source: "ics" }) },
  insert: { row: async (w, n, db) => ({ user_id: await freshUser(db, w, n), source: "manual" }) },
  keyOf: (row) => ({ user_id: row.user_id }),
  cleanup: (_w, db) => cleanupFresh(db),
});
