import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

rlsTable("checkin_schedules", {
  seed: (w, db) => seedRow(db, "checkin_schedules", { school_id: w.school }, ["school_id"]),
  read: [...LEADS, "ra"],
  update: { patch: () => ({ offsets_days: [1] }) },
  insert: { row: (w) => ({ school_id: w.otherSchool }) },
  keyOf: (row) => ({ school_id: row.school_id }),
});
