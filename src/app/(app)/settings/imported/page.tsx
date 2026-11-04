import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { SettingsBack } from "@/components/settings/settings-ui";
import { ImportedAnswers } from "@/components/settings/imported-answers";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("settingsPages"))("imported.title") };
}
export const dynamic = "force-dynamic";

export default async function ImportedAnswersPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/settings/imported");
  const supabase = createClient();
  const [{ data: answers }, { data: prefs }, { data: me }] = await Promise.all([
    supabase
      .from("imported_answers")
      .select("mapped_factor, mapped_value, question_code, raw_value")
      .eq("user_id", user.id)
      .is("confirmed_at", null)
      .is("dismissed_at", null),
    supabase
      .from("preferences")
      .select("sleep_schedule, cleanliness, noise, guests, smoking, drinking, pets, study")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("schools(housing_office_name)")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const [t, tp] = await Promise.all([getT("settingsPages"), getT("privacy")]);
  const office =
    (me?.schools as { housing_office_name: string | null } | null)?.housing_office_name ??
    tp("yourOffice");
  const description = t("imported.description", { office });
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <SettingsBack
        title={t("imported.title")}
        description={description.charAt(0).toUpperCase() + description.slice(1)}
      />
      <ImportedAnswers
        answers={(answers ?? []).map((a) => ({
          factor: a.mapped_factor,
          value: a.mapped_value,
          current: prefs ? String((prefs as Record<string, unknown>)[a.mapped_factor] ?? "") : "",
        }))}
      />
    </div>
  );
}
