import { rlsTable, seedRow } from "../harness";
import { HA } from "../fixtures";

// The school's accommodation list: read by whoever manages accommodations, changed by actions.
rlsTable("accommodation_types", {
  seed: (w, db) =>
    seedRow(
      db,
      "accommodation_types",
      { school_id: w.school, key: "ground_floor", label: "Ground floor" },
      ["school_id", "key"],
    ),
  read: HA,
  keyOf: (row) => ({ school_id: row.school_id, key: row.key }),
  insert: { row: (w) => ({ school_id: w.school, key: "allergen_free", label: "Allergen-free" }) },
});
