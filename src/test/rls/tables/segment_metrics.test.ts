import { rlsTable, seedRow } from "../harness";
import { LEADS_ANALYST } from "../fixtures";

rlsTable("segment_metrics", {
  seed: (w, db, n) =>
    seedRow(
      db,
      "segment_metrics",
      {
        school_id: w.school,
        term_id: w.termId,
        dimension: "class_year",
        value: `v${n}`,
        metric: "match_rate",
        suppressed: false,
      },
      ["school_id", "term_id", "dimension", "value", "metric"],
    ),
  read: LEADS_ANALYST,
  keyOf: (row) => ({
    school_id: row.school_id,
    term_id: row.term_id,
    dimension: row.dimension,
    value: row.value,
    metric: row.metric,
  }),
  update: { patch: () => ({ suppressed: true }) },
  insert: {
    row: (w, n) => ({
      school_id: w.school,
      term_id: w.termId,
      dimension: "class_year",
      value: `i${n}`,
      metric: "match_rate",
      suppressed: false,
    }),
  },
});
