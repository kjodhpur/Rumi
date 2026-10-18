"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Forbidden");
  }
  return { user, admin: createAdminClient() };
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed") {
  const { admin } = await requireAdmin();
  await admin.from("reports").update({ status }).eq("id", reportId);
  revalidatePath("/admin");
  return { ok: true };
}

export async function suspendUser(userId: string, suspended: boolean) {
  const { admin } = await requireAdmin();
  await admin.from("profiles").update({ suspended }).eq("id", userId);
  revalidatePath("/admin");
  return { ok: true };
}
