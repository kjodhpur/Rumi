import { rlsTable, seedRow } from "../harness";
import { cleanupFresh, freshUser } from "../fixtures";

rlsTable("calendar_accounts", {
  seed: (w, db) =>
    seedRow(
      db,
      "calendar_accounts",
      { user_id: w.ids.studentA, provider: "google", access_token_enc: "enc" },
      ["user_id", "provider"],
    ),
  read: ["studentA"],
  update: { patch: () => ({ access_token_enc: "stolen" }) },
  insert: {
    row: async (w, n, db) => ({
      user_id: await freshUser(db, w, n),
      provider: "google",
      access_token_enc: "enc",
    }),
  },
  keyOf: (row) => ({ user_id: row.user_id, provider: row.provider }),
  cleanup: (_w, db) => cleanupFresh(db),
});
