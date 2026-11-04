import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { notifyInApp } from "@/lib/notifications/notify";
import type { Json } from "@/types/database";
import { buildStarRezExport } from "./export";
import {
  latestPerFactor,
  parseQuestionnaireMapping,
  type ImportedAnswer,
  type QuestionnaireMapping,
} from "./questionnaire";
import {
  parseAssignmentMapping,
  planImport,
  type AssignmentMapping,
  type AssignmentRow,
  type ImportPlan,
  type RowError,
} from "./import";
import { StarRezRestAdapter, type StarRezConfig } from "./rest";
import { ID_CHUNK, selectAll, selectByIds } from "@/lib/supabase/paginate";
import type { HousingRoomChange, RoommateGroup } from "../housing/adapter";

/**
 * Housing-system data in and out (Phase 2a, 2b, 2d). Everything here runs with the service
 * role; callers check the staff role first. Imports are idempotent and undoable.
 */

type Direction = "import_assignments" | "import_questionnaire";

export async function loadImportMapping(
  schoolId: string,
  direction: "import_assignments",
): Promise<AssignmentMapping>;
export async function loadImportMapping(
  schoolId: string,
  direction: "import_questionnaire",
): Promise<QuestionnaireMapping>;
export async function loadImportMapping(schoolId: string, direction: Direction) {
  const { data } = await createAdminClient()
    .from("integration_mappings")
    .select("mapping")
    .eq("school_id", schoolId)
    .eq("provider", "starrez")
    .eq("direction", direction)
    .maybeSingle();
  return direction === "import_assignments"
    ? parseAssignmentMapping(data?.mapping)
    : parseQuestionnaireMapping(data?.mapping);
}

export async function saveImportMapping(
  schoolId: string,
  direction: Direction,
  mapping: AssignmentMapping | QuestionnaireMapping,
  actorId: string,
) {
  return createAdminClient()
    .from("integration_mappings")
    .upsert(
      {
        school_id: schoolId,
        provider: "starrez",
        direction,
        mapping: mapping as unknown as NonNullable<Json>,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "school_id,provider,direction" },
    );
}

const emailHash = async (email: string) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
};

/** Rumi students at a school by email and by the student ID they entered (decrypted here only). */
export async function studentLookup(schoolId: string) {
  const db = createAdminClient();
  const students = await selectAll((from, to) =>
    db.rpc("school_students", { p_school: schoolId }).select("id").order("id").range(from, to),
  );
  const ids = students.map((s) => s.id);
  const settings = await selectByIds(ids, (c, f, t) =>
    db
      .from("user_settings")
      .select("user_id, email, student_id_enc")
      .in("user_id", c)
      .order("user_id")
      .range(f, t),
  );
  const byEmail = new Map<string, string>();
  const byStudentId = new Map<string, string>();
  for (const s of settings ?? []) {
    if (s.email) byEmail.set(s.email.toLowerCase(), s.user_id);
    if (s.student_id_enc) {
      try {
        byStudentId.set(decrypt(s.student_id_enc).trim(), s.user_id);
      } catch {
        // A key rotation would leave old values unreadable; email still matches.
      }
    }
  }
  return { byEmail, byStudentId };
}

export interface AssignmentImportResult {
  plan: Pick<ImportPlan, "unchanged"> & {
    inserts: number;
    updates: number;
    unknown: RowError[];
    duplicates: RowError[];
  };
  jobId: string | null;
}

/**
 * Applies validated assignment rows. Dry run computes the plan only. A changed room closes
 * the old assignment (kept for history) and records an untagged, imported room change.
 */
