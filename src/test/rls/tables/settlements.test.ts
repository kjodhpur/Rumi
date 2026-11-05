import { rlsTable, seedRow } from "../harness";
import { MEMBERS } from "../fixtures";

// Members read; only the payer records a payment, between members.
rlsTable("settlements", {
  seed: (w, db) =>
    seedRow(db, "settlements", {
      group_id: w.groupId,
      payer_id: w.ids.studentA,
      receiver_id: w.ids.studentC,
      amount_cents: 500,
    }),
  read: MEMBERS,
  update: { patch: () => ({ amount_cents: 1 }) },
  insert: {
    row: (w) => ({
      group_id: w.groupId,
      payer_id: w.ids.studentA,
      receiver_id: w.ids.studentC,
      amount_cents: 300,
    }),
    allowed: ["studentA"],
  },
});
