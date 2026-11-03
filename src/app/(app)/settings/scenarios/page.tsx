import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { ScenarioQuestions } from "@/components/matching/scenario-questions";

export const metadata: Metadata = { title: "Roommate Scenarios" };
export const dynamic = "force-dynamic";

export default async function ScenariosSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/settings/scenarios");

  const supabase = createClient();
  const { data } = await supabase
    .from("school_question_answers")
    .select("question_id, choice_key")
    .eq("user_id", user.id);

  const initialAnswers: Record<string, string> = {};
  for (const row of data || []) {
    initialAnswers[row.question_id] = row.choice_key;
  }

  return (
    <div className="mx-auto max-w-[680px] space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-ink-2 hover:text-ink"
        >
          <ChevronLeft className="size-4" /> Back to settings
        </Link>
      </div>

      <div>
        <h1 className="font-display text-display-md text-ink">Roommate Scenarios</h1>
        <p className="mt-1 text-body-sm text-ink-2">
          Answer concrete situations about dishes, noise, guests, and study habits. Your answers help us find roommates who handle everyday situations the same way you do.
        </p>
      </div>

      <ScenarioQuestions initialAnswers={initialAnswers} />
    </div>
  );
}