export async function applyAssignments(
  schoolId: string,
  rows: AssignmentRow[],
  options: {
    dryRun: boolean;
    actorId: string | null;
    provider: "csv" | "starrez";
    fileName?: string;
    filePath?: string;
    errors?: RowError[];
  },
): Promise<AssignmentImportResult> {
  const db = createAdminClient();
  const [lookup, open, { data: term }] = await Promise.all([
    studentLookup(schoolId),
    selectAll((from, to) =>
      db
        .from("assignments")
        .select("id, user_id, building, room, bed, external_ref")
        .eq("school_id", schoolId)
        .is("closed_at", null)
        .order("id")
        .range(from, to),
    ),
    db.from("terms").select("id").eq("school_id", schoolId).eq("active", true).maybeSingle(),
  ]);
  const plan = planImport(
    rows,
    lookup,
    open.map((a) => ({
      id: a.id,
      userId: a.user_id,
      building: a.building,
      room: a.room,
      bed: a.bed,
      externalRef: a.external_ref,
    })),
  );
  const summary = {
    inserts: plan.inserts.length,
    updates: plan.updates.length,
    unchanged: plan.unchanged,
    unknown: plan.unknown,
    duplicates: plan.duplicates,
  };
  const allErrors = [...(options.errors ?? []), ...plan.unknown, ...plan.duplicates].sort(
    (a, b) => a.line - b.line,
  );

  const { data: job } = await db
    .from("import_jobs")
    .insert({
      school_id: schoolId,
      provider: options.provider,
      kind: "assignments",
      file_name: options.fileName ?? null,
      file_path: options.filePath ?? null,
      status: options.dryRun ? "dry_run" : "completed",
      counts: {
        inserts: summary.inserts,
        updates: summary.updates,
        unchanged: summary.unchanged,
        errors: allErrors.length,
      } as unknown as NonNullable<Json>,
      errors: allErrors.slice(0, 2000) as unknown as NonNullable<Json>,
      created_by: options.actorId,
    })
    .select("id")
    .single();
  if (options.dryRun || !job) return { plan: summary, jobId: job?.id ?? null };

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const closedIds = plan.updates.map((u) => u.assignmentId);
  for (let i = 0; i < closedIds.length; i += ID_CHUNK) {
    await db
      .from("assignments")
      .update({ closed_at: now })
      .in("id", closedIds.slice(i, i + ID_CHUNK));
  }
  const fresh = [...plan.inserts, ...plan.updates].map((r) => ({
    user_id: r.userId,
    school_id: schoolId,
    term_id: term?.id ?? null,
    building: r.building,
    room: r.room,
    bed: r.bed,
    source: options.provider === "csv" ? "import" : "rest",
    external_ref: r.externalRef,
    moved_in_at: r.movedIn ?? today,
    import_job_id: job.id,
  }));
  for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await db.from("assignments").insert(fresh.slice(i, i + 500));
    if (error) {
      await db
        .from("import_jobs")
        .update({
          status: "failed",
          errors: [
            { line: 0, message: "Saving failed part-way. Undo this import and try again." },
          ] as unknown as NonNullable<Json>,
        })
        .eq("id", job.id);
      break;
    }
  }
  // Moves seen in the import count as room changes, untagged until staff tag them.
  if (plan.updates.length) {
    await db
      .from("room_change_requests")
      .insert(
        plan.updates.map((u) => ({
          school_id: schoolId,
          user_id: u.userId,
          term_id: term?.id ?? null,
          building: u.building,
          source: "import",
          status: "moved",
          external_ref: `job:${job.id}:${u.userId}`,
          closed_at: now,
        })),
      );
  }
  await db
    .from("import_jobs")
    .update({
      counts: {
        inserts: summary.inserts,
        updates: summary.updates,
        unchanged: summary.unchanged,
        errors: allErrors.length,
        closedIds,
      } as unknown as NonNullable<Json>,
    })
    .eq("id", job.id);
  return { plan: summary, jobId: job.id };
}

