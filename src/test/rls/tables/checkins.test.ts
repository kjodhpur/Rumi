import { rlsTable, seedRow } from "../harness";

// Private to the student; RAs see shared ones only through consent-checked functions.
rlsTable("checkins", {
  seed: (w, db) =>
    seedRow(db, "checkins", {
      assignment_id: w.assignmentId,
      user_id: w.ids.studentA,
      due_on: "2027-09-01",
    }),
  read: ["studentA"],
  update: { patch: () => ({ score: 5 }) },
  insert: {
    row: (w) => ({ assignment_id: w.assignmentId, user_id: w.ids.studentA, due_on: "2027-09-15" }),
  },
});
