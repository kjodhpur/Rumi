import {
  CLASS_YEARS,
  DEALBREAKERS,
  DRINKING,
  FACTOR_LABELS,
  GENDERS,
  HOUSING_TYPES,
  IMPORTANCE,
  LEASE_LENGTHS,
  PETS,
  REPORT_REASONS,
  ROOMMATE_GENDERS,
  SCALES,
  SMOKING,
  STUDY,
  type FactorKey,
  type ScaleKey,
} from "@/lib/options";
import type { Translator } from "./core";

/** The option lists from lib/options with labels in the reader's language. */
export function localizeOptions(t: Translator<"options">) {
  const list = <T extends { value: string; label: string }>(
    items: readonly T[],
    group:
      | "classYear"
      | "gender"
      | "roommateGender"
      | "lease"
      | "housingType"
      | "smoking"
      | "drinking"
      | "pets"
      | "dealbreaker",
  ) => items.map((item) => ({ ...item, label: t(`${group}.${item.value}` as never) }));
  const scale = (key: ScaleKey) => ({
    ...SCALES[key],
    label: t(`scales.${key}.label` as never),
    min: t(`scales.${key}.min` as never),
    max: t(`scales.${key}.max` as never),
    steps: [1, 2, 3, 4, 5].map((n) => t(`scales.${key}.s${n}` as never)),
  });
  return {
    CLASS_YEARS: list(CLASS_YEARS, "classYear"),
    GENDERS: list(GENDERS, "gender"),
    ROOMMATE_GENDERS: list(ROOMMATE_GENDERS, "roommateGender"),
    LEASE_LENGTHS: list(LEASE_LENGTHS, "lease"),
    HOUSING_TYPES: list(HOUSING_TYPES, "housingType"),
    SMOKING: list(SMOKING, "smoking"),
    DRINKING: list(DRINKING, "drinking"),
    PETS: list(PETS, "pets"),
    DEALBREAKERS: list(DEALBREAKERS, "dealbreaker"),
    STUDY: STUDY.map((s) => ({
      ...s,
      label: t(`study.${s.value}` as never),
      hint: t(`studyHint.${s.value}` as never),
    })),
    SCALES: {
      sleep_schedule: scale("sleep_schedule"),
      cleanliness: scale("cleanliness"),
      noise: scale("noise"),
      guests: scale("guests"),
    },
    FACTOR_LABELS: Object.fromEntries(
      (Object.keys(FACTOR_LABELS) as FactorKey[]).map((k) => [k, t(`factor.${k}` as never)]),
    ) as Record<FactorKey, string>,
    IMPORTANCE: IMPORTANCE.map((i) => ({
      ...i,
      label: t(`importance.i${i.value}` as never),
      short: t(`importanceShort.i${i.value}` as never),
    })),
    REPORT_REASONS: REPORT_REASONS.map((r) => ({
      ...r,
      label: t(`report.${r.value}` as never),
      hint: t(`reportHint.${r.value}` as never),
    })),
  };
}

export type LocalizedOptions = ReturnType<typeof localizeOptions>;
