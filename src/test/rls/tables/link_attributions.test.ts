import { rlsTable, seedRow } from "../harness";

// Where a student signed up from (StarRez, Canvas, QR…): server-only; staff see counts.
rlsTable("link_attributions", {
  seed: (w, db) =>
    seedRow(db, "link_attributions", {
      school_id: w.school,
      source: "qr",
      user_id: w.ids.studentA,
    }),
  read: [],
  update: { patch: () => ({ source: "direct" }) },
  insert: { row: (w) => ({ school_id: w.school, source: "canvas" }) },
});
