import { rlsTable, seedRow } from "../harness";
import { HA } from "../fixtures";
import { ROLES } from "../world";

const option = (school: string, value: string, active: boolean) => ({
  school_id: school,
  kind: "llc",
  value,
  label: "Option",
  active,
});

// Active options fill the onboarding pickers, so anyone may read them; housing admins manage
// them through actions.
rlsTable("school_options", {
  seed: (w, db, n) =>
    seedRow(db, "school_options", option(w.school, `o_${n}`, true), ["school_id", "kind", "value"]),
  read: [...ROLES],
  keyOf: (row) => ({ school_id: row.school_id, kind: row.kind, value: row.value }),
  insert: { row: (w, n) => option(w.school, `i_${n}`, true) },
});

// A retired option is hidden from everyone but the school's housing admins.
rlsTable("school_options", {
  seed: (w, db, n) =>
    seedRow(db, "school_options", option(w.school, `r_${n}`, false), [
      "school_id",
      "kind",
      "value",
    ]),
  read: HA,
  keyOf: (row) => ({ school_id: row.school_id, kind: row.kind, value: row.value }),
  insert: { row: (w, n) => option(w.school, `j_${n}`, false) },
});
