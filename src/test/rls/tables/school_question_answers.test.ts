import { rlsTable, seedRow } from "../harness";

const answer = (user: string, n: string) => ({
  user_id: user,
  question_key: `q_${n}`,
  question_version: 1,
  choice_key: "a",
});

// A student's own answers: only they read and write them.
rlsTable("school_question_answers", {
  seed: (w, db, n) =>
    seedRow(db, "school_question_answers", answer(w.ids.studentA, n), ["user_id", "question_key"]),
  read: ["studentA"],
  update: { patch: () => ({ choice_key: "b" }), allowed: ["studentA"] },
  remove: ["studentA"],
  insert: { row: (w, n) => answer(w.ids.studentA, n), allowed: ["studentA"] },
  keyOf: (row) => ({ user_id: row.user_id, question_key: row.question_key }),
});
