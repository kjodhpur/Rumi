import { rlsTable, seedRow } from "../harness";

// Subscribing goes through the server; the owner reads and removes their own.
rlsTable("push_subscriptions", {
  seed: (w, db, n) =>
    seedRow(db, "push_subscriptions", {
      user_id: w.ids.studentA,
      endpoint: `https://push.example.test/${n}`,
      p256dh: "key",
      auth: "auth",
    }),
  read: ["studentA"],
  update: { patch: () => ({ endpoint: "https://attacker.test/x" }) },
  remove: ["studentA"],
  insert: {
    row: (w, n) => ({
      user_id: w.ids.studentA,
      endpoint: `https://push.example.test/i${n}`,
      p256dh: "key",
      auth: "auth",
    }),
  },
});
