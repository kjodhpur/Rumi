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
  /** Campus police, shown next to 911 in safety copy. */
  police: {
    name: process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_POLICE_NAME ?? "ASU Police",
    phone: process.env.NEXT_PUBLIC_LAUNCH_SCHOOL_POLICE_PHONE ?? "480-965-3456",
  },
} as const;
