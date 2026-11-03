import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron";
import {
  calculateDaysUntil,
  evaluateNudgeEligibility,
  formatNudgeCopy,
  type DeadlineKey,
} from "@/lib/notifications/deadline-nudges";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  // Fetch active terms with configured deadlines
  const { data: terms, error: termsError } = await db
    .from("terms")
    .select("id, school_id, deadlines")
    .order("created_at", { ascending: false });

  if (termsError) {
    return NextResponse.json({ error: termsError.message }, { status: 500 });
  }

  // Fetch active (non-paused) nudge rules
  const { data: rules, error: rulesError } = await db
    .from("nudge_rules")
    .select("id, school_id, deadline_key, offsets, paused")
    .eq("paused", false);

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  let nudgesSent = 0;
  const processedStudents = new Set<string>();

  for (const term of terms ?? []) {
    const deadlines = term.deadlines as Record<string, string> | null;
    if (!deadlines) continue;

    const schoolRules = (rules ?? []).filter((r) => r.school_id === term.school_id);

    for (const rule of schoolRules) {
      const deadlineDate = deadlines[rule.deadline_key];
      if (!deadlineDate) continue;

      const daysUntil = calculateDaysUntil(deadlineDate, now);
      const eligibility = evaluateNudgeEligibility(
        {
          deadlineKey: rule.deadline_key as DeadlineKey,
          offsets: rule.offsets,
          paused: rule.paused,
        },
        daysUntil,
      );

      if (!eligibility.shouldSend || eligibility.offsetDays === null) continue;

      // Find candidates for this school who have not yet satisfied the milestone
      const { data: candidates } = await db
        .from("profiles")
        .select("id")
        .eq("school_id", term.school_id)
        .eq("is_staff", false)
        .is("banned_at", null)
        .not("onboarding_completed_at", "is", null);

      if (!candidates?.length) continue;

      const copy = formatNudgeCopy(rule.deadline_key as DeadlineKey, eligibility.offsetDays);

      for (const candidate of candidates) {
        const key = `${rule.id}-${candidate.id}-${eligibility.offsetDays}`;
        if (processedStudents.has(key)) continue;

        // Check if already sent
        const { data: existing } = await db
          .from("nudge_sends")
          .select("id")
          .eq("rule_id", rule.id)
          .eq("user_id", candidate.id)
          .eq("offset_days", eligibility.offsetDays)
          .maybeSingle();

        if (existing) continue;

        // Record send and create notification
        await db.from("nudge_sends").insert({
          rule_id: rule.id,
          user_id: candidate.id,
          offset_days: eligibility.offsetDays,
          sent_at: now,
        });

        await db.from("notifications").insert({
          user_id: candidate.id,
          type: "deadline_nudge",
          title: copy.title,
          body: copy.body,
          href: copy.link,
          created_at: now,
        });

        processedStudents.add(key);
        nudgesSent++;
      }
    }
  }

  return NextResponse.json({
    status: "ok",
    sent: nudgesSent,
    evaluatedAt: now,
  });
}
