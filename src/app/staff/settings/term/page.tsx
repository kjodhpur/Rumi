import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadActiveTerm } from "@/lib/staff/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSchoolQuestions } from "@/lib/matching/questions";
import { parseTermConfig } from "@/lib/staff/term-config";
import { CAMPUS_TZ } from "@/lib/time";
import {
  effectiveRules,
  schedulePreview,
  type DeadlineKey,
} from "@/lib/notifications/deadline-nudges";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TermSettings } from "@/components/staff/term-settings";
import { WeightModels, type WeightModelView } from "@/components/staff/weight-models";
import { LIFESTYLE_FACTORS } from "@/lib/matching/weights-optimizer";
import type { Json } from "@/types/database";
import {
  MatchingRules,
  NextTermButton,
  NudgeSettings,
  QuestionBank,
  type OptionView,
} from "@/components/staff/term-config";

export const metadata: Metadata = { title: "Term" };
export const dynamic = "force-dynamic";

export default async function TermPage() {
  const context = await requireStaffPage("configureTerm");
  const school = context.school.id;
  const db = createAdminClient();
  const [
    term,
    questions,
    { data: termRow },
    { data: rules },
    { data: schoolRow },
    { data: options },
    { data: nudgeRows },
  ] = await Promise.all([
    loadActiveTerm(school),
    loadSchoolQuestions(school),
    db.from("terms").select("config").eq("school_id", school).eq("active", true).maybeSingle(),
    db.from("school_rules").select("rule_type, active").eq("school_id", school),
    db.from("schools").select("merge_track_pools").eq("id", school).maybeSingle(),
    db
      .from("school_options")
      .select("kind, value, label, active")
      .eq("school_id", school)
      .order("position"),
    db
      .from("nudge_rules")
      .select("id, deadline_key, offsets, channels, paused")
      .eq("school_id", school),
  ]);
  const { data: modelRows } = await db
    .from("weight_models")
    .select("id, status, created_at, trained_on_terms, coefficients, metrics, suggested_weights")
    .eq("school_id", school)
    .in("status", ["suggested", "adopted"])
    .order("created_at", { ascending: false });
  const models = (modelRows ?? []).map(toModelView);
  const config = parseTermConfig(termRow?.config);
  const deadlines = (term?.deadlines ?? {}) as Partial<Record<DeadlineKey, string>>;
  const nudgeRules = effectiveRules(
    (nudgeRows ?? []).map((r) => ({
      id: r.id,
      deadlineKey: r.deadline_key as DeadlineKey,
      offsets: r.offsets,
      channels: r.channels,
      paused: r.paused,
    })),
    deadlines,
  );
  const today = new Date().toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Term"
        description="The housing term students are matching for: dates, reminders, your questions and matching rules."
        actions={term ? <NextTermButton schoolId={school} /> : undefined}
        className="pb-0 lg:pb-0"
      />
      <Tabs defaultValue="dates">
        <TabsList className="mb-6 scrollbar-none overflow-x-auto">
          <TabsTrigger value="dates">Dates</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="matching">Matching rules</TabsTrigger>
        </TabsList>
        <TabsContent value="dates" className="outline-none">
          <TermSettings schoolId={school} term={term} />
        </TabsContent>
        <TabsContent value="reminders" className="outline-none">
          <NudgeSettings
            schoolId={school}
            rules={nudgeRules}
            schedule={schedulePreview(nudgeRules, deadlines, today)}
          />
        </TabsContent>
        <TabsContent value="questions" className="outline-none">
          <QuestionBank schoolId={school} questions={questions} config={config} />
        </TabsContent>
        <TabsContent value="matching" className="outline-none">
          <MatchingRules
            schoolId={school}
            rules={(rules ?? []).map((r) => ({ type: r.rule_type, active: r.active }))}
            mergeTrackPools={Boolean(schoolRow?.merge_track_pools)}
            options={(options ?? []).map((o) => ({
              kind: o.kind as OptionView["kind"],
              value: o.value,
              label: o.label,
              active: o.active,
            }))}
            config={config}
          />
          {context.role === "housing_admin" || context.role === "platform_admin" ? (
            <div className="mt-8">
              <WeightModels schoolId={school} models={models} />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function toModelView(m: {
  id: string;
  status: string;
  created_at: string;
  trained_on_terms: string[];
  coefficients: Json;
  metrics: Json;
  suggested_weights: Json;
}): WeightModelView {
  const obj = (v: Json) =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Json>) : {};
  const num = (v: Json | undefined) => (typeof v === "number" ? v : 0);
  const coefs = obj(m.coefficients);
  const metrics = obj(m.metrics);
  const suggested = obj(m.suggested_weights);
  return {
    id: m.id,
    status: m.status === "adopted" ? "adopted" : "suggested",
    createdAt: m.created_at,
    rows: num(metrics.rows),
    positives: num(metrics.positives),
    auc: num(metrics.auc),
    terms: m.trained_on_terms.length,
    factors: LIFESTYLE_FACTORS.map((factor) => {
      const c = obj(coefs[factor] ?? null);
      const evidence = c.evidence === "positive" || c.evidence === "negative" ? c.evidence : "none";
      return {
        factor,
        coef: num(c.coef),
        low: num(c.low),
        high: num(c.high),
        evidence,
        suggested: num(suggested[factor]),
      };
    }),
  };
}
