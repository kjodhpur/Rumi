import { rlsTable, seedRow } from "../harness";
import { HA, SCHOOL, STUDENTS } from "../fixtures";

// Students see where active reports go; admins manage routes.
rlsTable("escalation_routes", {
  seed: (w, db, n) =>
    seedRow(db, "escalation_routes", {
      school_id: w.school,
      category: "general",
      destination_label: `Office ${n}`,
      active: true,
    }),
  // Every profile at the school sees active routes; admins also see inactive ones. Changes go
  // through the audited route actions (no write grants), so nobody writes directly.
  read: SCHOOL,
  update: { patch: () => ({ destination_label: "Changed" }) },
  insert: {
    row: (w, n) => ({
      school_id: w.school,
      category: "threat",
      destination_label: `New ${n}`,
      active: true,
    }),
  },
});
