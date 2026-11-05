import { rlsTable, seedRow } from "../harness";
import { HA, LEADS_ANALYST, SCHOOL, STUDENTS } from "../fixtures";

const question = (school: string, n: string) => ({
  school_id: school,
  key: `q_${n}`.slice(0, 40),
  kind: "scale",
  factor: "noise",
  stem: "How loud is your room on a Friday?",
  choices: [
    { key: "a", label: "Quiet" },
    { key: "b", label: "Lively" },
  ],
  is_active: true,
  reviewed_at: new Date().toISOString(),
});

// Staff read every question; the school's students only live, reviewed ones; admins write.
rlsTable("school_questions", {
  seed: (w, db, n) => seedRow(db, "school_questions", question(w.school, n)),
  read: SCHOOL,
  update: { patch: () => ({ stem: "Edited stem" }), allowed: HA },
  insert: { row: (w, n) => question(w.school, n), allowed: HA },
});
