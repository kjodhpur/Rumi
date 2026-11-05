import { rlsTable, seedRow } from "../harness";
import { MEMBERS } from "../fixtures";

// Members comment on a draft as themselves, read the group's comments, and delete their own.
rlsTable("agreement_comments", {
  seed: (w, db) =>
    seedRow(db, "agreement_comments", {
      agreement_id: w.agreementId,
      section_key: "quiet_hours",
      body: "Can we do 11?",
      author_id: w.ids.studentA,
    }),
  read: MEMBERS,
  remove: ["studentA"],
  insert: {
    // Written as studentA: only studentA may post it (C can't comment in A's name).
    row: (w) => ({
      agreement_id: w.agreementId,
      section_key: "guests",
      body: "Weekends only?",
      author_id: w.ids.studentA,
    }),
    allowed: ["studentA"],
  },
});
