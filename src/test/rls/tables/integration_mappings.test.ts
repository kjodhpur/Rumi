import { rlsTable, seedRow } from "../harness";
import { HA } from "../fixtures";

rlsTable("integration_mappings", {
  seed: (w, db) =>
    seedRow(
      db,
      "integration_mappings",
      { school_id: w.school, provider: "starrez", direction: "export", mapping: {} },
      ["school_id", "provider", "direction"],
    ),
  read: HA,
  update: { patch: () => ({ mapping: { tampered: true } }) },
  insert: {
    row: (w) => ({
      school_id: w.otherSchool,
      provider: "starrez",
      direction: "export",
      mapping: {},
    }),
  },
  keyOf: (row) => ({ school_id: row.school_id, provider: row.provider, direction: row.direction }),
});
