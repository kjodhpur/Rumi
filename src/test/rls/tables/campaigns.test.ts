import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

rlsTable("campaigns", {
  seed: (w, db) => seedRow(db, "campaigns", { school_id: w.school }),
  read: LEADS,
  update: { patch: () => ({ school_id: "elsewhere" }) },
  insert: { row: (w) => ({ school_id: w.school }) },
});
