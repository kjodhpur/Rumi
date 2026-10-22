/**
 * Marketing copy for the launch campus. Enforcement (allowed email domains,
 * neighborhoods) lives in the `schools` and `areas` tables, so adding a campus
 * is a data change — this file only shapes the words on public pages.
 */
export const LAUNCH_SCHOOL = {
  id: process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_ID ?? "asu",
  name: process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_NAME ?? "Arizona State University",
  shortName: process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_SHORT ?? "ASU",
  domain: process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_DOMAIN ?? "asu.edu",
  city: process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_CITY ?? "Tempe",
} as const;
