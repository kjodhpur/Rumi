import { rlsTable } from "../harness";
import { LEADS, cleanupFresh, freshAssignment, freshCase } from "../fixtures";

// Staff in scope see a case only when the student shared check-ins or asked for help.
rlsTable("ra_cases", {
  seed: async (w, db, n) => ({ id: await freshCase(db, w, n) }),
  read: [...LEADS, "ra"],
  insert: {
    row: async (w, n, db) => {
      const { assignmentId, userId } = await freshAssignment(db, w, n);
      return {
        school_id: w.school,
        assignment_id: assignmentId,
        user_id: userId,
        building: "Hall A",
      };
    },
  },
  cleanup: (_w, db) => cleanupFresh(db),
});
