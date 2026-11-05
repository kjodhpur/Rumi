import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

rlsTable("auto_pair_runs", {
  seed: (w, db) => seedRow(db, "auto_pair_runs", { school_id: w.school }),
  read: LEADS,
  insert: { row: (w) => ({ school_id: w.school }) },
});
