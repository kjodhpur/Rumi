import { rlsTable, seedRow } from "../harness";

// Either side reads or removes a connection; making one goes through a request.
rlsTable("connections", {
  seed: (w, db) =>
    seedRow(db, "connections", {
      user_a: w.ids.studentA,
      user_b: w.ids.studentB,
      status: "confirmed",
      source: "in_app",
    }),
  read: ["studentA", "studentB"],
  update: { patch: () => ({ status: "pending" }) },
  remove: ["studentA", "studentB"],
  insert: {
    row: (w) => ({
      user_a: w.ids.studentA,
      user_b: w.ids.studentC,
      status: "confirmed",
      source: "in_app",
    }),
  },
});
