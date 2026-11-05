import { rlsTable, seedRow } from "../harness";
import { SCHOOL, letters } from "../fixtures";

rlsTable("room_change_reasons", {
  seed: (w, db, n) =>
    seedRow(
      db,
      "room_change_reasons",
      { school_id: w.school, key: letters(`k_${n}`), label: "Noise" },
      ["school_id", "key"],
    ),
  read: SCHOOL,
  update: { patch: () => ({ label: "Edited" }) },
  insert: { row: (w, n) => ({ school_id: w.school, key: letters(`i_${n}`), label: "Forged" }) },
  keyOf: (row) => ({ school_id: row.school_id, key: row.key }),
});
