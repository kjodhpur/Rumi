import { rlsTable, seedRow } from "../harness";
import { MEMBERS, cleanupTracked, track } from "../fixtures";

rlsTable("expense_splits", {
  seed: async (w, db, n) => {
    const expense = track(
      "expenses",
      await seedRow(db, "expenses", {
        group_id: w.groupId,
        payer_id: w.ids.studentA,
        amount_cents: 1000,
        description: `Split ${n}`,
      }),
    );
    return seedRow(
      db,
      "expense_splits",
      {
        expense_id: expense.id,
        user_id: w.ids.studentC,
        share_cents: 500,
      },
      ["expense_id", "user_id"],
    );
  },
  read: MEMBERS,
  keyOf: (row) => ({ expense_id: row.expense_id, user_id: row.user_id }),
  update: { patch: () => ({ share_cents: 0 }) },
  insert: {
    row: async (w, n, db) => {
      const expense = track(
        "expenses",
        await seedRow(db, "expenses", {
          group_id: w.groupId,
          payer_id: w.ids.studentA,
          amount_cents: 1000,
          description: `I ${n}`,
        }),
      );
      return { expense_id: expense.id, user_id: w.ids.studentA, share_cents: 1000 };
    },
  },
  cleanup: (_w, db) => cleanupTracked(db),
});
