import { rlsTable, seedRow } from "../harness";
import { STUDENTS, cleanupFresh, freshUser } from "../fixtures";

const media = (user: string, n: string) => ({
  user_id: user,
  kind: "audio",
  path: `${user}/m-${n}.webm`,
  mime_type: "audio/webm",
  size_bytes: 100,
  duration_s: 5,
  transcript: "Hi there",
  status: "active",
});

// Active clips are visible to whoever can see the profile; the owner deletes; uploads go through actions.
rlsTable("profile_media", {
  seed: (w, db, n) => seedRow(db, "profile_media", media(w.ids.studentA, n), ["user_id"]),
  read: STUDENTS,
  update: { patch: () => ({ status: "active", transcript: "Edited" }) },
  remove: ["studentA"],
  insert: { row: async (w, n, db) => media(await freshUser(db, w, n), n) },
  keyOf: (row) => ({ user_id: row.user_id }),
  cleanup: (_w, db) => cleanupFresh(db),
});
