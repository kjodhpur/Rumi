import { rlsTable, seedRow } from "../harness";
import { STUDENTS } from "../fixtures";

// Visible to whoever can see the profile (same-school students); owner writes.
rlsTable("social_links", {
  seed: (w, db, n) =>
    seedRow(db, "social_links", {
      user_id: w.ids.studentA,
      platform: "instagram",
      handle: `h${n}`,
    }),
  read: STUDENTS,
  update: { patch: () => ({ handle: "renamed" }), allowed: ["studentA"] },
  remove: ["studentA"],
  insert: {
    row: (w, n) => ({ user_id: w.ids.studentA, platform: "instagram", handle: `i${n}` }),
    allowed: ["studentA"],
  },
});
