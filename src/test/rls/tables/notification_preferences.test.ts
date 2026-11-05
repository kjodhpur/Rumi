import { rlsTable, seedRow } from "../harness";

rlsTable("notification_preferences", {
  seed: async (w, db) => {
    await db
      .from("notification_preferences")
      .delete()
      .eq("user_id", w.ids.studentA)
      .eq("kind", "agreements");
    return seedRow(
      db,
      "notification_preferences",
      { user_id: w.ids.studentA, kind: "agreements" },
      ["user_id", "kind"],
    );
  },
  read: ["studentA"],
  update: { patch: () => ({ email: false }), allowed: ["studentA"] },
  insert: {
    row: async (w, _n, db) => {
      await db
        .from("notification_preferences")
        .delete()
        .eq("user_id", w.ids.studentA)
        .eq("kind", "agreements");
      return { user_id: w.ids.studentA, kind: "agreements" };
    },
    allowed: ["studentA"],
  },
  keyOf: (row) => ({ user_id: row.user_id, kind: row.kind }),
});
