import { rlsTable, seedRow } from "../harness";
import { LEADS, cleanupTracked, track } from "../fixtures";

// Leads see every proposal; the two students see theirs once it's sent.
rlsTable("auto_pair_proposals", {
  seed: async (w, db) => {
    const run = track(
      "auto_pair_runs",
      await seedRow(db, "auto_pair_runs", { school_id: w.school }),
    );
    return seedRow(db, "auto_pair_proposals", {
      run_id: run.id,
      school_id: w.school,
      member_ids: [w.ids.studentA, w.ids.studentB],
      score: 80,
      status: "sent",
    });
  },
  read: [...LEADS, "studentA", "studentB"],
  update: { patch: () => ({ status: "accepted" }) },
  insert: {
    row: async (w, _n, db) => {
      const run = track(
        "auto_pair_runs",
        await seedRow(db, "auto_pair_runs", { school_id: w.school }),
      );
      return {
        run_id: run.id,
        school_id: w.school,
        member_ids: [w.ids.studentA, w.ids.studentC],
        score: 99,
      };
    },
  },
  cleanup: (_w, db) => cleanupTracked(db),
});
