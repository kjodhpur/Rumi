/**
 * Regression guard: no security-definer function in `public` may be callable by signed-in
 * users unless it checks who is calling, or is a known read-only predicate used by RLS.
 * (On 2026-11-04 `purge_audit_log` and `school_students` were found executable by any
 * student.) Runs against the local stack; skipped when it isn't up.
 */
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";

const DB_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** Predicates RLS policies call; they return booleans or a first name and change nothing. */
const ALLOWED_WITHOUT_CALLER_CHECK = new Set([
  "can_contact",
  "first_name_of",
  "has_consent",
  "in_pilot_scope",
  "is_blocked",
  "is_student_verified",
  "school_for_email",
  "shares_conversation",
]);

async function connect() {
  const client = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 1500 });
  try {
    await client.connect();
    return client;
  } catch {
    return null;
  }
}

const client = await connect();
afterAll(async () => client?.end());

describe.skipIf(!client)("security-definer functions", () => {
  it("are never callable by signed-in users without a caller check", async () => {
    const { rows } = await client!.query<{ name: string; checks: boolean }>(`
      select p.proname as name,
             pg_get_functiondef(p.oid) ~* '(auth\\.uid\\(\\)|auth\\.role\\(\\)|has_role|is_admin\\(|not_allowed|not_authenticated)' as checks
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
        and pg_get_function_result(p.oid) <> 'trigger'`);
    const unguarded = rows
      .filter((r) => !r.checks && !ALLOWED_WITHOUT_CALLER_CHECK.has(r.name))
      .map((r) => r.name);
    expect(unguarded).toEqual([]);
  });

  it("keep internal helpers away from signed-in users", async () => {
    const { rows } = await client!.query<{ name: string; ok: boolean }>(`
      select p.proname as name, has_function_privilege('authenticated', p.oid, 'EXECUTE') as ok
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('purge_audit_log', 'school_students', 'staff_segment_base', 'refresh_segment_metrics', 'admit_school_for', 'mutual_people')`);
    expect(rows.filter((r) => r.ok).map((r) => r.name)).toEqual([]);
  });

  // Postgres checks EXECUTE on every function a policy names, even when another branch of the
  // expression already decided the row: one revoked function makes the whole read fail. (On
  // 2026-11-05 anon reads of school_options failed this way after has_role was revoked.)
  it("are executable by every role a policy that calls them applies to", async () => {
    const { rows } = await client!.query<{ policy: string }>(`
      with pol as (
        select tablename, policyname,
               unnest(case when roles = '{public}' then array['anon', 'authenticated'] else roles::text[] end) as role,
               coalesce(qual, '') || ' ' || coalesce(with_check, '') as expr
        from pg_policies where schemaname in ('public', 'storage')
      )
      select distinct pol.tablename || ': ' || pol.policyname || ' (' || pol.role || ' → ' || f.proname || ')' as policy
      from pol, regexp_matches(pol.expr, '([a-z_][a-z0-9_]*)\\(', 'g') as m
      join pg_proc f on f.proname = m[1]
      join pg_namespace n on n.oid = f.pronamespace and n.nspname in ('public', 'auth', 'storage')
      where pol.role in ('anon', 'authenticated')
        and not has_function_privilege(pol.role, f.oid, 'EXECUTE')`);
    expect(rows.map((r) => r.policy)).toEqual([]);
  });
});