/** Undo the most recent completed import: remove what it added, reopen what it closed. */
export async function undoImport(schoolId: string, jobId: string) {
  const db = createAdminClient();
  const { data: job } = await db
    .from("import_jobs")
    .select("id, status, counts, kind, created_at")
    .eq("id", jobId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!job || job.status !== "completed")
    return { ok: false as const, error: "Only a completed import can be undone." };
  const { data: newer } = await db
    .from("import_jobs")
    .select("id")
    .eq("school_id", schoolId)
    .eq("kind", job.kind)
    .eq("status", "completed")
    .gt("created_at", job.created_at)
    .limit(1);
  if (newer?.length) return { ok: false as const, error: "Undo the newer import first." };
  if (job.kind === "assignments") {
    await db.from("assignments").delete().eq("import_job_id", job.id);
    const closedIds = ((job.counts as { closedIds?: string[] } | null)?.closedIds ?? []).filter(
      (id) => typeof id === "string",
    );
    for (let i = 0; i < closedIds.length; i += ID_CHUNK)
      await db
        .from("assignments")
        .update({ closed_at: null })
        .in("id", closedIds.slice(i, i + ID_CHUNK));
    await db.from("room_change_requests").delete().like("external_ref", `job:${job.id}:%`);
  } else {
    await db.from("imported_answers").delete().eq("import_job_id", job.id).is("confirmed_at", null);
  }
  await db
    .from("import_jobs")
    .update({ status: "undone", undone_at: new Date().toISOString() })
    .eq("id", job.id);
  return { ok: true as const };
}

/**
 * Stores imported questionnaire answers. Students on Rumi get a "confirm your answers"
 * notice; others are held by email hash (60 days, retention) and attach on sign-up.
 */
export async function applyQuestionnaire(
  schoolId: string,
  answers: ImportedAnswer[],
  options: {
    actorId: string | null;
    provider: "csv" | "starrez";
    fileName?: string;
    unmapped: number;
  },
) {
  const db = createAdminClient();
  const lookup = await studentLookup(schoolId);
  const latest = latestPerFactor(answers);
  const { data: job } = await db
    .from("import_jobs")
    .insert({
      school_id: schoolId,
      provider: options.provider,
      kind: "questionnaire",
      file_name: options.fileName ?? null,
      status: "completed",
      counts: {
        answers: latest.length,
        unmapped: options.unmapped,
      } as unknown as NonNullable<Json>,
      created_by: options.actorId,
    })
    .select("id")
    .single();
  if (!job) return { stored: 0, students: 0, held: 0 };
  const notify = new Set<string>();
  let held = 0;
  const rows = await Promise.all(
    latest.map(async (a) => {
      const userId =
        (a.studentId && lookup.byStudentId.get(a.studentId)) ||
        (a.email && lookup.byEmail.get(a.email)) ||
        null;
      if (userId) notify.add(userId);
      else if (a.email) held += 1;
      return userId || a.email
        ? {
            school_id: schoolId,
            user_id: userId,
            email_hash: userId ? null : await emailHash(a.email!),
            import_job_id: job.id,
            source: options.provider,
            question_code: a.questionCode,
            raw_value: a.rawValue,
            mapped_factor: a.factor,
            mapped_value: a.value,
          }
        : null;
    }),
  );
  const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  // A student's newer Rumi answer wins: confirmed rows are never overwritten.
  for (const r of valid.filter((x) => x.user_id)) {
    await db
      .from("imported_answers")
      .delete()
      .eq("school_id", schoolId)
      .eq("user_id", r.user_id!)
      .eq("mapped_factor", r.mapped_factor)
      .is("confirmed_at", null);
  }
  for (let i = 0; i < valid.length; i += 500)
    await db.from("imported_answers").insert(valid.slice(i, i + 500));
  await notifyInApp(
    [...notify].map((userId) => ({
      userId,
      type: "imported_answers",
      entityId: job.id,
      title: "Your housing profile answers are ready",
      body: "Check them in one tap. Nothing counts until you confirm.",
      href: "/settings/imported",
    })),
  );
  return { stored: valid.length, students: notify.size, held };
}

