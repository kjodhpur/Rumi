import { z } from "zod";
import { cleanName, cleanText } from "./sanitize";
import {
  CLASS_YEARS,
  DEALBREAKERS,
  DRINKING,
  FACTORS,
  GENDERS,
  HOUSING_TYPES,
  LEASE_LENGTHS,
  PETS,
  ROOMMATE_GENDERS,
  SMOKING,
  STUDY,
} from "./options";

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((item) => item.value) as [T[number]["value"], ...T[number]["value"][]];

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "That email is too long.")
  .email("Enter a valid email address.");

export const otpSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code.");

const text = (max: number, opts?: { multiline?: boolean }) =>
  z
    .string()
    .transform((v) => cleanText(v, opts))
    .pipe(z.string().max(max, `Keep it under ${max} characters.`));

export const basicsSchema = z.object({
  firstName: z
    .string()
    .transform(cleanName)
    .pipe(z.string().min(1, "Add your first name.").max(40)),
  lastName: z
    .string()
    .transform(cleanName)
    .pipe(z.string().min(1, "Add your last name — only the initial is shown.").max(60)),
  pronouns: text(24, { multiline: false }).optional(),
  gender: z.enum(values(GENDERS), { message: "Choose one." }),
  classYear: z.enum(values(CLASS_YEARS), { message: "Choose your year." }),
  major: text(80, { multiline: false }).pipe(z.string().min(2, "Add your major.")),
});

export const bioSchema = z.object({
  bio: text(500).pipe(z.string().min(20, "Write at least a sentence or two (20+ characters).")),
});

export const housingSchema = z
  .object({
    budgetMin: z.number().int().min(200).max(5000),
    budgetMax: z.number().int().min(200).max(6000),
    moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a move-in date."),
    leaseLength: z.enum(values(LEASE_LENGTHS)),
    housingType: z.enum(values(HOUSING_TYPES)),
    genderPref: z.array(z.enum(values(ROOMMATE_GENDERS))).max(4),
  })
  .refine((v) => v.budgetMin <= v.budgetMax, { message: "Minimum can't be above maximum.", path: ["budgetMax"] });

export const areasSchema = z.object({
  areas: z.array(z.string().regex(/^[a-z0-9-]{2,48}$/)).min(1, "Pick at least one neighborhood.").max(12),
});

export const lifestyleSchema = z.object({
  sleepSchedule: z.number().int().min(1).max(5),
  cleanliness: z.number().int().min(1).max(5),
  noise: z.number().int().min(1).max(5),
  guests: z.number().int().min(1).max(5),
});

export const habitsSchema = z.object({
  smoking: z.enum(values(SMOKING)),
  drinking: z.enum(values(DRINKING)),
  pets: z.enum(values(PETS)),
  study: z.enum(values(STUDY)),
});

export const weightsSchema = z.object({
  weights: z.record(z.enum(FACTORS), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])),
});

export const dealbreakersSchema = z.object({
  dealbreakers: z.array(z.enum(values(DEALBREAKERS))).max(DEALBREAKERS.length),
});

export const introSchema = z.object({
  recipientId: z.string().uuid(),
  message: text(500).pipe(z.string().min(10, "Say a little more — at least 10 characters.")),
});

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: text(2000).pipe(z.string().min(1, "Type a message.")),
  clientId: z.string().uuid(),
});

export const reportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.enum(["fake", "harassment", "spam", "scam", "inappropriate", "safety", "other"]),
  details: text(1000).optional(),
  messageId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
});

export const groupSchema = z.object({
  name: text(40, { multiline: false }).pipe(z.string().min(1, "Give your group a name.")),
  targetSize: z.number().int().min(2).max(4),
});

export type BasicsInput = z.infer<typeof basicsSchema>;
export type HousingInput = z.infer<typeof housingSchema>;

/** First error message from a Zod failure, for inline display. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Something doesn't look right.";
}

/** Field → message map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
