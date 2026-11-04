"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { emailSchema, firstError, otpSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action";
import { publicEnv, serverEnv } from "@/lib/env";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { hashPersonalEmail } from "@/lib/admissions/allowlist";

const SUSPENDED_MESSAGE = `This account is suspended. Email ${publicEnv.supportEmail} if you think that's a mistake.`;

function isBanned(error: { code?: string; message: string }) {
  return error.code === "user_banned" || /banned/i.test(error.message);
}

function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login"))
    return null;
  return next;
}

/** Runs after any successful school-email sign-in (OTP, magic link or Google). */
export async function afterSignIn(user: User) {
  const admin = createAdminClient();
  const email = (user.email ?? "").toLowerCase();
  const { data: school } = await admin.rpc("school_for_email", { p_email: email });
  // Signing in with the school inbox re-confirms student status for another year.
  if (school) {
    const now = new Date().toISOString();
    // Signing in also counts as activity, which resets any inactivity-deletion warning.
    await admin
      .from("profiles")
      .update({ student_verified_at: now, last_active_at: now, inactivity_warned_at: null })
      .eq("id", user.id);
  }
  if (serverEnv.adminEmails.includes(email)) {
    await admin.from("admins").upsert({ user_id: user.id }, { onConflict: "user_id" });
  }
}

export async function destinationFor(userId: string, next?: string | null) {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, is_staff")
    .eq("id", userId)
    .maybeSingle();
  const target = safeNext(next);
  // Staff invites must open before onboarding; staff never onboard as students.
  if (target?.startsWith("/invite/")) return target;
  if (data?.is_staff) return target?.startsWith("/staff") ? target : "/staff";
  if (!data?.onboarding_completed_at) return "/onboarding";
  return target ?? "/matches";
}

export async function requestCode(rawEmail: string): Promise<ActionResult<{ email: string }>> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return fail(firstError(parsed.error));
  const email = parsed.data;

  const supabase = createClient();
  const { data: school } = await supabase.rpc("school_for_email", { p_email: email });
  // Admitted students without a school account yet: a personal email on their school's
  // admit list (3.1). The database trigger re-checks this when the account is created.
  const admitted = school
    ? null
    : (
        await createAdminClient().rpc("admit_school_for", {
          p_email_hash: hashPersonalEmail(email),
        })
      ).data;
  if (!school && !admitted) {
    return fail(
      `Rumi is for verified students — use your school email (like you@${LAUNCH_SCHOOL.domain}).`,
    );
  }

  const [byEmail, byIp] = await Promise.all([
    rateLimit(`otp:email:${email}`, LIMITS.otpPerEmail),
    rateLimit(`otp:ip:${clientIp()}`, LIMITS.otpPerIp),
  ]);
  if (!byEmail || !byIp) return fail("Too many codes requested. Wait a few minutes and try again.");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${publicEnv.appUrl}/auth/confirm` },
  });
  if (error) {
    if (error.status === 429) return fail("Too many codes requested. Wait a minute and try again.");
    if (isBanned(error)) return fail(SUSPENDED_MESSAGE);
    if (error.message.includes("school_email_required")) {
      return fail(`Use your school email (like you@${LAUNCH_SCHOOL.domain}).`);
    }
    console.error("[auth] signInWithOtp failed", error);
    return fail("We couldn't send a code right now. Please try again.");
  }
  return ok({ email });
}

export async function verifyCode(input: {
  email: string;
  token: string;
  next?: string | null;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const email = emailSchema.safeParse(input.email);
  const token = otpSchema.safeParse(input.token);
  if (!email.success) return fail(firstError(email.error));
  if (!token.success) return fail(firstError(token.error));

  if (!(await rateLimit(`verify:email:${email.data}`, LIMITS.verifyPerEmail))) {
    return fail("Too many attempts. Request a new code in a few minutes.");
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: token.data,
    type: "email",
  });
  if (error && isBanned(error)) return fail(SUSPENDED_MESSAGE);
  if (error || !data.user) {
    return fail("That code didn't work. Check it, or send a new one.");
  }

  await afterSignIn(data.user);
  return ok({ redirectTo: await destinationFor(data.user.id, input.next) });
}

/** Finishes the one-tap email link once the person presses the button on /auth/confirm. */
export async function confirmLink(formData: FormData) {
  const tokenHash = formData.get("token_hash");
  const LINK_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "email_change"];
  const requested = String(formData.get("type") || "email");
  const type = LINK_TYPES.find((t) => t === requested) ?? "email";
  const next = formData.get("next");
  if (typeof tokenHash !== "string" || !tokenHash) redirect("/login?error=link_expired");

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error && isBanned(error)) redirect("/login?error=suspended");
  if (error || !data.user) redirect("/login?error=link_expired");

  await afterSignIn(data.user);
  redirect(await destinationFor(data.user.id, typeof next === "string" ? next : null));
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
