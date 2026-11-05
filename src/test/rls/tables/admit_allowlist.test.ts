import { rlsTable, seedRow } from "../harness";
import { LEADS, hex64 } from "../fixtures";

rlsTable("admit_allowlist", {
  seed: (w, db, n) =>
    seedRow(db, "admit_allowlist", { school_id: w.school, email_hash: hex64(`a${n}`) }),
  read: LEADS,
  update: { patch: () => ({ email_hash: hex64("ff") }) },
  insert: { row: (w, n) => ({ school_id: w.school, email_hash: hex64(`b${n}`) }) },
});
