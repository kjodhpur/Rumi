import { rlsTable, seedRow } from "../harness";
import { cleanupFresh, freshUser } from "../fixtures";

// A student reads their own consents; granting and revoking go through audited actions.
rlsTable("consents", {
  seed: (w, db, n) =>
    seedRow(db, "consents", {
      user_id: w.ids.studentA,
      school_id: w.school,
      kind: "family_view",
      version: `v-${n}`,
    }),
  read: ["studentA"],
  update: { patch: () => ({ revoked_at: new Date().toISOString() }) },
  insert: {
    row: async (w, n, db) => ({
      user_id: await freshUser(db, w, n),
      school_id: w.school,
      kind: "family_view",
      version: `v-${n}`,
    }),
  },
  cleanup: (_w, db) => cleanupFresh(db),
});
