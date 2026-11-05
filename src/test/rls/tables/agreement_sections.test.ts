import { rlsTable, seedRow } from "../harness";
import { MEMBERS, letters } from "../fixtures";

rlsTable("agreement_sections", {
  seed: (w, db, n) =>
    seedRow(
      db,
      "agreement_sections",
      {
        agreement_id: w.agreementId,
        key: letters(`k_${n}`),
        title: "Sleep",
        position: 0,
        content: "Quiet after 11.",
      },
      ["agreement_id", "key"],
    ),
  read: MEMBERS,
  update: { patch: () => ({ content: "Anything goes." }) },
  keyOf: (row) => ({ agreement_id: row.agreement_id, key: row.key }),
  insert: {
    row: (w, n) => ({
      agreement_id: w.agreementId,
      key: letters(`i_${n}`),
      title: "Guests",
      position: 1,
      content: "Forged",
    }),
  },
});
