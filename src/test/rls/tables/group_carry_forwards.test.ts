import { rlsTable, seedRow } from "../harness";
import type { Admin, World } from "../world";

const terms: string[] = [];

/** A term of this file's own, so other files' cleanups never remove it mid-test. */
async function term(db: Admin, w: World, n: string) {
  const { data, error } = await db
    .from("terms")
    .insert({
      school_id: w.school,
      name: `RLSG ${n}`,
      starts_on: "2030-01-10",
      ends_on: "2030-05-10",
      active: false,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`term: ${error?.message}`);
  terms.push(data.id);
  return data.id;
}

// "Keep this group next year?" answers: the group reads them; answering goes through an action.
rlsTable("group_carry_forwards", {
  seed: (w, db) =>
    seedRow(
      db,
      "group_carry_forwards",
      { group_id: w.groupId, term_id: w.termId, user_id: w.ids.studentA, keep: true },
      ["group_id", "term_id", "user_id"],
    ),
  read: ["studentA", "studentC"],
  keyOf: (row) => ({ group_id: row.group_id, term_id: row.term_id, user_id: row.user_id }),
  insert: {
    row: async (w, n, db) => ({
      group_id: w.groupId,
      term_id: await term(db, w, n),
      user_id: w.ids.studentA,
      keep: false,
    }),
  },
  cleanup: async (_w, db) => {
    if (terms.length) await db.from("terms").delete().in("id", terms);
  },
});
