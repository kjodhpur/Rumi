import { rlsTable, seedRow } from "../harness";
import { MEMBERS, cleanupTracked, track } from "../fixtures";

rlsTable("chore_instances", {
  seed: async (w, db, n) => {
    const chore = track(
      "chores",
      await seedRow(db, "chores", {
        group_id: w.groupId,
        title: `Dishes ${n}`,
        cadence: "daily",
      }),
    );
    return seedRow(db, "chore_instances", {
      chore_id: chore.id,
      group_id: w.groupId,
      assignee_id: w.ids.studentA,
      due_on: "2027-09-01",
    });
  },
  read: MEMBERS,
  update: { patch: () => ({ completed_at: new Date().toISOString() }) },
  insert: {
    row: async (w, n, db) => {
      const chore = track(
        "chores",
        await seedRow(db, "chores", {
          group_id: w.groupId,
          title: `I ${n}`,
          cadence: "daily",
        }),
      );
      return {
        chore_id: chore.id,
        group_id: w.groupId,
        assignee_id: w.ids.studentC,
        due_on: "2027-09-02",
      };
    },
  },
  cleanup: (_w, db) => cleanupTracked(db),
});
