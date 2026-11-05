import { rlsTable, seedRow } from "../harness";
import { HA, cleanupFresh, freshUser } from "../fixtures";

// Accommodations are read by admins (and accommodation-scoped staff), never by peers or the RA.
rlsTable("accommodation_constraints", {
  seed: async (w, db) => {
    await db
      .from("accommodation_types")
      .upsert({ school_id: w.school, key: "single_bathroom", label: "Single bathroom" });
    return seedRow(db, "accommodation_constraints", {
      school_id: w.school,
      user_id: w.ids.studentA,
      constraint_key: "single_bathroom",
    });
  },
  read: HA,
  update: { patch: () => ({ constraint_key: "single_bathroom" }) },
  insert: {
    row: async (w, n, db) => ({
      school_id: w.school,
      user_id: await freshUser(db, w, n),
      constraint_key: "single_bathroom",
    }),
  },
  cleanup: async (w, db) => {
    await cleanupFresh(db);
    await db
      .from("accommodation_types")
      .delete()
      .eq("school_id", w.school)
      .eq("key", "single_bathroom");
  },
});
