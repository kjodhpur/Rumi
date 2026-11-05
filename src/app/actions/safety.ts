"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { fail, ok, type ActionResult } from "@/lib/action";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { runInBackground } from "@/lib/background";
import {
  ESCALATION_CATEGORIES,
  type EscalationCategory,
  type EscalationRoute,
} from "@/lib/safety/escalation";
import type { SchoolReportStatus } from "@/lib/staff/safety";
import { sendEmail } from "@/lib/email/send";
import { escalationForwardEmail } from "@/lib/email/templates";

const uuidSchema = z.string().uuid();
const categorySchema = z.enum(["harassment", "threat", "discrimination", "wellbeing", "general"]);
const schoolIdSchema = z.string().regex(/^[a-z0-9-]{2,32}$/);

/**
 * A report a school moderator may act on: the reported student is at this school and so is
 * the reporter (cross-school reports are for the Rumi team only).
 */
async function schoolReport(schoolId: string, reportId: string) {
  if (!schoolIdSchema.safeParse(schoolId).success || !uuidSchema.safeParse(reportId).success)
    return null;
  const admin = createAdminClient();
  const { data: report } = await admin
    .from("reports")
    .select("id, reporter_id, reported_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return null;
  const ids = [report.reported_id, report.reporter_id].filter((id): id is string => Boolean(id));
  const { data: people } = await admin.from("profiles").select("id, school_id").in("id", ids);
  const schoolOf = (id: string | null) =>
    id ? people?.find((p) => p.id === id)?.school_id : schoolId;
  return schoolOf(report.reported_id) === schoolId && schoolOf(report.reporter_id) === schoolId
    ? report
    : null;
}

/** A student (never staff or a Rumi admin) at this school. */
async function schoolStudent(schoolId: string, userId: string) {
  if (!schoolIdSchema.safeParse(schoolId).success || !uuidSchema.safeParse(userId).success)
    return false;
  const admin = createAdminClient();
  const [{ data: profile }, { data: isAdmin }] = await Promise.all([
    admin.from("profiles").select("school_id, is_staff").eq("id", userId).maybeSingle(),
    admin.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  return Boolean(profile && profile.school_id === schoolId && !profile.is_staff && !isAdmin);
}

const routeSchema = z.object({
  id: z.string().uuid().optional(),
  schoolId: schoolIdSchema,
  category: categorySchema,
  destinationLabel: z.string().min(2).max(120),
  url: z.string().url().max(500).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email().max(120).optional().or(z.literal("")),
  active: z.boolean(),
});

export async function saveEscalationRoute(
  input: z.infer<typeof routeSchema>,
): Promise<ActionResult> {
  const parsed = routeSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid route configuration.");

  const actorId = await assertRole(parsed.data.schoolId, "configureEscalation");
  if (!actorId) return fail("Housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");

  const db = createAdminClient();
  const payload = {
    school_id: parsed.data.schoolId,
    category: parsed.data.category,
    destination_label: cleanText(parsed.data.destinationLabel),
    url: parsed.data.url?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    email: parsed.data.email?.trim() || null,
    active: parsed.data.active,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.id) {
    const { error } = await db
      .from("escalation_routes")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("school_id", parsed.data.schoolId);
    if (error) return fail("Couldn't update route: " + error.message);
  } else {
    const { error } = await db
      .from("escalation_routes")
      .upsert(payload, { onConflict: "school_id,category" });
    if (error) return fail("Couldn't create route: " + error.message);
  }

  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "escalation_route_saved",
    entity: "escalation_route",
    meta: { category: parsed.data.category, destination: parsed.data.destinationLabel },
  });

  revalidatePath("/staff/settings/escalation");
  revalidatePath("/staff/safety");
  return ok();
}

export async function toggleEscalationRoute(input: {
  routeId: string;
  schoolId: string;
  active: boolean;
}): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.routeId).success) return fail("Invalid route ID.");
  const actorId = await assertRole(input.schoolId, "configureEscalation");
  if (!actorId) return fail("Housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");

  const { error } = await createAdminClient()
    .from("escalation_routes")
    .update({ active: input.active, updated_at: new Date().toISOString() })
    .eq("id", input.routeId)
    .eq("school_id", input.schoolId);

  if (error) return fail("Couldn't toggle route.");

  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: "escalation_route_toggled",
    entity: "escalation_route",
    entityId: input.routeId,
    meta: { active: input.active },
  });

  revalidatePath("/staff/settings/escalation");
  revalidatePath("/staff/safety");
  return ok();
}

