import { rlsTable, seedRow } from "../harness";
import { future, randomHex64 } from "../fixtures";
import type { World } from "../world";

const pair = (w: World) => [w.ids.studentA, w.ids.studentB].sort() as [string, string];

// Share links: the two students in the match see theirs; links are made by an action.
rlsTable("match_share_tokens", {
  seed: (w, db) => {
    const [a, b] = pair(w);
    return seedRow(db, "match_share_tokens", {
      user_a: a,
      user_b: b,
      token_hash: randomHex64(),
      expires_at: future(7),
    });
  },
  read: ["studentA", "studentB"],
  insert: {
    // Revoked, so it never clashes with the pair's one active link.
    row: (w) => {
      const [a, b] = pair(w);
      return {
        user_a: a,
        user_b: b,
        token_hash: randomHex64(),
        expires_at: future(7),
        revoked_at: new Date().toISOString(),
      };
    },
  },
});
