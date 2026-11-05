import { rlsTable, seedRow } from "../harness";
import { cleanupFresh, freshUser } from "../fixtures";

// Which students were sent the end-of-term survey: server-only.
rlsTable("outcome_survey_sends", {
  seed: (w, db) =>
    seedRow(db, "outcome_survey_sends", { user_id: w.ids.studentA, term_id: w.termId }, [
      "user_id",
      "term_id",
    ]),
  read: [],
  keyOf: (row) => ({ user_id: row.user_id, term_id: row.term_id }),
  insert: { row: async (w, n, db) => ({ user_id: await freshUser(db, w, n), term_id: w.termId }) },
  cleanup: (_w, db) => cleanupFresh(db),
});
