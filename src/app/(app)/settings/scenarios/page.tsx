import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadActiveQuestions } from "@/lib/matching/questions";
import { ScenarioQuestions } from "@/components/matching/scenario-questions";
import { SettingsBack } from "@/components/settings/settings-ui";
import { ErrorState } from "@/components/ui/error-state";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("settingsPages"))("scenarios.title") };
}
export const dynamic = "force-dynamic";

export default async function ScenariosSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/settings/scenarios");

  const supabase = createClient();
  const [{ data: me }, { data: rows, error }] = await Promise.all([
    supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle(),
    supabase
      .from("school_question_answers")
      .select("question_key, question_version, choice_key")
      .eq("user_id", user.id),
  ]);
  if (!me) redirect("/onboarding");
  const questions = await loadActiveQuestions(me.school_id);

  // Only answers to the current version count; older ones show as "answer again".
  const answers: Record<string, string> = {};
  const outdated = new Set<string>();
  for (const row of rows ?? []) {
    const q = questions.find((x) => x.key === row.question_key);
    if (!q) continue;
    if (q.version === row.question_version) answers[q.key] = row.choice_key;
    else outdated.add(q.key);
  }

  const t = await getT("settingsPages");
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <SettingsBack title={t("scenarios.title")} description={t("scenarios.description")} />
      {error ? (
        <ErrorState title={t("scenarios.loadError")} description={t("scenarios.loadErrorBody")} />
      ) : (
        <ScenarioQuestions
          initialAnswers={answers}
          questions={questions.map((q) => ({
            key: q.key,
            stem: q.stem,
            builtIn: !q.schoolId,
            outdated: outdated.has(q.key),
            choices: q.choices.map((c) => ({ key: c.key, label: c.label })),
          }))}
        />
      )}
    </div>
  );
}
