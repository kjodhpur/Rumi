"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { firstError } from "@/lib/validation";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import {
  LOGO_EXT,
  LOGO_MAX_BYTES,
  accentIssue,
  parseBranding,
  sniffLogo,
  toBrandingJson,
  type SchoolBranding,
} from "@/lib/staff/branding";

const BUCKET = "school-branding";
const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);

/** Housing admins only; every change is audited. */
async function housingAdmin(school: string) {
  if (!schoolId.safeParse(school).success) return null;
  const actorId = await assertRole(school, "configureSchool");
  if (!actorId) return null;
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return "limited" as const;
  return actorId;
}

const deny = (actorId: string | null) =>
  actorId === "limited"
    ? fail("Too many changes. Try again in a bit.")
    : fail("Only housing admins can change branding.");

async function current(school: string) {
  const { data } = await createAdminClient()
    .from("schools")
    .select("branding")
    .eq("id", school)
    .maybeSingle();
  return data ? parseBranding(data.branding) : null;
}

async function store(school: string, branding: SchoolBranding) {
  const { error } = await createAdminClient()
    .from("schools")
    .update({ branding: toBrandingJson(branding) })
    .eq("id", school);
  return !error;
}

function refresh(school: string) {
  revalidatePath("/staff", "layout");
  revalidatePath(`/s/${school}`);
}

const textInput = z.object({
  schoolId,
  displayName: z
    .string()
    // School names can carry "&" and digits (Texas A&M), so not cleanName.
    .transform((v) => cleanText(v, { multiline: false }))
    .pipe(z.string().max(60, "Keep the name under 60 characters.")),
  secondaryAccent: z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((v, ctx) => {
      const issue = v ? accentIssue(v) : null;
      if (issue) ctx.addIssue({ code: "custom", message: issue });
    }),
});

/** The display name ("Rumi for <name>") and the optional decorative accent. */
export async function saveBranding(raw: z.input<typeof textInput>): Promise<ActionResult> {
  const parsed = textInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const actorId = await housingAdmin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const before = await current(parsed.data.schoolId);
  if (!before) return fail("That school isn't available.");
  const next: SchoolBranding = {
    ...before,
    displayName: parsed.data.displayName || null,
    secondaryAccent: parsed.data.secondaryAccent || null,
  };
  if (!(await store(parsed.data.schoolId, next))) return fail("Couldn't save the branding.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "branding_saved",
    entity: "school",
    entityId: parsed.data.schoolId,
    meta: { display_name: next.displayName, secondary_accent: next.secondaryAccent },
  });
  refresh(parsed.data.schoolId);
  return ok();
}

/** A PNG, JPEG or WebP up to 512 KB, checked by its bytes. SVG isn't accepted. */
export async function uploadSchoolLogo(form: FormData): Promise<ActionResult<{ path: string }>> {
  const school = String(form.get("schoolId") ?? "");
  const file = form.get("logo");
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image.");
  if (file.size > LOGO_MAX_BYTES) return fail("Logos can be up to 512 KB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffLogo(bytes);
  if (!type) return fail("Use a PNG, JPEG or WebP image.");
  const before = await current(school);
  if (!before) return fail("That school isn't available.");

  const db = createAdminClient();
  const path = `${school}/logo-${Date.now().toString(36)}.${LOGO_EXT[type]}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) return fail("Couldn't upload the logo.");
  if (!(await store(school, { ...before, logoPath: path }))) {
    await db.storage.from(BUCKET).remove([path]);
    return fail("Couldn't save the branding.");
  }
  if (before.logoPath) await db.storage.from(BUCKET).remove([before.logoPath]);
  await logAudit({
    actorId,
    schoolId: school,
    action: "branding_logo_uploaded",
    entity: "school",
    entityId: school,
    meta: { path, bytes: file.size, type },
  });
  refresh(school);
  return ok({ path });
}

export async function removeSchoolLogo(school: string): Promise<ActionResult> {
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const before = await current(school);
  if (!before) return fail("That school isn't available.");
  if (!before.logoPath) return ok();
  if (!(await store(school, { ...before, logoPath: null })))
    return fail("Couldn't save the branding.");
  await createAdminClient().storage.from(BUCKET).remove([before.logoPath]);
  await logAudit({
    actorId,
    schoolId: school,
    action: "branding_logo_removed",
    entity: "school",
    entityId: school,
  });
  refresh(school);
  return ok();
}
