import { rlsTable, seedRow } from "../harness";

// Encrypted vendor credentials: no policy at all, the service role only.
rlsTable("integration_credentials", {
  seed: (w, db) =>
    seedRow(
      db,
      "integration_credentials",
      {
        school_id: w.school,
        provider: "starrez",
        base_url: "https://example.test",
        credentials_enc: "enc",
      },
      ["school_id", "provider"],
    ),
  read: [],
  update: { patch: () => ({ base_url: "https://attacker.test" }) },
  insert: {
    row: (w) => ({
      school_id: w.otherSchool,
      provider: "starrez",
      base_url: "https://example.test",
      credentials_enc: "enc",
    }),
  },
  keyOf: (row) => ({ school_id: row.school_id, provider: row.provider }),
});
