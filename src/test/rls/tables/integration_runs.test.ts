import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

rlsTable("integration_runs", {
  seed: (w, db) =>
    seedRow(db, "integration_runs", {
      school_id: w.school,
      provider: "starrez",
      action: "test",
      status: "success",
    }),
  read: LEADS,
  update: { patch: () => ({ status: "failed" }) },
  insert: {
    row: (w) => ({ school_id: w.school, provider: "starrez", action: "test", status: "success" }),
  },
});
