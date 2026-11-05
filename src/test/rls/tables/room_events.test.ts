import { rlsTable, seedRow } from "../harness";
import { MEMBERS } from "../fixtures";

const roomEvent = (group: string, user: string, n: string) => ({
  group_id: group,
  created_by: user,
  kind: "quiet",
  title: `Finals ${n}`,
  starts_at: "2027-12-01T20:00:00Z",
  ends_at: "2027-12-02T06:00:00Z",
});

// Members read the room calendar; each adds and removes only their own events.
rlsTable("room_events", {
  seed: (w, db, n) => seedRow(db, "room_events", roomEvent(w.groupId, w.ids.studentA, n)),
  read: MEMBERS,
  update: { patch: () => ({ title: "Edited" }) },
  remove: ["studentA"],
  insert: { row: (w, n) => roomEvent(w.groupId, w.ids.studentA, n), allowed: ["studentA"] },
});
