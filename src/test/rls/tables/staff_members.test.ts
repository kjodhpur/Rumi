import { rlsTable, seedRow } from "../harness";
import { LEADS, cleanupFresh, freshUser } from "../fixtures";

// Leads see the team; nobody grants a role through the API (invites go through actions).
rlsTable("staff_members", {
  seed: async (w, db, n) =>
    seedRow(
      db,
      "staff_members",
      { user_id: await freshUser(db, w, n), school_id: w.school, role: "analyst", scopes: {} },
      ["user_id", "school_id"],
    ),
  read: LEADS,
  update: { patch: () => ({ role: "housing_admin" }) },
  insert: {
    row: async (w, n, db) => ({
      user_id: await freshUser(db, w, n),
      school_id: w.school,
      role: "housing_admin",
      scopes: {},
    }),
  },
  keyOf: (row) => ({ user_id: row.user_id, school_id: row.school_id }),
  cleanup: (_w, db) => cleanupFresh(db),
});
