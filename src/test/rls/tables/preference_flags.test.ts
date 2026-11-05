import { rlsTable, seedRow } from "../harness";

rlsTable("preference_flags", {
  seed: (w, db, n) =>
    seedRow(db, "preference_flags", { user_id: w.ids.studentA, rule_key: `r_${n}` }),
  read: ["studentA"],
  update: { patch: () => ({ rule_key: "renamed" }), allowed: ["studentA"] },
  insert: {
    row: (w, n) => ({ user_id: w.ids.studentA, rule_key: `i_${n}` }),
    allowed: ["studentA"],
  },
});
