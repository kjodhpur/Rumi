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
import { ESCALATION_CATEGORIES, type EscalationCategory, type EscalationRoute } from "@/lib/safety/escalation";
import type { SchoolReportStatus } from "@/lib/staff/safety";

const uuidSchema = z.string().uuid();
const categorySchema = z.enum(["harassment", "threat", "discrimination", "wellbeing", "general"]);

const routeSchema = z.object({
  id: z.string().uuid().optional(),
  schoolId: z.string().min(1),
  category: categorySchema,
  destinationLabel: z.string().min(2).max(120),
  url: z.string().url().max(500).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email().max(120).optional().or(z.literal("")),
  active: z.boolean(),
});

export async function saveEscalationRoute(input: z.infer<typeof routeSchema>): Promise<ActionResult> {
  const parsed = routeSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid route configuration.");

  const actorId = await assertRole(parsed.data.schoolId, "configureEscalation");
  if (!actorId) return fail("Housing admins only.");

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
    const { error } = await db.from("escalation_routes").update(payload).eq("id", parsed.data.id).eq("school_id", parsed.data.schoolId);
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

export async function deleteEscalationRoute(input: { routeId: string; schoolId: string }): Promise<ActionResult> {
  if (!uuidSchema.safeParse(input.routeId).success) return fail("Invalid route ID.");
  const actorId = await assertRole(input.schoolId, "configureEscalation");
  if (!actorId) return fail("Housing admins only.");

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
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");

  const resolution = input.note ? cleanText(input.note) : null;
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

  const warningNote = cleanText(input.note);
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
  if (actorId === input.userId) return fail("You cannot suspend yourself.");

  const reason = cleanText(input.reason) || "Violation of community standards";
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

  const admin = createAdminClient();
  const note = input.note ? cleanText(input.note) : null;

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
  const actorId = await assertRole(input.schoolId, "moderate");
  if (!actorId) return fail("Moderators or housing admins only.");

  const notes = input.notes ? cleanText(input.notes) : null;
  const admin = createAdminClient();

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
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle();
  const schoolId = profile?.school_id ?? "asu";

  const admin = createAdminClient();
  const { data } = await admin
    .from("escalation_routes")
    .select("id, school_id, category, destination_label, url, phone, email, active, created_at, updated_at")
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

export async function fileSeriousReport(input: z.infer<typeof fileSeriousReportSchema>): Promise<ActionResult> {
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
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
  const schoolId = profile?.school_id ?? "asu";

  // Check reported message excerpt if present
  let excerpt: string | null = null;
  if (parsed.data.messageId) {
    const { data: msg } = await supabase.from("messages").select("body, sender_id").eq("id", parsed.data.messageId).maybeSingle();
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
  if (parsed.data.category) {
    const { data: route } = await admin
      .from("escalation_routes")
      .select("id, destination_label")
      .eq("school_id", schoolId)
      .eq("category", parsed.data.category)
      .eq("active", true)
      .maybeSingle();

    const destLabel = route?.destination_label ?? "Campus Safety & Student Affairs";

    await admin.from("escalations").insert({
      school_id: schoolId,
      report_id: report.id,
      category: parsed.data.category,
      route_id: route?.id ?? null,
      destination_label: destLabel,
      student_consented: parsed.data.studentConsented,
      status: "pending",
    });
  }

  // One-tap block if requested
  if (parsed.data.blockUserNow) {
    await supabase.from("blocks").upsert(
      { blocker_id: user.id, blocked_id: parsed.data.reportedId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
    await admin
      .from("intros")
      .update({ status: "withdrawn", responded_at: new Date().toISOString() })
      .eq("status", "pending")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${parsed.data.reportedId}),and(sender_id.eq.${parsed.data.reportedId},recipient_id.eq.${user.id})`);
  }

  revalidatePath("/matches");
  revalidatePath("/messages");
  return ok();
}
