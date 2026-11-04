"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, isSelectableLocale } from "@/lib/i18n/config";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { emailSchema, firstError, otpSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action";
import { publicEnv, serverEnv } from "@/lib/env";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { hashPersonalEmail } from "@/lib/admissions/allowlist";
import { isSsoUser, ssoStudentStatus } from "@/lib/auth/sso";

const SUSPENDED_MESSAGE = `This account is suspended. Email ${publicEnv.supportEmail} if you think that's a mistake.`;

function isBanned(error: { code?: string; message: string }) {
  return error.code === "user_banned" || /banned/i.test(error.message);
}

function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login"))
    return null;
  return next;
}

/** Runs after any successful school-email sign-in (OTP, magic link, Google or school SSO). */
export async function afterSignIn(user: User) {
  const admin = createAdminClient();
  // Phase 3: a school sign-on that says this person isn't a student keeps them out of matching.
  if (isSsoUser(user)) {
    const status = ssoStudentStatus(user);
    if (status !== "unknown") {
      const notStudent = status === "not_student";
      await admin
        .from("profiles")
        .update(
          notStudent ? { sso_non_student: true, is_hidden: true } : { sso_non_student: false },
        )
        .eq("id", user.id)
        .eq("is_staff", false);
    }
  }
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
  // A language picked on the login page carries over to a new account.
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (isSelectableLocale(cookieLocale) && cookieLocale !== "en") {
    const { data: profile } = await admin
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && !profile.onboarding_completed_at)
      await admin.from("user_settings").update({ locale: cookieLocale }).eq("user_id", user.id);
  }
  if (serverEnv.adminEmails.includes(email)) {
    await admin.from("admins").upsert({ user_id: user.id }, { onConflict: "user_id" });
  }
}

export async function destinationFor(userId: string, next?: string | null) {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, is_staff, sso_non_student")
    .eq("id", userId)
    .maybeSingle();
  const target = safeNext(next);
  // Staff invites must open before onboarding; staff never onboard as students.
  if (target?.startsWith("/invite/")) return target;
  if (data?.is_staff) return target?.startsWith("/staff") ? target : "/staff";
  if (data?.sso_non_student) return "/not-a-student";
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

  // Schools that turned code sign-in off send their students through single sign-on.
  if (school) {
    const { data: row } = await createAdminClient()
      .from("schools")
      .select("otp_enabled, sso_provider_id, short_name")
      .eq("id", school)
      .maybeSingle();
    if (row && !row.otp_enabled && row.sso_provider_id && publicEnv.ssoEnabled) {
      return fail(
        `${row.short_name ?? "Your school"} uses single sign-on. Use "Continue with ${row.short_name ?? "your school"}" above.`,
      );
    }
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

/** The schools whose students can sign in with their school's identity provider (Phase 3). */
export async function ssoSchools(): Promise<{ id: string; shortName: string }[]> {
  if (!publicEnv.ssoEnabled) return [];
  const { data } = await createAdminClient()
    .from("schools")
    .select("id, short_name, name")
    .eq("active", true)
    .not("sso_provider_id", "is", null);
  return (data ?? []).map((s) => ({ id: s.id, shortName: s.short_name ?? s.name }));
}

/** Starts a SAML/OIDC sign-in through Supabase Auth SSO, then lands on /auth/callback. */
export async function startSso(
  schoolId: string,
  next: string | null,
): Promise<ActionResult<{ url: string }>> {
  if (!publicEnv.ssoEnabled || typeof schoolId !== "string" || !/^[a-z0-9-]{2,40}$/.test(schoolId))
    return fail("Single sign-on isn't available.");
  if (!(await rateLimit(`sso:ip:${clientIp()}`, LIMITS.otpPerIp)))
    return fail("Too many tries. Wait a minute and try again.");
  const { data: school } = await createAdminClient()
    .from("schools")
    .select("sso_provider_id")
    .eq("id", schoolId)
    .eq("active", true)
    .maybeSingle();
  if (!school?.sso_provider_id) return fail("Single sign-on isn't set up for that school yet.");
  const callback = new URL("/auth/callback", publicEnv.appUrl);
  const target = safeNext(next);
  if (target) callback.searchParams.set("next", target);
  const { data, error } = await createClient().auth.signInWithSSO({
    providerId: school.sso_provider_id,
    options: { redirectTo: callback.toString() },
  });
  if (error || !data?.url) {
    console.error("[auth] SSO start failed", error);
    return fail("Your school's sign-in page didn't respond. Try again, or use your email.");
  }
  return ok({ url: data.url });
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
