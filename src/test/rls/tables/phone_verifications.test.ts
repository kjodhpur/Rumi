import { rlsTable, seedRow } from "../harness";
import { cleanupFresh, freshUser, future, randomHex64 } from "../fixtures";

// Pending phone codes: server-only, including for the student whose phone it is.
rlsTable("phone_verifications", {
  seed: (w, db) =>
    seedRow(
      db,
      "phone_verifications",
      {
        user_id: w.ids.studentA,
        phone_enc: "v1:sealed",
        code_hash: randomHex64(),
        expires_at: future(1),
      },
      ["user_id"],
    ),
  read: [],
  update: { patch: () => ({ attempts: 0 }) },
  keyOf: (row) => ({ user_id: row.user_id }),
  insert: {
    row: async (w, n, db) => ({
      user_id: await freshUser(db, w, n),
      phone_enc: "v1:sealed",
      code_hash: randomHex64(),
      expires_at: future(1),
    }),
  },
  cleanup: (_w, db) => cleanupFresh(db),
});
