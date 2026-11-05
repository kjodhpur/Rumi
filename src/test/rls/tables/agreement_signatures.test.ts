import { rlsTable, seedRow } from "../harness";
import { MEMBERS, cleanupFresh, freshUser } from "../fixtures";

// The group reads who signed; signing goes through the agreement action, never the API.
rlsTable("agreement_signatures", {
  seed: (w, db) =>
    seedRow(
      db,
      "agreement_signatures",
      { agreement_id: w.agreementId, user_id: w.ids.studentA, version: 1, typed_name: "Rls A" },
      ["agreement_id", "user_id"],
    ),
  read: MEMBERS,
  keyOf: (row) => ({ agreement_id: row.agreement_id, user_id: row.user_id }),
  insert: {
    row: async (w, n, db) => ({
      agreement_id: w.agreementId,
      user_id: await freshUser(db, w, n),
      version: 1,
      typed_name: "Forged",
    }),
  },
  cleanup: (_w, db) => cleanupFresh(db),
});
