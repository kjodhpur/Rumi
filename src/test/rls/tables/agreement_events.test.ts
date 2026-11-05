import { rlsTable, seedRow } from "../harness";
import { MEMBERS } from "../fixtures";

rlsTable("agreement_events", {
  seed: (w, db) => seedRow(db, "agreement_events", { agreement_id: w.agreementId, kind: "edited" }),
  read: MEMBERS,
  update: { patch: () => ({ kind: "signed" }) },
  insert: { row: (w) => ({ agreement_id: w.agreementId, kind: "signed" }) },
});
