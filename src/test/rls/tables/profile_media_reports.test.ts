import { rlsTable, seedRow } from "../harness";
import { cleanupFresh, freshUser } from "../fixtures";
import type { Admin, World } from "../world";

/** A fresh student's intro clip, so this file never touches studentA's. */
async function clip(db: Admin, w: World, n: string) {
  const owner = await freshUser(db, w, n);
  await seedRow(
    db,
    "profile_media",
    {
      user_id: owner,
      kind: "audio",
      path: `${owner}/m-${n}.webm`,
      mime_type: "audio/webm",
      size_bytes: 100,
      duration_s: 5,
      transcript: "Hi there",
      status: "active",
    },
    ["user_id"],
  );
  return owner;
}

// Reports on intro clips: filed and reviewed through actions; nobody reads them over the API.
rlsTable("profile_media_reports", {
  seed: async (w, db, n) =>
    seedRow(
      db,
      "profile_media_reports",
      { media_user_id: await clip(db, w, n), reporter_id: w.ids.studentB, reason: "spam" },
      ["media_user_id", "reporter_id"],
    ),
  read: [],
  update: { patch: () => ({ reason: "other" }) },
  keyOf: (row) => ({ media_user_id: row.media_user_id, reporter_id: row.reporter_id }),
  insert: {
    row: async (w, n, db) => ({
      media_user_id: await clip(db, w, n),
      reporter_id: w.ids.studentB,
      reason: "other",
    }),
  },
  cleanup: (_w, db) => cleanupFresh(db),
});
