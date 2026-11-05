import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

// Leads see every proposal; the students in it see it once staff approve.
rlsTable("swap_proposals", {
  seed: (w, db) =>
    seedRow(db, "swap_proposals", {
      school_id: w.school,
      cycle: [w.ids.studentA, w.ids.studentB],
      assignment_ids: [w.assignmentId, w.assignmentId],
      scores: {},
      status: "staff_approved",
    }),
  read: [...LEADS, "studentA", "studentB"],
  update: { patch: () => ({ status: "completed" }) },
  insert: {
    row: (w) => ({
      school_id: w.school,
      cycle: [w.ids.studentA, w.ids.studentC],
      assignment_ids: [w.assignmentId, w.assignmentId],
      scores: {},
      status: "staff_approved",
    }),
  },
});
