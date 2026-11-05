import { rlsTable, seedRow } from "../harness";
import { HA, LEADS_ANALYST, SCHOOL, STUDENTS } from "../fixtures";

rlsTable("tracks", {
  seed: (w, db) =>
    seedRow(db, "tracks", { school_id: w.school, key: "transfer", label: "Transfer students" }),
  read: SCHOOL,
  update: { patch: () => ({ label: "Edited" }), allowed: HA },
  // An admin adds tracks only at their own school.
  insert: {
    row: (w) => ({ school_id: w.otherSchool, key: "transfer", label: "Transfer" }),
    allowed: ["otherAdmin"],
  },
});