export async function deleteEscalationRoute(input: {
  routeId: string;
  schoolId: string;
}): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.routeId).success) return fail("Invalid route ID.");
  const actorId = await assertRole(input.schoolId, "configureEscalation");
  if (!actorId) return fail("Housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");

  const { error } = await createAdminClient()
    .from("escalation_routes")
    .delete()
    .eq("id", input.routeId)
    .eq("school_id", input.schoolId);

  if (error) return fail("Couldn't delete route.");

  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: "escalation_route_deleted",
    entity: "escalation_route",
    entityId: input.routeId,
  });

  revalidatePath("/staff/settings/escalation");
  revalidatePath("/staff/safety");
  return ok();
}

export async function updateSchoolReportStatus(input: {
  reportId: string;
  schoolId: string;
  status: SchoolReportStatus;
  note?: string;
}): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.reportId).success) return fail("Invalid report ID.");
  if (!["open", "reviewing", "actioned", "dismissed"].includes(input.status))
    return fail("Pick a status.");
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");
  if (!(await schoolReport(input.schoolId, input.reportId)))
    return fail("That report isn't in your school's queue.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");

  const resolution = input.note ? cleanText(input.note).slice(0, 1000) : null;
  const admin = createAdminClient();

  const { error } = await admin
    .from("reports")
    .update({
      status: input.status,
      resolution_note: resolution,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.reportId);

  if (error) return fail("Couldn't update report status.");

  await admin.from("moderation_log").insert({
    actor_id: actorId,
    action: `report_${input.status}`,
    report_id: input.reportId,
    meta: { school_id: input.schoolId, note: resolution },
  });

  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: `report_${input.status}`,
    entity: "report",
    entityId: input.reportId,
    meta: { note: resolution },
  });

  revalidatePath("/staff/safety");
  return ok();
}

export async function warnSchoolStudent(input: {
  userId: string;
  schoolId: string;
  note: string;
  reportId?: string;
}): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.userId).success) return fail("Invalid user ID.");
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  if (!(await schoolStudent(input.schoolId, input.userId)))
    return fail("That student isn't at your school.");
  if (input.reportId && !(await schoolReport(input.schoolId, input.reportId)))
    return fail("That report isn't in your school's queue.");

  const warningNote = cleanText(String(input.note ?? "")).slice(0, 280);
  if (!warningNote) return fail("Warning message is required.");

  const admin = createAdminClient();

  // Create an in-app notification for the warned student
  await admin.from("notifications").insert({
    user_id: input.userId,
    type: "safety_notice",
    title: "Community Guidelines Notice",
    body: warningNote,
  });

  await admin.from("moderation_log").insert({
    actor_id: actorId,
    target_id: input.userId,
    report_id: input.reportId || null,
    action: "warn_student",
    meta: { school_id: input.schoolId, note: warningNote },
  });

  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: "student_warned",
    entity: "profile",
    entityId: input.userId,
    meta: { note: warningNote },
  });

  revalidatePath("/staff/safety");
  return ok();
}

