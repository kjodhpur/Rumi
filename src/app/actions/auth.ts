"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { isAsuEmail } from "@/lib/utils";

export type AuthState = { error?: string; success?: string };

export async function sendMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const emailRaw = String(formData.get("email") ?? "");
  const parsed = emailSchema.safeParse(emailRaw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }
  if (!isAsuEmail(parsed.data)) {
    return { error: "Rumi is for ASU students — please use your @asu.edu email." };
  }

  const limit = rateLimit(`auth:${parsed.data.toLowerCase()}`, 5, 15 * 60_000);
  if (!limit.ok) {
    return { error: "Too many login attempts. Try again in a few minutes." };
  }

  const supabase = createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.toLowerCase(),
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("asu")) {
      return { error: "Rumi is for ASU students — please use your @asu.edu email." };
    }
    return { error: error.message };
  }

  return { success: "Check your ASU inbox for a magic link to sign in." };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
