import { rlsTable, seedRow } from "../harness";
import { LEADS_ANALYST } from "../fixtures";

rlsTable("pilot_cohorts", {
  seed: (w, db, n) =>
    seedRow(db, "pilot_cohorts", { school_id: w.school, name: `C ${n}`, arm: "rumi" }),
  read: LEADS_ANALYST,
  update: { patch: () => ({ arm: "control" }) },
  insert: { row: (w, n) => ({ school_id: w.school, name: `I ${n}`, arm: "rumi" }) },
});
