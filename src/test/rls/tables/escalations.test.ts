import { rlsTable, seedRow } from "../harness";

rlsTable("escalations", {
  seed: (w, db) => seedRow(db, "escalations", { school_id: w.school, category: "general" }),
  read: ["housingAdmin", "moderator"],
  // Forwarding and closing go through the audited safety actions (no UPDATE grant).
  update: { patch: () => ({ status: "closed" }) },
  insert: { row: (w) => ({ school_id: w.school, category: "threat" }) },
});
