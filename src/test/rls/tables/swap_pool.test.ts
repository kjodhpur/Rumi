import { rlsTable, seedRow } from "../harness";
import { LEADS, cleanupFresh, cleanupTracked, freshUser, track } from "../fixtures";

// Joining goes through join_swap_pool; the student can leave. studentB's entry, so its open
// room-change request doesn't collide with the one room_change_requests seeds for studentA.
rlsTable("swap_pool", {
  seed: async (w, db) => {
    const request = track(
      "room_change_requests",
      await seedRow(db, "room_change_requests", { school_id: w.school, user_id: w.ids.studentB }),
    );
    return seedRow(
      db,
      "swap_pool",
      {
        user_id: w.ids.studentB,
        school_id: w.school,
        assignment_id: w.assignmentId,
        request_id: request.id,
      },
      ["user_id"],
    );
  },
  read: [...LEADS, "studentB"],
  remove: ["studentB"],
  insert: {
    row: async (w, n, db) => {
      const user = await freshUser(db, w, n);
      const assignment = await seedRow(db, "assignments", {
        user_id: user,
        school_id: w.school,
        building: "Hall A",
        moved_in_at: "2027-08-16",
      });
      const request = track(
        "room_change_requests",
        await seedRow(db, "room_change_requests", { school_id: w.school, user_id: user }),
      );
      return {
        user_id: user,
        school_id: w.school,
        assignment_id: assignment.id,
        request_id: request.id,
      };
    },
  },
  keyOf: (row) => ({ user_id: row.user_id }),
  cleanup: async (_w, db) => {
    await cleanupTracked(db);
    await cleanupFresh(db);
  },
});
