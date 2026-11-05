import { rlsTable, seedRow } from "../harness";
import { MEMBERS, cleanupFresh, freshGroup } from "../fixtures";

// Group G's agreement: its members read it; edits go through the agreement actions.
rlsTable("agreements", {
  seed: async (w) => ({ id: w.agreementId }),
  persistent: true,
  read: MEMBERS,
  update: { patch: () => ({ status: "signed" }) },
  insert: {
    row: async (w, n, db) => {
      const group = await freshGroup(db, w, n);
      return { group_id: group.groupId, member_ids: group.members };
    },
  },
  cleanup: (_w, db) => cleanupFresh(db),
});
