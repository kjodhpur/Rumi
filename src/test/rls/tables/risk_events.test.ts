import { rlsTable, seedRow } from "../harness";

rlsTable("risk_events", {
  seed: (w, db) =>
    seedRow(db, "risk_events", {
      user_id: w.ids.studentA,
      assignment_id: w.assignmentId,
      level: "low",
    }),
  read: ["studentA"],
  update: { patch: () => ({ level: "high" }) },
  insert: {
    row: (w) => ({ user_id: w.ids.studentA, assignment_id: w.assignmentId, level: "high" }),
  },
});
