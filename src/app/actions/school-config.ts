"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { firstError } from "@/lib/validation";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { runInBackground } from "@/lib/background";
import { recomputeSchool } from "@/lib/matching/recompute";
import { protectedTopics } from "@/lib/staff/fair-housing";
import { validChoices } from "@/lib/matching/scenarios";
import { parseTermConfig } from "@/lib/staff/term-config";
import { DEADLINE_KEYS } from "@/lib/notifications/deadline-nudges";
import { FACTORS } from "@/lib/options";
import type { Json } from "@/types/database";

const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.");

/** Housing admins only; every change is audited. */
async function housingAdmin(school: string) {
  if (!schoolId.safeParse(school).success) return null;
  const actorId = await assertRole(school, "configureTerm");
  if (!actorId) return null;
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return "limited" as const;
  return actorId;
}

const deny = (actorId: string | null | "limited") =>
  actorId === "limited"
    ? fail("Too many changes. Try again in a bit.")
    : fail("Only housing admins can change this.");

function refresh() {
  revalidatePath("/staff/settings/term");
  revalidatePath("/staff/setup");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.H nudges
// ─────────────────────────────────────────────────────────────────────────────

const nudgeInput = z.object({
  schoolId,
  deadlineKey: z.enum(DEADLINE_KEYS),
  offsets: z.array(z.number().int().min(0).max(60)).min(1, "Keep at least one reminder.").max(5),
  paused: z.boolean(),
});

export async function saveNudgeRule(raw: z.input<typeof nudgeInput>): Promise<ActionResult> {
  const parsed = nudgeInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const actorId = await housingAdmin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const { error } = await createAdminClient()
    .from("nudge_rules")
    .upsert(
      {
        school_id: parsed.data.schoolId,
        deadline_key: parsed.data.deadlineKey,
        offsets: [...new Set(parsed.data.offsets)].sort((a, b) => b - a),
        paused: parsed.data.paused,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "school_id,deadline_key" },
    );
  if (error) return fail("Couldn't save the reminders.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "nudge_rule_saved",
    entity: "nudge_rule",
    meta: {
      deadline: parsed.data.deadlineKey,
      offsets: parsed.data.offsets,
      paused: parsed.data.paused,
    },
  });
  refresh();
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Constraints: rules, option lists, track pools
// ─────────────────────────────────────────────────────────────────────────────

const rulesInput = z.object({
  schoolId,
  rules: z
    .array(
      z.object({
        type: z.enum([
          "same_academic_college",
          "same_residential_college",
          "llc_exclusive",
          "freshman_same_college",
        ]),
        active: z.boolean(),
      }),
    )
    .max(4),
  mergeTrackPools: z.boolean(),
});

/** Rule changes re-score the whole school in the background. */
export async function saveSchoolRules(raw: z.input<typeof rulesInput>): Promise<ActionResult> {
  const parsed = rulesInput.safeParse(raw);
  if (!parsed.success) return fail("Check the rules.");
  const actorId = await housingAdmin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  for (const r of parsed.data.rules) {
    const { error } = await db.from("school_rules").upsert(
      {
        school_id: parsed.data.schoolId,
        rule_type: r.type,
        active: r.active,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "school_id,rule_type" },
    );
    if (error) return fail("Couldn't save the rules.");
  }
  await db
    .from("schools")
    .update({ merge_track_pools: parsed.data.mergeTrackPools })
    .eq("id", parsed.data.schoolId);
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "school_rules_saved",
    entity: "school_rules",
    meta: { rules: parsed.data.rules, mergeTrackPools: parsed.data.mergeTrackPools },
  });
  runInBackground("school-recompute", () => recomputeSchool(parsed.data.schoolId));
  refresh();
  return ok();
}

const optionsInput = z.object({
  schoolId,
  kind: z.enum(["academic_college", "residential_college", "llc", "campus"]),
  options: z
    .array(
      z.object({
        value: z
          .string()
          .regex(/^[a-z0-9_]{2,40}$/, "Codes use lowercase letters, numbers and underscores."),
        label: z
          .string()
          .transform((v) => cleanText(v, { multiline: false }))
          .pipe(z.string().min(2).max(80)),
        active: z.boolean(),
      }),
    )
    .max(80),
});

