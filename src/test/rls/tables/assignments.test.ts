import { rlsTable, seedRow } from "../harness";

// A student sees their own room; staff read through consent-checked, audited functions.
rlsTable("assignments", {
  seed: (w, db) =>
    seedRow(db, "assignments", {
      user_id: w.ids.studentA,
      school_id: w.school,
      building: "Hall B",
      moved_in_at: "2027-08-20",
      closed_at: new Date().toISOString(),
    }),
  read: ["studentA"],
  update: { patch: () => ({ building: "Penthouse" }) },
  insert: {
    row: (w) => ({
      user_id: w.ids.studentA,
      school_id: w.school,
      building: "Hall C",
      moved_in_at: "2027-08-21",
      closed_at: new Date().toISOString(),
    }),
  },
});
