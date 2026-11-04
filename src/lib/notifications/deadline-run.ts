import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAMPUS_TZ } from "@/lib/time";
import { deadlineNudgeEmail } from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n/config";
import { localizeNotice } from "@/lib/i18n/notifications";
import { dispatch } from "./dispatch";
import { selectAll, selectByIds } from "@/lib/supabase/paginate";
import {
  DEADLINE_KEYS,
  dueOffset,
  effectiveRules,
  needsNudge,
  nudgeCopy,
  type DeadlineKey,
  type NudgeRule,
} from "./deadline-nudges";

/**
 * Daily: for each active term's deadlines, nudge the students each deadline is about at
 * T-7, T-2 and T-0 (or the school's offsets). nudge_sends is unique per rule, student,
 * deadline date and offset, so a rerun never sends twice; an edited deadline sends afresh.
 */
export async function runDeadlineNudges(
  today = new Date().toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ }),
) {
  const db = createAdminClient();
  const { data: terms } = await db
    .from("terms")
    .select("id, school_id, deadlines, schools(housing_office_name)")
    .eq("active", true);
  let sent = 0;
  for (const term of terms ?? []) {
    const raw = (term.deadlines ?? {}) as Record<string, unknown>;
    const deadlines = Object.fromEntries(
      DEADLINE_KEYS.filter(
        (k) => typeof raw[k] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw[k] as string),
      ).map((k) => [k, raw[k] as string]),
    ) as Partial<Record<DeadlineKey, string>>;
    const { data: saved } = await db
      .from("nudge_rules")
      .select("id, deadline_key, offsets, channels, paused")
      .eq("school_id", term.school_id);
    const rules = effectiveRules(
      (saved ?? []).map((r) => ({
        id: r.id,
        deadlineKey: r.deadline_key as DeadlineKey,
        offsets: r.offsets,
        channels: r.channels,
        paused: r.paused,
      })),
      deadlines,
    );
    const due = rules
      .filter((r) => !r.paused)
      .map((r) => ({ rule: r, offset: dueOffset(r.offsets, deadlines[r.deadlineKey]!, today) }))
      .filter((x): x is { rule: NudgeRule; offset: number } => x.offset !== null);
    if (!due.length) continue;

    const students = await selectAll((from, to) =>
      db.rpc("school_students", { p_school: term.school_id }).order("id").range(from, to),
    );
    const onboarded = students.filter((s) => s.onboarding_completed_at);
    const ids = onboarded.map((s) => s.id);
    const members = await selectByIds(ids, (c, f, t) =>
      db
        .from("group_members")
        .select("user_id, group_id")
        .in("user_id", c)
        .order("user_id")
        .order("group_id")
        .range(f, t),
    );
    const groupIds = [...new Set(members.map((m) => m.group_id))];
    const [sizes, agreements] = await Promise.all([
      selectByIds(groupIds, (c, f, t) =>
        db
          .from("group_members")
          .select("group_id, user_id")
          .in("group_id", c)
          .order("group_id")
          .order("user_id")
          .range(f, t),
      ),
      selectByIds(groupIds, (c, f, t) =>
        db
          .from("agreements")
          .select("id, group_id, status")
          .in("group_id", c)
          .order("id")
          .range(f, t),
      ),
    ]);
    const size = new Map<string, number>();
    for (const g of sizes ?? []) size.set(g.group_id, (size.get(g.group_id) ?? 0) + 1);
    const signed = new Set(
      (agreements ?? []).filter((a) => a.status === "signed").map((a) => a.group_id),
    );
    const office =
      (term.schools as { housing_office_name: string | null } | null)?.housing_office_name ??
      "Your housing office";

    for (const { rule, offset } of due) {
      // Rules saved on first use, so sends can reference them.
      let ruleId = rule.id;
      if (!ruleId) {
        const { data: created } = await db
          .from("nudge_rules")
          .upsert(
            {
              school_id: term.school_id,
              deadline_key: rule.deadlineKey,
              offsets: rule.offsets,
              channels: rule.channels,
            },
            { onConflict: "school_id,deadline_key" },
          )
          .select("id")
          .single();
        ruleId = created?.id ?? null;
      }
      if (!ruleId) continue;
      const deadline = deadlines[rule.deadlineKey]!;
      const copy = nudgeCopy(rule.deadlineKey, offset, office);
      for (const id of ids) {
        const m = (members ?? []).find((x) => x.user_id === id);
        const confirmed = m ? (size.get(m.group_id) ?? 0) >= 2 : false;
        if (
          !needsNudge(rule.deadlineKey, {
            confirmed,
            agreementSigned: m ? signed.has(m.group_id) : false,
          })
        )
          continue;
        const { error } = await db.from("nudge_sends").insert({
          rule_id: ruleId,
          user_id: id,
          deadline_on: deadline,
          offset_days: offset,
          channels: rule.channels,
        });
        if (error) continue; // already sent (unique) or failed: never double-send
        await dispatch({
          kind: "deadlines",
          notice: {
            userId: id,
            type: "deadline_nudge",
            entityId: ruleId,
            title: copy.title,
            body: copy.body,
            href: copy.href,
          },
          email: rule.channels.includes("email")
            ? (locale: Locale) =>
                deadlineNudgeEmail(
                  {
                    title: localizeNotice(copy.title, locale),
                    body: localizeNotice(copy.body, locale),
                    href: copy.href,
                  },
                  locale,
                )
            : undefined,
        });
        sent += 1;
      }
    }
  }
  return { sent };
}
