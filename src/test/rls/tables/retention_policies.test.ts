import { rlsTable, seedRow } from "../harness";
import { HA } from "../fixtures";

rlsTable("retention_policies", {
  seed: (w, db) =>
    seedRow(
      db,
      "retention_policies",
      { school_id: w.school, entity: "inactive_accounts", days: 365 },
      ["school_id", "entity"],
    ),
  read: HA,
  update: { patch: () => ({ days: 30 }) },
  insert: { row: (w) => ({ school_id: w.otherSchool, entity: "audit_log", days: 400 }) },
  keyOf: (row) => ({ school_id: row.school_id, entity: row.entity }),
});
