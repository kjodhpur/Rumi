import { rlsTable, seedRow } from "../harness";
import { MEMBERS } from "../fixtures";

// Members read; expenses are added through the add_expense function so splits sum.
rlsTable("expenses", {
  seed: (w, db, n) =>
    seedRow(db, "expenses", {
      group_id: w.groupId,
      payer_id: w.ids.studentA,
      amount_cents: 1200,
      description: `Groceries ${n}`,
    }),
  read: MEMBERS,
  update: { patch: () => ({ amount_cents: 1 }) },
  insert: {
    row: (w, n) => ({
      group_id: w.groupId,
      payer_id: w.ids.studentA,
      amount_cents: 99,
      description: `I ${n}`,
    }),
  },
});
