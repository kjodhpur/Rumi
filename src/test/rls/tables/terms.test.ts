import { rlsTable, seedRow } from "../harness";

// Staff of the school read terms; students and other schools don't. Writes go through actions.
const term = (school: string, n: string) => ({
  school_id: school,
  name: `T ${n}`,
  starts_on: "2028-01-10",
  ends_on: "2028-05-10",
  active: false,
});

rlsTable("terms", {
  seed: (w, db, n) => seedRow(db, "terms", term(w.school, n)),
  read: ["housingAdmin", "housingStaff", "ra", "analyst", "moderator"],
  update: { patch: () => ({ name: "Renamed" }) },
  insert: { row: (w, n) => term(w.school, n) },
});
