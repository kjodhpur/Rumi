import { rlsTable, seedRow } from "../harness";
import { freshTerm } from "../fixtures";

// Private answers: housing only ever sees suppressed totals.
rlsTable("outcome_surveys", {
  seed: (w, db) =>
    seedRow(db, "outcome_surveys", {
      user_id: w.ids.studentA,
      school_id: w.school,
      term_id: w.termId,
      room_again: "yes",
      score: 4,
    }),
  read: ["studentA"],
  update: { patch: () => ({ score: 1 }) },
  insert: {
    row: async (w, n, db) => ({
      user_id: w.ids.studentA,
      school_id: w.school,
      term_id: await freshTerm(db, w, n),
      room_again: "no",
      score: 2,
    }),
  },
  cleanup: async (w, db) => {
    await db.from("terms").delete().eq("school_id", w.school).like("name", "RLSX %");
  },
});
