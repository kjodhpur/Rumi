import { rlsTable, seedRow } from "../harness";
import { HA } from "../fixtures";

// Append-only from the server: admins read their school's log, nobody edits or forges it.
rlsTable("audit_log", {
  seed: (w, db, n) =>
    seedRow(db, "audit_log", { school_id: w.school, action: `rls_${n}`, entity: "test" }),
  read: HA,
  update: { patch: () => ({ action: "tampered" }) },
  insert: { row: (w, n) => ({ school_id: w.school, action: `forged_${n}`, entity: "test" }) },
});
