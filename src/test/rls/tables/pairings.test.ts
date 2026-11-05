import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

rlsTable("pairings", {
  seed: (w, db) => seedRow(db, "pairings", { school_id: w.school }),
  read: LEADS,
  update: { patch: () => ({ status: "approved" }) },
  insert: { row: (w) => ({ school_id: w.school }) },
});
