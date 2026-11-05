import { rlsTable, seedRow } from "../harness";
import { future, hex64 } from "../fixtures";

// The owner creates and revokes links; the family page reads with the service role.
rlsTable("family_shares", {
  seed: (w, db, n) =>
    seedRow(db, "family_shares", {
      user_id: w.ids.studentA,
      token_hash: hex64(`f${n}`),
      expires_at: future(),
    }),
  read: ["studentA"],
  // The owner may only revoke (a column grant on revoked_at, and the policy requires it set).
  update: { patch: () => ({ revoked_at: new Date().toISOString() }), allowed: ["studentA"] },
  insert: {
    row: (w, n) => ({ user_id: w.ids.studentA, token_hash: hex64(`e${n}`), expires_at: future() }),
    allowed: ["studentA"],
  },
});
