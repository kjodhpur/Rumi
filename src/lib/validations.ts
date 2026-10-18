import { z } from "zod";
import {
  BIO_MAX,
  BUDGET_MAX,
  BUDGET_MIN,
  CAMPUSES,
  DRINKING,
  FIRST_MESSAGE_MIN_CHARS,
  GENDER_PREF,
  IMPORTANCE,
  LEASE_LENGTHS,
  LOOKING_FOR,
  LIFESTYLE_SCALE_KEYS,
  MOVE_IN_TERMS,
  OWN_GENDER,
  PETS,
  PLACE_STATUS,
  PREFERRED_AREAS,
  REPORT_REASONS,
  ROOMMATE_COUNTS,
  SMOKING,
  YEARS,
} from "./constants";

export const emailSchema = z
  .string()
  .email()
  .refine((e) => e.toLowerCase().endsWith("@asu.edu"), {
    message: "Rumi is for ASU students — please use your @asu.edu email.",
  });

export const basicsSchema = z.object({
  first_name: z.string().trim().min(1).max(40),
  last_initial: z
    .string()
    .trim()
    .min(1)
    .max(1)
    .regex(/^[A-Za-z]$/, "Enter a single letter"),
  photo_url: z.string().url().nullable().optional(),
  pronouns: z.string().trim().max(40).nullable().optional(),
  year: z.enum(YEARS),
  major: z.string().trim().min(1).max(80),
  campus: z.enum(CAMPUSES),
  bio: z.string().trim().min(1).max(BIO_MAX),
  instagram: z
    .string()
    .trim()
    .max(40)
    .regex(/^@?[A-Za-z0-9._]*$/, "Invalid Instagram handle")
    .nullable()
    .optional()
    .or(z.literal("")),
  own_gender: z.enum(OWN_GENDER),
  show_gender_publicly: z.boolean().default(false),
});

export const housingSchema = z
  .object({
    looking_for: z.enum(LOOKING_FOR),
    budget_min: z.number().int().min(BUDGET_MIN).max(BUDGET_MAX),
    budget_max: z.number().int().min(BUDGET_MIN).max(BUDGET_MAX),
    preferred_areas: z.array(z.enum(PREFERRED_AREAS)).min(1),
    move_in_term: z.enum(MOVE_IN_TERMS),
    lease_length: z.enum(LEASE_LENGTHS),
    roommates_wanted: z.enum(ROOMMATE_COUNTS),
    place_status: z.enum(PLACE_STATUS),
  })
  .refine((d) => d.budget_min <= d.budget_max, {
    message: "Min budget must be ≤ max budget",
    path: ["budget_min"],
  });

const scale = z.number().int().min(1).max(5);

export const lifestyleSchema = z.object({
  sleep_schedule: scale,
  cleanliness: scale,
  guests: scale,
  noise_tolerance: scale,
  social_level: scale,
  study_at_home: scale,
  cooking_sharing: scale,
  smoking: z.enum(SMOKING),
  drinking: z.enum(DRINKING),
  pets: z.enum(PETS),
  gender_preference: z.enum(GENDER_PREF),
});

export const dealbreakersSchema = z.object({
  dealbreakers: z.array(z.string()).default([]),
});

export const weightsSchema = z.object({
  weights: z.record(z.string(), z.enum(IMPORTANCE)),
});

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(FIRST_MESSAGE_MIN_CHARS, `First message must be at least ${FIRST_MESSAGE_MIN_CHARS} characters`)
    .max(2000),
  recipientId: z.string().uuid(),
});

export const replySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  conversationId: z.string().uuid(),
});

export const reportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});

export const matchFiltersSchema = z.object({
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  areas: z.array(z.string()).optional(),
  moveInTerm: z.string().optional(),
  year: z.string().optional(),
  campus: z.string().optional(),
  placeStatus: z.string().optional(),
  minScore: z.number().min(0).max(100).optional(),
  spotifyOnly: z.boolean().optional(),
  sort: z.enum(["match", "newest", "budget"]).default("match"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export const lifestyleKeys = LIFESTYLE_SCALE_KEYS;
