import { rlsTable, seedRow } from "../harness";

// The SMS log is server-only.
rlsTable("sms_messages", {
  seed: (w, db) =>
    seedRow(db, "sms_messages", {
      user_id: w.ids.studentA,
      direction: "outbound",
      kind: "deadline",
      body: "Reminder",
      status: "queued",
    }),
  read: [],
  update: { patch: () => ({ status: "sent" }) },
  insert: {
    row: (w) => ({
      user_id: w.ids.studentA,
      direction: "outbound",
      kind: "deadline",
      body: "x",
      status: "queued",
    }),
  },
});
