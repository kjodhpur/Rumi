import { rlsTable, seedRow } from "../harness";
import { LEADS, SCHOOL, STUDENTS } from "../fixtures";

let counter = 100;
const version = (n: string) => counter++ + n.length * 1000;

rlsTable("agreement_templates", {
  seed: (w, db, n) =>
    seedRow(db, "agreement_templates", { school_id: w.school, version: version(n), sections: [] }, [
      "school_id",
      "version",
    ]),
  read: SCHOOL,
  update: { patch: () => ({ sections: [{ key: "tampered" }] }) },
  insert: { row: (w, n) => ({ school_id: w.school, version: version(n), sections: [] }) },
  keyOf: (row) => ({ school_id: row.school_id, version: row.version }),
});