// ─────────────────────────────────────────────────────────────────────────────
// REST
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredStarRezSettings {
  baseUrl: string;
  username: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

export async function loadRestSettings(schoolId: string): Promise<StoredStarRezSettings | null> {
  const { data } = await createAdminClient()
    .from("integration_credentials")
    .select("base_url, credentials_enc, sync_enabled, last_sync_at, last_error")
    .eq("school_id", schoolId)
    .eq("provider", "starrez")
    .maybeSingle();
  if (!data) return null;
  let username = "";
  try {
    username = (JSON.parse(decrypt(data.credentials_enc)) as { username?: string }).username ?? "";
  } catch {
    username = "";
  }
  return {
    baseUrl: data.base_url,
    username,
    syncEnabled: data.sync_enabled,
    lastSyncAt: data.last_sync_at,
    lastError: data.last_error,
  };
}

export async function saveRestSettings(
  schoolId: string,
  input: { baseUrl: string; username: string; password: string | null; syncEnabled: boolean },
  actorId: string,
) {
  const db = createAdminClient();
  let password = input.password;
  if (password === null) {
    const { data } = await db
      .from("integration_credentials")
      .select("credentials_enc")
      .eq("school_id", schoolId)
      .eq("provider", "starrez")
      .maybeSingle();
    try {
      password = data
        ? ((JSON.parse(decrypt(data.credentials_enc)) as { password?: string }).password ?? "")
        : "";
    } catch {
      password = "";
    }
  }
  return db.from("integration_credentials").upsert(
    {
      school_id: schoolId,
      provider: "starrez",
      base_url: input.baseUrl,
      credentials_enc: encrypt(JSON.stringify({ username: input.username, password })),
      sync_enabled: input.syncEnabled,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "school_id,provider" },
  );
}

async function restAdapter(schoolId: string): Promise<StarRezRestAdapter | null> {
  const { data } = await createAdminClient()
    .from("integration_credentials")
    .select("base_url, credentials_enc")
    .eq("school_id", schoolId)
    .eq("provider", "starrez")
    .maybeSingle();
  if (!data) return null;
  const creds = JSON.parse(decrypt(data.credentials_enc)) as Partial<StarRezConfig>;
  return new StarRezRestAdapter({
    baseUrl: data.base_url,
    username: creds.username ?? "",
    password: creds.password ?? "",
    endpoints: creds.endpoints,
    fields: creds.fields,
  });
}

type RestAction = "test" | "push_groups" | "pull_assignments" | "pull_room_changes";

/** Runs one REST action and logs it in integration_runs, partial failures included. */
export async function runRest(schoolId: string, action: RestAction, actorId: string | null) {
  const db = createAdminClient();
  const { data: run } = await db
    .from("integration_runs")
    .insert({
      school_id: schoolId,
      provider: "starrez",
      action,
      status: "running",
      created_by: actorId,
    })
    .select("id")
    .single();
  const finish = async (
    status: "success" | "partial_failure" | "failed",
    processed: number,
    errors: { id: string; error: string }[],
    calls: number,
  ) => {
    if (run)
      await db
        .from("integration_runs")
        .update({
          status,
          records_processed: processed,
          errors: errors.slice(0, 500) as unknown as NonNullable<Json>,
          calls,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    await db
      .from("integration_credentials")
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: status === "failed" ? (errors[0]?.error ?? "Failed").slice(0, 500) : null,
      })
      .eq("school_id", schoolId)
      .eq("provider", "starrez");
    return { status, processed, errors };
  };
  let adapter: StarRezRestAdapter | null = null;
  try {
    adapter = await restAdapter(schoolId);
    if (!adapter)
      return finish("failed", 0, [{ id: "config", error: "StarRez isn't connected yet." }], 0);
    if (action === "test") {
      const r = await adapter.testConnection();
      return finish(
        r.ok ? "success" : "failed",
        0,
        r.ok ? [] : [{ id: "connection", error: r.message }],
        adapter.calls,
      );
    }
    if (action === "push_groups") {
      const groups = await approvedGroups(schoolId);
      const r = await adapter.pushRoommateGroups(groups);
      return finish(
        r.errors.length ? (r.recordsPushed ? "partial_failure" : "failed") : "success",
        r.recordsPushed,
        r.errors,
        adapter.calls,
      );
    }
    const { data: last } = await db
      .from("integration_runs")
      .select("created_at")
      .eq("school_id", schoolId)
      .eq("action", action)
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const since = last ? new Date(last.created_at) : undefined;
    if (action === "pull_assignments") {
      const pulled = await adapter.pullAssignments(since);
      const rows: AssignmentRow[] = pulled
        .filter((a) => a.building && (a.studentId || a.email))
        .map((a, i) => ({ line: i + 1, ...a }));
      const result = await applyAssignments(schoolId, rows, {
        dryRun: false,
        actorId,
        provider: "starrez",
      });
      const errors = [...result.plan.unknown, ...result.plan.duplicates].map((e) => ({
        id: `row ${e.line}`,
        error: e.message,
      }));
      return finish(
        errors.length ? "partial_failure" : "success",
        result.plan.inserts + result.plan.updates,
        errors,
        adapter.calls,
      );
    }
    const changes = await adapter.pullRoomChanges(since);
    const stored = await applyRoomChanges(schoolId, changes);
    return finish(
      stored.unknown ? "partial_failure" : "success",
      stored.saved,
      stored.unknown
        ? [{ id: "students", error: `${stored.unknown} room changes didn't match a Rumi student.` }]
        : [],
      adapter.calls,
    );
  } catch (error) {
    return finish(
      "failed",
      0,
      [{ id: action, error: error instanceof Error ? error.message : "Failed" }],
      adapter?.calls ?? 0,
    );
  }
}

/** Approved pairings whose members all share with housing, as roommate groups. */
async function approvedGroups(schoolId: string): Promise<RoommateGroup[]> {
  const preview = await buildStarRezExport(schoolId);
  const byGroup = new Map<string, RoommateGroup>();
  for (const row of preview.rows) {
    const g = byGroup.get(row.groupId) ?? {
      ref: row.groupId,
      name: row.groupName,
      term: row.term,
      members: [],
    };
    g.members.push({
      studentId: row.studentId || null,
      email: row.email,
      leader: row.groupLeader === "Y",
    });
    byGroup.set(row.groupId, g);
  }
  return [...byGroup.values()];
}

async function applyRoomChanges(schoolId: string, changes: HousingRoomChange[]) {
  const db = createAdminClient();
  const lookup = await studentLookup(schoolId);
  const { data: term } = await db
    .from("terms")
    .select("id")
    .eq("school_id", schoolId)
    .eq("active", true)
    .maybeSingle();
  let saved = 0;
  let unknown = 0;
  for (const c of changes) {
    const userId =
      (c.studentId && lookup.byStudentId.get(c.studentId)) ||
      (c.email && lookup.byEmail.get(c.email)) ||
      null;
    if (!userId) {
      unknown += 1;
      continue;
    }
    const { data: existing } = await db
      .from("room_change_requests")
      .select("id")
      .eq("school_id", schoolId)
      .eq("external_ref", c.externalRef)
      .maybeSingle();
    if (existing) continue;
    const { error } = await db.from("room_change_requests").insert({
      school_id: schoolId,
      user_id: userId,
      term_id: term?.id ?? null,
      building: c.building,
      staff_note: c.reason ? `From StarRez: ${c.reason.slice(0, 400)}` : null,
      source: "import",
      external_ref: c.externalRef,
      status: "closed",
      created_at: c.requestedAt,
      closed_at: new Date().toISOString(),
    });
    if (!error) saved += 1;
  }
  return { saved, unknown };
}
