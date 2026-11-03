"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff/context";
import { encrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/staff/audit";
import { getHousingAdapter } from "@/lib/integrations/starrez/adapter";
import { parseStarRezQuestionnaireCsv, mapStarRezAnswer } from "@/lib/integrations/starrez/questionnaire";
import { Database } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function saveStarRezCredentials(
  schoolId: string,
  baseUrl: string,
  apiKey: string,
  clientSecret?: string
) {
  const actorId = await assertRole(schoolId, "export");
  if (!actorId) return { ok: false, error: "unauthorized" };

  const db = createAdminClient();
  const credentialsJson = JSON.stringify({ apiKey, clientSecret: clientSecret || "" });
  const credentialsEnc = encrypt(credentialsJson);

  const { error } = await db.from("integration_credentials").upsert({
    school_id: schoolId,
    provider: "starrez",
    base_url: baseUrl,
    credentials_enc: credentialsEnc,
    active: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit({
    actorId,
    schoolId,
    action: "saved_starrez_credentials",
    entity: "integration",
    meta: { provider: "starrez", baseUrl },
  });

  revalidatePath("/staff/integrations/starrez");
  return { ok: true };
}

export async function testStarRezConnection(schoolId: string) {
  const actorId = await assertRole(schoolId, "export");
  if (!actorId) return { ok: false, provider: "starrez", message: "Unauthorized: housing_admin role required" };

  const adapter = getHousingAdapter(schoolId, "starrez");
  const result = await adapter.testConnection();

  await logAudit({
    actorId,
    schoolId,
    action: "tested_starrez_connection",
    entity: "integration",
    meta: { ok: result.ok, message: result.message },
  });

  return result;
}

export async function syncStarRezGroups(schoolId: string, pairingIds?: string[]) {
  const actorId = await assertRole(schoolId, "export");
  if (!actorId) {
    return {
      success: false,
      recordsPushed: 0,
      errors: [{ id: "auth", error: "Unauthorized: housing_admin role required" }],
    };
  }

  const adapter = getHousingAdapter(schoolId, "starrez");
  const result = await adapter.pushRoommateGroups(schoolId, pairingIds);

  await logAudit({
    actorId,
    schoolId,
    action: "synced_starrez_groups",
    entity: "pairing",
    meta: { pushed: result.recordsPushed, errorCount: result.errors.length },
  });

  revalidatePath("/staff/integrations/starrez");
  return result;
}

export async function pullStarRezAssignments(schoolId: string) {
  const actorId = await assertRole(schoolId, "export");
  if (!actorId) return { error: "unauthorized" };

  const adapter = getHousingAdapter(schoolId, "starrez");
  const assignments = await adapter.pullAssignments(schoolId);

  await logAudit({
    actorId,
    schoolId,
    action: "pulled_starrez_assignments",
    entity: "assignment",
    meta: { count: assignments.length },
  });

  revalidatePath("/staff/integrations/starrez");
  return { ok: true, count: assignments.length };
}

export async function importQuestionnaireCsv(schoolId: string, csvContent: string) {
  const actorId = await assertRole(schoolId, "export");
  if (!actorId) return { error: "unauthorized" };

  const parsed = parseStarRezQuestionnaireCsv(csvContent);
  if (parsed.length === 0) {
    return { error: "No valid questionnaire rows found in CSV." };
  }

  const db = createAdminClient();
  const rowsToInsert = [];
  let unmappedCount = 0;

  for (const item of parsed) {
    const mapped = mapStarRezAnswer(item.questionCode, item.rawValue);
    if (!mapped) {
      unmappedCount++;
      continue;
    }

    rowsToInsert.push({
      school_id: schoolId,
      external_student_id: item.externalStudentId,
      source: "starrez",
      question_code: item.questionCode,
      raw_value: item.rawValue,
      mapped_factor: mapped.mappedFactor,
      mapped_value: mapped.mappedValue,
    });
  }

  if (rowsToInsert.length > 0) {
    const { error } = await db.from("imported_answers").insert(rowsToInsert);
    if (error) {
      return { error: error.message };
    }
  }

  await logAudit({
    actorId,
    schoolId,
    action: "imported_questionnaire_csv",
    entity: "integration",
    meta: { total: parsed.length, imported: rowsToInsert.length, unmapped: unmappedCount },
  });

  revalidatePath("/staff/integrations/starrez");
  return { ok: true, imported: rowsToInsert.length, unmapped: unmappedCount };
}

/**
 * Returns unconfirmed imported questionnaire answers for the logged-in student.
 */
export async function getStudentImportedAnswers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("imported_answers")
    .select("id, question_code, raw_value, mapped_factor, mapped_value")
    .eq("user_id", user.id)
    .is("confirmed_at", null);

  return data ?? [];
}

/**
 * Confirms imported answers and applies them to the student's preferences.
 */
export async function confirmStudentImportedAnswers(answerIds: string[]) {
  if (answerIds.length === 0) return { ok: true };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const { data: answers } = await supabase
    .from("imported_answers")
    .select("id, mapped_factor, mapped_value")
    .in("id", answerIds)
    .eq("user_id", user.id);

  if (!answers || answers.length === 0) return { ok: true };

  const prefUpdates: Record<string, unknown> = {};
  for (const ans of answers) {
    if (["cleanliness", "sleep_schedule", "noise", "guests"].includes(ans.mapped_factor)) {
      prefUpdates[ans.mapped_factor] = parseInt(ans.mapped_value, 10);
    } else {
      prefUpdates[ans.mapped_factor] = ans.mapped_value;
    }
  }

  if (Object.keys(prefUpdates).length > 0) {
    await supabase
      .from("preferences")
      .update(prefUpdates as Database["public"]["Tables"]["preferences"]["Update"])
      .eq("user_id", user.id);
  }

  await supabase
    .from("imported_answers")
    .update({ confirmed_at: new Date().toISOString() })
    .in("id", answerIds)
    .eq("user_id", user.id);

  revalidatePath("/onboarding");
  revalidatePath("/settings/profile");
  return { ok: true, confirmedCount: answers.length };
}
