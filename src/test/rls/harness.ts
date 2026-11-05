/**
 * Per-table RLS checks through PostgREST, signed in as each role in world.ts. A row is seeded
 * with the service role (owned by studentA, in group G or at school "asu"), then every role
 * tries to read, change, delete and insert. Anything a spec doesn't allow must be refused:
 * deny is the default.
 */
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ROLES, adminClient, loadEnv, type Admin, type Role, type World } from "./world";

type Table = keyof Database["public"]["Tables"];
type Row = Record<string, unknown>;
/** Untyped on purpose: the harness is table-agnostic, and the typed client is too deep here. */
type Client = SupabaseClient;

export interface TableSpec {
  /** Inserts one row with the service role and returns how to find it. `n` is unique per call. */
  seed: (w: World, db: Admin, n: string) => Promise<Row>;
  /** Roles that can see the seeded row. */
  read: Role[];
  /** A harmless change, and who may make it. */
  update?: { patch: (w: World) => Row; allowed?: Role[] };
  /** Who may delete a row (each allowed role deletes its own freshly seeded copy). */
  remove?: Role[];
  /**
   * A valid row (the service role inserting it must succeed, so a refusal is RLS and not a
   * constraint), and who may insert it through the API. `n` is unique per call.
   */
  insert: { row: (w: World, n: string, db: Admin) => Row | Promise<Row>; allowed?: Role[] };
  /** The seeded row belongs to the world (teardown removes it); don't delete it here. */
  persistent?: boolean;
  /** For tables without an `id` column: the columns that identify an inserted row. */
  keyOf?: (row: Row) => Row;
  /** Removes anything seed() created besides the row itself. */
  cleanup?: (w: World, db: Admin) => Promise<void>;
}

function clientFor(world: World, role: Role): Client {
  const headers: Record<string, string> =
    role === "anon" ? {} : { Authorization: `Bearer ${world.tokens[role]}` };
  return createClient(world.url, world.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}

export function rlsTable(table: Table, spec: TableSpec) {
  const world = inject("rlsWorld");
  describe.skipIf(!world)(`RLS: ${table}`, () => {
    const w = world as World;
    const env = loadEnv();
    const admin = adminClient(env.url, env.service);
    const db = admin as unknown as Client;
    const clients = Object.fromEntries(ROLES.map((r) => [r, clientFor(w, r)])) as Record<
      Role,
      Client
    >;
    const keys: Row[] = [];
    let key: Row = {};
    let counter = 0;
    const next = () => `${w.run}${(counter++).toString(36)}`;

    beforeAll(async () => {
      key = await spec.seed(w, admin, next());
      if (!spec.persistent) keys.push(key);
    });

    afterAll(async () => {
      for (const k of keys) await db.from(table).delete().match(k);
      await spec.cleanup?.(w, admin);
    });

    it("reads: only the allowed roles see the row", async () => {
      const seen = await Promise.all(
        ROLES.map(async (role) => {
          // Key columns only: some tables hide token columns from every API role.
          const { data } = await clients[role]
            .from(table)
            .select(Object.keys(key).join(","))
            .match(key);
          return [role, (data ?? []).length > 0] as const;
        }),
      );
      const visible = seen.filter(([, v]) => v).map(([role]) => role);
      expect(visible.sort()).toEqual([...spec.read].sort());
    });

    it("updates: refused unless allowed", async () => {
      if (!spec.update) {
        // No legitimate client update: try a no-op change of the key columns themselves.
        const results = await Promise.all(
          ROLES.map(async (role) => {
            const { data } = await clients[role]
              .from(table)
              .update(key)
              .match(key)
              .select(Object.keys(key).join(","));
            return [role, (data ?? []).length > 0] as const;
          }),
        );
        expect(results.filter(([, changed]) => changed).map(([role]) => role)).toEqual([]);
        return;
      }
      const patch = spec.update.patch(w);
      const results: [Role, boolean][] = [];
      for (const role of ROLES) {
        const { data } = await clients[role]
          .from(table)
          .update(patch)
          .match(key)
          .select(Object.keys(key).join(","));
        results.push([role, (data ?? []).length > 0]);
      }
      expect(
        results
          .filter(([, changed]) => changed)
          .map(([role]) => role)
          .sort(),
      ).toEqual([...(spec.update.allowed ?? [])].sort());
    });

    it("deletes: refused unless allowed", async () => {
      const allowed = ROLES.filter((role) => (spec.remove ?? []).includes(role));
      for (const role of ROLES.filter((r) => !allowed.includes(r))) {
        await clients[role].from(table).delete().match(key);
        const { data } = await db.from(table).select("*").match(key);
        expect({ role, kept: (data ?? []).length > 0 }).toEqual({ role, kept: true });
      }
      // The first allowed role deletes the seeded row; later ones get a fresh copy each.
      let target = key;
      for (const [i, role] of allowed.entries()) {
        if (i > 0) {
          target = await spec.seed(w, admin, next());
          keys.push(target);
        }
        await clients[role].from(table).delete().match(target);
        const { data } = await db.from(table).select("*").match(target);
        expect({ role, gone: (data ?? []).length === 0 }).toEqual({ role, gone: true });
      }
    });

    it("inserts: refused unless allowed", async () => {
      // The row is valid: the service role can insert it.
      const valid = await db
        .from(table)
        .insert(await spec.insert.row(w, next(), admin))
        .select("*");
      expect(valid.error?.message ?? null).toBeNull();
      const validRow = (valid.data?.[0] ?? {}) as Row;
      if ("id" in validRow) await db.from(table).delete().eq("id", String(validRow.id));
      else if (spec.keyOf) await db.from(table).delete().match(spec.keyOf(validRow));

      const accepted: Role[] = [];
      for (const role of ROLES) {
        const row = await spec.insert.row(w, next(), admin);
        const { data, error } = await clients[role].from(table).insert(row).select("*");
        if (!error && data?.length) {
          accepted.push(role);
          const inserted = data[0] as Row;
          if ("id" in inserted) await db.from(table).delete().eq("id", String(inserted.id));
          else if (spec.keyOf) keys.push(spec.keyOf(inserted));
        }
      }
      expect(accepted.sort()).toEqual([...(spec.insert.allowed ?? [])].sort());
    });
  });
}

/** Inserts with the service role and returns the identifying columns; throws the real error. */
export async function seedRow(
  admin: Admin,
  table: Table,
  row: Row,
  pick: string[] = ["id"],
): Promise<Row> {
  const db = admin as unknown as Client;
  const { data, error } = await db.from(table).insert(row).select(pick.join(",")).single();
  if (error || !data) throw new Error(`seed ${table}: ${error?.message ?? "no row"}`);
  return Object.fromEntries(pick.map((c) => [c, (data as unknown as Row)[c]]));
}
