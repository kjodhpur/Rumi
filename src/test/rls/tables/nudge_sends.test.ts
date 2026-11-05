import { rlsTable, seedRow } from "../harness";

// The send log only keeps nudges idempotent: server-only.
rlsTable("nudge_sends", {
  seed: async (w, db) => {
    const rule = await seedRow(db, "nudge_rules", {
      school_id: w.school,
      deadline_key: "agreementDue",
    });
    return seedRow(db, "nudge_sends", {
      rule_id: rule.id,
      user_id: w.ids.studentA,
      deadline_on: "2027-09-01",
      offset_days: 3,
    });
  },
  read: [],
  update: { patch: () => ({ offset_days: 1 }) },
  insert: {
    row: async (w, _n, db) => {
      const { data } = await db
        .from("nudge_rules")
        .select("id")
        .eq("school_id", w.school)
        .eq("deadline_key", "agreementDue")
        .single();
      return {
        rule_id: data!.id,
        user_id: w.ids.studentB,
        deadline_on: "2027-09-01",
        offset_days: 3,
      };
    },
  },
  cleanup: async (w, db) => {
    await db
      .from("nudge_rules")
      .delete()
      .eq("school_id", w.school)
      .eq("deadline_key", "agreementDue");
  },
});
