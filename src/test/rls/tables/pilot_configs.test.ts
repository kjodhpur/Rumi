import { rlsTable, seedRow } from "../harness";
import { LEADS_ANALYST } from "../fixtures";

rlsTable("pilot_configs", {
  seed: (w, db) =>
    seedRow(
      db,
      "pilot_configs",
      { school_id: w.school, starts_on: "2027-08-01", ends_on: "2027-12-01" },
      ["school_id"],
    ),
  read: LEADS_ANALYST,
  update: { patch: () => ({ ends_on: "2030-01-01" }) },
  insert: {
    row: (w) => ({ school_id: w.otherSchool, starts_on: "2027-08-01", ends_on: "2027-12-01" }),
  },
  keyOf: (row) => ({ school_id: row.school_id }),
});
