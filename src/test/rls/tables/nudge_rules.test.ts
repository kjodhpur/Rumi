import { rlsTable, seedRow } from "../harness";
import { LEADS_ANALYST } from "../fixtures";

rlsTable("nudge_rules", {
  seed: (w, db) =>
    seedRow(db, "nudge_rules", { school_id: w.school, deadline_key: "roommateRequest" }),
  read: LEADS_ANALYST,
  update: { patch: () => ({ paused: true }) },
  insert: { row: (w) => ({ school_id: w.otherSchool, deadline_key: "roommateRequest" }) },
});
