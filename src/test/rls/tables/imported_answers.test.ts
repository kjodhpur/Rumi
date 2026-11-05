import { rlsTable, seedRow } from "../harness";

// The student sees what was imported for them; staff import with the service role.
rlsTable("imported_answers", {
  seed: (w, db, n) =>
    seedRow(db, "imported_answers", {
      school_id: w.school,
      user_id: w.ids.studentA,
      question_code: `Q${n}`,
      raw_value: "Night owl",
      mapped_factor: "noise",
      mapped_value: "3",
    }),
  read: ["studentA"],
  update: { patch: () => ({ mapped_value: "5" }) },
  insert: {
    row: (w, n) => ({
      school_id: w.school,
      user_id: w.ids.studentA,
      question_code: `I${n}`,
      raw_value: "x",
      mapped_factor: "cleanliness",
      mapped_value: "1",
    }),
  },
});
