import { rlsTable, seedRow } from "../harness";
import { LEADS_ANALYST } from "../fixtures";

rlsTable("weight_models", {
  seed: (w, db) =>
    seedRow(db, "weight_models", {
      school_id: w.school,
      coefficients: {},
      metrics: {},
      status: "suggested",
    }),
  read: LEADS_ANALYST,
  update: { patch: () => ({ status: "adopted" }) },
  insert: {
    row: (w) => ({ school_id: w.school, coefficients: {}, metrics: {}, status: "suggested" }),
  },
});
