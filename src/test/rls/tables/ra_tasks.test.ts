import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

// Staff in scope see tasks on a case the student shared or asked for help with.
rlsTable("ra_tasks", {
  seed: async (w, db) => {
    // A case the RA can see: in their building, and the student asked for help.
    await seedRow(db, "checkins", {
      assignment_id: w.assignmentId,
      user_id: w.ids.studentA,
      due_on: "2027-09-02",
      ask_ra: true,
    });
    const raCase = await seedRow(db, "ra_cases", {
      school_id: w.school,
      assignment_id: w.assignmentId,
      user_id: w.ids.studentA,
      building: "Hall A",
    });
    return seedRow(db, "ra_tasks", { case_id: raCase.id, title: "Follow up" });
  },
  read: [...LEADS, "ra"],
  update: { patch: () => ({ title: "Edited" }) },
  insert: {
    row: async (w, _n, db) => {
      const { data } = await db
        .from("ra_cases")
        .select("id")
        .eq("school_id", w.school)
        .limit(1)
        .single();
      return { case_id: data!.id, title: "Forged" };
    },
  },
  cleanup: async (w, db) => {
    await db.from("ra_cases").delete().eq("school_id", w.school);
    await db
      .from("checkins")
      .delete()
      .eq("assignment_id", w.assignmentId)
      .eq("due_on", "2027-09-02");
  },
});
