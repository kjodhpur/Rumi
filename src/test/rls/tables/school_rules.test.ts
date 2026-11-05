import { rlsTable, seedRow } from "../harness";
import { LEADS_ANALYST, SCHOOL, STUDENTS } from "../fixtures";

// The school's students and staff read its rules; changes go through actions.
rlsTable("school_rules", {
  seed: (w, db) =>
    seedRow(db, "school_rules", { school_id: w.school, rule_type: "same_academic_college" }),
  read: SCHOOL,
  update: { patch: () => ({ rule_type: "llc_exclusive" }) },
  insert: { row: (w) => ({ school_id: w.otherSchool, rule_type: "same_academic_college" }) },
});
