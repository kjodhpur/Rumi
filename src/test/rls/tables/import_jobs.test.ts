import { rlsTable, seedRow } from "../harness";
import { HA } from "../fixtures";

rlsTable("import_jobs", {
  seed: (w, db) =>
    seedRow(db, "import_jobs", { school_id: w.school, kind: "assignments", status: "completed" }),
  read: HA,
  update: { patch: () => ({ status: "undone" }) },
  insert: { row: (w) => ({ school_id: w.school, kind: "assignments", status: "completed" }) },
});