export async function suspendSchoolStudent(input: {
  userId: string;
  schoolId: string;
  reason: string;
  reportId?: string;
}): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.userId).success) return fail("Invalid user ID.");
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  if (actorId === input.userId) return fail("You cannot suspend yourself.");
  if (!(await schoolStudent(input.schoolId, input.userId)))
    return fail("You can only suspend students at your school.");
  if (input.reportId && !(await schoolReport(input.schoolId, input.reportId)))
    return fail("That report isn't in your school's queue.");

  const reason =
    cleanText(String(input.reason ?? "")).slice(0, 500) || "Violation of community standards";
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ banned_at: new Date().toISOString(), ban_reason: reason })
    .eq("id", input.userId);

  if (error) return fail("Couldn't suspend student.");

  // Terminate auth session
  await admin.auth.admin.updateUserById(input.userId, { ban_duration: "876000h" });

  if (input.reportId && uuidSchema.safeParse(input.reportId).success) {
    await admin
      .from("reports")
      .update({
        status: "actioned",
        resolution_note: `Student suspended: ${reason}`,
        reviewed_by: actorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.reportId);
  }

  await admin.from("moderation_log").insert({
    actor_id: actorId,
    target_id: input.userId,
    report_id: input.reportId || null,
    action: "suspend_student",
    meta: { school_id: input.schoolId, reason },
  });

  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: "student_suspended",
    entity: "profile",
    entityId: input.userId,
    meta: { reason },
  });

  runInBackground("recompute-after-suspend", () => recomputeMatchesFor(input.userId));
  revalidatePath("/staff/safety");
  return ok();
}

export async function restoreSchoolStudent(input: {
  userId: string;
  schoolId: string;
  note?: string;
}): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.userId).success) return fail("Invalid user ID.");
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  if (!(await schoolStudent(input.schoolId, input.userId)))
    return fail("You can only restore students at your school.");

  const admin = createAdminClient();
  const note = input.note ? cleanText(input.note).slice(0, 500) : null;

  const { error } = await admin
    .from("profiles")
    .update({ banned_at: null, ban_reason: null })
    .eq("id", input.userId);

  if (error) return fail("Couldn't restore student.");

  await admin.auth.admin.updateUserById(input.userId, { ban_duration: "none" });

  await admin.from("moderation_log").insert({
    actor_id: actorId,
    target_id: input.userId,
    action: "restore_student",
    meta: { school_id: input.schoolId, note },
  });

  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: "student_restored",
    entity: "profile",
    entityId: input.userId,
    meta: { note },
  });

  runInBackground("recompute-after-restore", () => recomputeMatchesFor(input.userId));
  revalidatePath("/staff/safety");
  return ok();
}

export async function escalateReport(input: {
  reportId: string;
  schoolId: string;
  category: EscalationCategory;
  destinationLabel: string;
  routeId?: string;
  notes?: string;
}): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.reportId).success) return fail("Invalid report ID.");
  if (!categorySchema.safeParse(input.category).success) return fail("Pick a category.");
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  if (!(await schoolReport(input.schoolId, input.reportId)))
    return fail("That report isn't in your school's queue.");

  const notes = input.notes ? cleanText(input.notes).slice(0, 1000) : null;
  const admin = createAdminClient();
  // The destination comes from the school's configured route, never free text.
  const { data: route } =
    input.routeId && uuidSchema.safeParse(input.routeId).success
      ? await admin
          .from("escalation_routes")
          .select("id, destination_label")
          .eq("id", input.routeId)
          .eq("school_id", input.schoolId)
          .maybeSingle()
      : { data: null };
  if (!route) return fail("Pick one of your school's escalation routes first.");
  input = { ...input, destinationLabel: route.destination_label, routeId: route.id };

  const { data: escalation, error } = await admin
    .from("escalations")
    .upsert(
      {
        school_id: input.schoolId,
        report_id: input.reportId,
        category: input.category,
        route_id: input.routeId || null,
        destination_label: input.destinationLabel,
        status: "forwarded",
        forwarded_at: new Date().toISOString(),
        forwarded_by: actorId,
        notes,
      },
      { onConflict: "report_id" },
    )
    .select("id")
    .single();

  if (error) return fail("Couldn't record escalation: " + error.message);

  await admin
    .from("reports")
    .update({
      status: "actioned",
      resolution_note: `Escalated to ${input.destinationLabel}`,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.reportId);

  await admin.from("moderation_log").insert({
    actor_id: actorId,
    report_id: input.reportId,
    action: "escalate_report",
    meta: {
      school_id: input.schoolId,
      destination: input.destinationLabel,
      category: input.category,
      notes,
    },
  });

  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: "report_escalated",
    entity: "escalation",
    entityId: escalation.id,
    meta: { destination: input.destinationLabel, category: input.category },
  });

  revalidatePath("/staff/safety");
  return ok();
}

