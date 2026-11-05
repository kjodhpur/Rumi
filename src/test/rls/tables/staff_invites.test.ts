import { rlsTable, seedRow } from "../harness";
import { HA, future } from "../fixtures";

// Only housing admins read invites; tokens are minted by the invite action.
rlsTable("staff_invites", {
  seed: (w, db, n) =>
    seedRow(db, "staff_invites", {
      school_id: w.school,
      email: `invitee-${n}@${w.run}.main.test`,
      role: "housing_staff",
      token_hash: `h-${n}`,
      expires_at: future(),
    }),
  read: HA,
  update: { patch: () => ({ role: "housing_admin" }) },
  insert: {
    row: (w, n) => ({
      school_id: w.school,
      email: `i-${n}@${w.run}.main.test`,
      role: "housing_admin",
      token_hash: `hi-${n}`,
      expires_at: future(),
    }),
  },
});
