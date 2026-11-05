import { rlsTable, seedRow } from "../harness";
import { MEMBERS } from "../fixtures";

// Members read and remove chores; adding goes through the add_chore function.
rlsTable("chores", {
  seed: (w, db, n) =>
    seedRow(db, "chores", { group_id: w.groupId, title: `Trash ${n}`, cadence: "weekly" }),
  read: MEMBERS,
  update: { patch: () => ({ title: "Edited" }) },
  remove: MEMBERS,
  insert: { row: (w, n) => ({ group_id: w.groupId, title: `Forged ${n}`, cadence: "weekly" }) },
});