/** Options are never deleted (students may have picked them); they're turned off instead. */
export async function saveSchoolOptions(raw: z.input<typeof optionsInput>): Promise<ActionResult> {
  const parsed = optionsInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const actorId = await housingAdmin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const values = parsed.data.options.map((o) => o.value);
  if (new Set(values).size !== values.length) return fail("Each option needs its own code.");
  const { error } = await createAdminClient()
    .from("school_options")
    .upsert(
      parsed.data.options.map((o, i) => ({
        school_id: parsed.data.schoolId,
        kind: parsed.data.kind,
        value: o.value,
        label: o.label,
        active: o.active,
        position: i,
      })),
      { onConflict: "school_id,kind,value" },
    );
  if (error) return fail("Couldn't save the options.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "school_options_saved",
    entity: "school_options",
    meta: { kind: parsed.data.kind, count: values.length },
  });
  refresh();
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Question bank (Fair Housing guarded)
// ─────────────────────────────────────────────────────────────────────────────

const questionInput = z.object({
  schoolId,
  key: z
    .string()
    .regex(/^[a-z0-9_]{3,40}$/, "Keys use lowercase letters, numbers and underscores."),
  kind: z.enum(["scenario", "scale", "choice"]),
  factor: z.enum(["sleep", "cleanliness", "noise", "guests", "study"]),
  stem: z
    .string()
    .transform((v) => cleanText(v, { multiline: false }))
    .pipe(z.string().min(5, "Write the question.").max(250)),
  choices: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9_]{1,40}$/),
        label: z
          .string()
          .transform((v) => cleanText(v, { multiline: false }))
          .pipe(z.string().min(1).max(100)),
        value: z.number().int().min(1).max(5),
        reason: z
          .string()
          .transform((v) => cleanText(v, { multiline: false }))
          .pipe(z.string().max(120)),
      }),
    )
    .min(2)
    .max(5),
  /** The housing admin signs off the Fair Housing review. */
  reviewed: z.literal(true, { message: "Confirm the Fair Housing review first." }),
});

/** Saving an existing question makes a new version; answers to the old one stop counting. */
export async function saveSchoolQuestion(
  raw: z.input<typeof questionInput>,
): Promise<ActionResult<{ version: number }>> {
  const parsed = questionInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const q = parsed.data;
  if (!validChoices(q.choices))
    return fail("Each answer needs its own code and a value from 1 to 5.");
  const topics = protectedTopics(
    [q.stem, ...q.choices.map((c) => `${c.label} ${c.reason}`)].join(" "),
  );
  if (topics.length) return fail(`Questions can't touch on ${topics.join(", ")} (Fair Housing).`);
  const actorId = await housingAdmin(q.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);

  const db = createAdminClient();
  const { data: current } = await db
    .from("school_questions")
    .select("id, version")
    .eq("school_id", q.schoolId)
    .eq("key", q.key)
    .eq("is_active", true)
    .maybeSingle();
  const { data: scenarioCount } = await db
    .from("school_questions")
    .select("key")
    .eq("school_id", q.schoolId)
    .eq("is_active", true)
    .eq("kind", "scenario");
  if (q.kind === "scenario" && !current && (scenarioCount?.length ?? 0) >= 8)
    return fail("A term can have up to eight scenario questions.");
  const version = (current?.version ?? 0) + 1;
  if (current) await db.from("school_questions").update({ is_active: false }).eq("id", current.id);
  const { error } = await db.from("school_questions").insert({
    school_id: q.schoolId,
    key: q.key,
    version,
    kind: q.kind,
    factor: q.factor,
    stem: q.stem,
    choices: q.choices as unknown as NonNullable<Json>,
    is_active: true,
    reviewed_by: actorId,
    reviewed_at: new Date().toISOString(),
    created_by: actorId,
  });
  if (error) {
    if (current) await db.from("school_questions").update({ is_active: true }).eq("id", current.id);
    return fail("Couldn't save the question.");
  }
  await logAudit({
    actorId,
    schoolId: q.schoolId,
    action: current ? "school_question_revised" : "school_question_added",
    entity: "school_question",
    meta: { key: q.key, version, fairHousingReviewed: true },
  });
  runInBackground("school-recompute", () => recomputeSchool(q.schoolId));
  refresh();
  return ok({ version });
}

