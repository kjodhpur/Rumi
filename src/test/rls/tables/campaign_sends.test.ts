import { rlsTable, seedRow } from "../harness";
import { LEADS } from "../fixtures";

// Who was nudged is for housing leads, not the students themselves.
const campaigns: string[] = [];
const campaign = async (db: Parameters<typeof seedRow>[0], school: string) => {
  const row = await seedRow(db, "campaigns", { school_id: school });
  campaigns.push(String(row.id));
  return row;
};

rlsTable("campaign_sends", {
  seed: async (w, db) => {
    const c = await campaign(db, w.school);
    return seedRow(db, "campaign_sends", { campaign_id: c.id, user_id: w.ids.studentA }, [
      "campaign_id",
      "user_id",
    ]);
  },
  read: LEADS,
  keyOf: (row) => ({ campaign_id: row.campaign_id, user_id: row.user_id }),
  insert: {
    row: async (w, _n, db) => {
      const c = await campaign(db, w.school);
      return { campaign_id: c.id, user_id: w.ids.studentB };
    },
  },
  cleanup: async (_w, db) => {
    await db.from("campaigns").delete().in("id", campaigns);
  },
});