const fileSeriousReportSchema = z.object({
  reportedId: z.string().uuid(),
  category: categorySchema.optional(),
  reason: z.enum(["fake", "harassment", "spam", "scam", "inappropriate", "safety", "other"]),
  details: z.string().max(1000).optional(),
  messageId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  studentConsented: z.boolean().default(false),
  blockUserNow: z.boolean().default(false),
});

export async function getActiveEscalationRoutes(): Promise<EscalationRoute[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return [];
  const schoolId = profile.school_id;

  const admin = createAdminClient();
  const { data } = await admin
    .from("escalation_routes")
    .select(
      "id, school_id, category, destination_label, url, phone, email, active, created_at, updated_at",
    )
    .eq("school_id", schoolId)
    .eq("active", true);

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    category: row.category as EscalationCategory,
    destinationLabel: row.destination_label,
    url: row.url,
    phone: row.phone,
    email: row.email,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function fileSeriousReport(
  input: z.input<typeof fileSeriousReportSchema>,
): Promise<ActionResult<{ forwardedTo: string | null }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");

  const parsed = fileSeriousReportSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid report details.");
  if (parsed.data.reportedId === user.id) return fail("You cannot report yourself.");

  if (!(await rateLimit(`report:${user.id}`, LIMITS.reportsPerDay))) {
    return fail("You have filed several reports today. Our safety team is actively reviewing.");
  }

  const supabase = createClient();
  const admin = createAdminClient();

  // Get user's school
  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();
  if (!profile) return fail("Please sign in again.");
  const schoolId = profile.school_id;

  // Check reported message excerpt if present
  let excerpt: string | null = null;
  if (parsed.data.messageId) {
    const { data: msg } = await supabase
      .from("messages")
      .select("body, sender_id")
      .eq("id", parsed.data.messageId)
      .maybeSingle();
    if (msg?.sender_id === parsed.data.reportedId) {
      excerpt = msg.body.slice(0, 500);
    }
  }

  // Insert base report
  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      reported_id: parsed.data.reportedId,
      reason: parsed.data.reason,
      details: parsed.data.details ? cleanText(parsed.data.details) : null,
      context: {
        message_id: parsed.data.messageId ?? null,
        conversation_id: parsed.data.conversationId ?? null,
        excerpt,
      },
    })
    .select("id")
    .single();

  if (error || !report) return fail("Couldn't file report. Please try again.");

  // If a serious category was chosen, create the escalation entry
  let forwardedTo: string | null = null;
  if (parsed.data.category) {
    const { data: route } = await admin
      .from("escalation_routes")
      .select("id, destination_label, email")
      .eq("school_id", schoolId)
      .eq("category", parsed.data.category)
      .eq("active", true)
      .maybeSingle();

    // With no route configured, nothing is implied: the student sees national resources only.
    await admin.from("escalations").insert({
      school_id: schoolId,
      report_id: report.id,
      category: parsed.data.category,
      route_id: route?.id ?? null,
      destination_label: route?.destination_label ?? "",
      student_consented: parsed.data.studentConsented,
      status: parsed.data.studentConsented && route?.email ? "forwarded" : "pending",
      forwarded_at: parsed.data.studentConsented && route?.email ? new Date().toISOString() : null,
    });

    // Only when the student chose to, and only to the address the school configured.
    if (parsed.data.studentConsented && route?.email) {
      const [{ data: me }, { data: settings }] = await Promise.all([
        admin.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
        admin.from("user_settings").select("email").eq("user_id", user.id).maybeSingle(),
      ]);
      const label =
        ESCALATION_CATEGORIES.find((c) => c.key === parsed.data.category)?.label ??
        "Safety concern";
      const sent = await sendEmail({
        to: route.email,
        ...escalationForwardEmail({
          office: route.destination_label,
          category: label,
          reporterFirstName: me?.first_name ?? "A student",
          reporterEmail: settings?.email ?? "",
          details: parsed.data.details ? cleanText(parsed.data.details) : null,
          excerpt,
        }),
      });
      if (sent) forwardedTo = route.destination_label;
    }
  }

  // One-tap block if requested
  if (parsed.data.blockUserNow) {
    await supabase
      .from("blocks")
      .upsert(
        { blocker_id: user.id, blocked_id: parsed.data.reportedId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
    await admin
      .from("intros")
      .update({ status: "withdrawn", responded_at: new Date().toISOString() })
      .eq("status", "pending")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${parsed.data.reportedId}),and(sender_id.eq.${parsed.data.reportedId},recipient_id.eq.${user.id})`,
      );
  }

  revalidatePath("/matches");
  revalidatePath("/messages");
  return ok({ forwardedTo });
}

/** A school moderator restores or removes an intro clip that two reports hid. */
export async function reviewProfileMedia(input: {
  schoolId: string;
  userId: string;
  decision: "restore" | "remove";
}): Promise<ActionResult> {
  if (
    !uuidSchema.safeParse(input.userId).success ||
    !["restore", "remove"].includes(input.decision)
  )
    return fail("Check the clip.");
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  if (!(await schoolStudent(input.schoolId, input.userId)))
    return fail("That student isn't at your school.");
  const admin = createAdminClient();
  const { data: media } = await admin
    .from("profile_media")
    .select("path, status")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!media || media.status !== "hidden") return fail("That clip was already reviewed.");
  if (input.decision === "restore") {
    await admin.from("profile_media_reports").delete().eq("media_user_id", input.userId);
    await admin
      .from("profile_media")
      .update({ status: "active", reviewed_by: actorId, reviewed_at: new Date().toISOString() })
      .eq("user_id", input.userId);
  } else {
    await admin
      .from("profile_media")
      .update({ status: "removed", reviewed_by: actorId, reviewed_at: new Date().toISOString() })
      .eq("user_id", input.userId);
    await admin.storage.from("intros-media").remove([media.path]);
  }
  await admin.from("moderation_log").insert({
    actor_id: actorId,
    target_id: input.userId,
    action: input.decision === "restore" ? "media_restored" : "media_removed",
    meta: { school_id: input.schoolId },
  });
  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: input.decision === "restore" ? "media_restored" : "media_removed",
    entity: "profile_media",
    entityId: input.userId,
  });
  revalidatePath("/staff/safety");
  return ok();
}

/**
 * Phase 0.5: lets the school send its students' message text to the AI screening model.
 * Off by default; only a housing admin can turn it on, and every change is audited.
 */
export async function setAiScreening(schoolId: string, enabled: boolean): Promise<ActionResult> {
  if (!schoolIdSchema.safeParse(schoolId).success || typeof enabled !== "boolean")
    return fail("Couldn't save.");
  const actorId = await assertRole(schoolId, "configureSchool");
  if (!actorId) return fail("Only housing admins can change message screening.");
  if (!(await rateLimit(`staff-writes:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const { error } = await createAdminClient()
    .from("schools")
    .update({ ai_moderation_enabled: enabled })
    .eq("id", schoolId);
  if (error) return fail("Couldn't save.");
  await logAudit({
    actorId,
    schoolId,
    action: enabled ? "ai_screening_enabled" : "ai_screening_disabled",
    entity: "school",
    entityId: schoolId,
  });
  revalidatePath("/staff/settings/escalation");
  return ok();
}