export async function retireSchoolQuestion(school: string, key: string): Promise<ActionResult> {
  if (!/^[a-z0-9_]{3,40}$/.test(key)) return fail("That question isn't available.");
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const { error } = await createAdminClient()
    .from("school_questions")
    .update({ is_active: false })
    .eq("school_id", school)
    .eq("key", key)
    .eq("is_active", true);
  if (error) return fail("Couldn't retire the question.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "school_question_retired",
    entity: "school_question",
    meta: { key },
  });
  runInBackground("school-recompute", () => recomputeSchool(school));
  refresh();
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Term configuration and rollover
// ─────────────────────────────────────────────────────────────────────────────

const configInput = z.object({
  schoolId,
  requiredQuestions: z.array(z.string().regex(/^[a-z0-9_]{3,40}$/)).max(20),
  maxImportance: z.partialRecord(
    z.enum(FACTORS),
    z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  ),
});

export async function saveTermConfig(raw: z.input<typeof configInput>): Promise<ActionResult> {
  const parsed = configInput.safeParse(raw);
  if (!parsed.success) return fail("Check the settings.");
  const actorId = await housingAdmin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  const { data: term } = await db
    .from("terms")
    .select("id")
    .eq("school_id", parsed.data.schoolId)
    .eq("active", true)
    .maybeSingle();
  if (!term) return fail("Set up the term first.");
  // 3 ("must match") means no cap, so it isn't stored.
  const config = parseTermConfig({
    requiredQuestions: parsed.data.requiredQuestions,
    maxImportance: Object.fromEntries(
      Object.entries(parsed.data.maxImportance).filter(([, v]) => v !== undefined && v < 3),
    ),
  });
  const { error } = await db
    .from("terms")
    .update({ config: config as unknown as NonNullable<Json> })
    .eq("id", term.id);
  if (error) return fail("Couldn't save the settings.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "term_config_saved",
    entity: "term",
    entityId: term.id,
    meta: config as unknown as Record<string, Json>,
  });
  runInBackground("school-recompute", () => recomputeSchool(parsed.data.schoolId));
  refresh();
  return ok();
}

const nextTermInput = z
  .object({
    schoolId,
    name: z
      .string()
      .transform((v) => cleanText(v, { multiline: false }))
      .pipe(z.string().min(1, "Name the term.").max(60)),
    startsOn: isoDate,
    endsOn: isoDate,
  })
  .refine((t) => t.endsOn > t.startsOn, {
    message: "The term has to end after it starts.",
    path: ["endsOn"],
  });

/**
 * Starts the next term. The current one becomes the previous term (its survey answers then
 * drive "Keep your group?"), and the new one carries the same question settings.
 */
export async function startNextTerm(raw: z.input<typeof nextTermInput>): Promise<ActionResult> {
  const parsed = nextTermInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const actorId = await housingAdmin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  const { data: current } = await db
    .from("terms")
    .select("id, ends_on, config")
    .eq("school_id", parsed.data.schoolId)
    .eq("active", true)
    .maybeSingle();
  if (current && parsed.data.startsOn <= current.ends_on)
    return fail("The new term has to start after the current one ends.");
  if (current) await db.from("terms").update({ active: false }).eq("id", current.id);
  const { error } = await db.from("terms").insert({
    school_id: parsed.data.schoolId,
    name: parsed.data.name,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    deadlines: {},
    config: current?.config ?? {},
    active: true,
    created_by: actorId,
  });
  if (error) {
    if (current) await db.from("terms").update({ active: true }).eq("id", current.id);
    return fail("Couldn't start the new term.");
  }
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "term_started",
    entity: "term",
    meta: { name: parsed.data.name, previous: current?.id ?? null },
  });
  revalidatePath("/staff", "layout");
  return ok();
}
