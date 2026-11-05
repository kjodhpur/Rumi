import { rlsTable, seedRow } from "../harness";
import { LEADS, cleanupFresh, freshCase } from "../fixtures";

// Case notes follow the case's visibility; staff write them through the RA workspace actions.
rlsTable("ra_case_notes", {
  seed: async (w, db, n) =>
    seedRow(db, "ra_case_notes", {
      case_id: await freshCase(db, w, n),
      author_id: w.ids.ra,
      body: "Talked with both roommates.",
    }),
  read: [...LEADS, "ra"],
  insert: {
    row: async (w, n, db) => ({
      case_id: await freshCase(db, w, n),
      author_id: w.ids.ra,
      body: "Forged",
    }),
  },
  cleanup: (_w, db) => cleanupFresh(db),
});
