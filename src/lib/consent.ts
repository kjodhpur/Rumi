/** Bump when the wording of a consent changes; a new grant records the version the student saw. */
export const CONSENT_VERSION = "2026-11";

export const CONSENT_KINDS = [
  "share_with_housing",
  "checkins",
  "research_outcomes",
  "sms",
  "calendar",
  "social_verification",
] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

interface ConsentCopy {
  title: string;
  /** What turning it on shares, in plain words. `{office}` is the school's housing office. */
  shares: string;
  /** Shown only when the school has a partnered housing office. */
  needsOffice: boolean;
}

export const CONSENT_COPY: Record<ConsentKind, ConsentCopy> = {
  share_with_housing: {
    title: "Share my Rumi results with {office}",
    shares:
      "Your first name, last initial, match scores, group and roommate agreement status. Staff can use them to help place you. Without this, they only see totals that include you.",
    needsOffice: true,
  },
  checkins: {
    title: "Roommate check-ins",
    shares: "Short check-ins after you move in. Your answers stay private unless you also choose to share them with your RA.",
    needsOffice: true,
  },
  research_outcomes: {
    title: "Help improve matching",
    shares: "De-identified results (scores and whether a pairing worked out) used to study what makes roommates work. Never your name or messages.",
    needsOffice: true,
  },
  sms: {
    title: "Text messages",
    shares: "Deadline reminders by text. Reply STOP anytime.",
    needsOffice: false,
  },
  calendar: {
    title: "Calendar",
    shares: "Free/busy times only, to suggest when to meet. Never event details.",
    needsOffice: false,
  },
  social_verification: {
    title: "Mutual connections",
    shares: "People you've both confirmed you know, shown as \"mutual connections\" to students who also turned this on.",
    needsOffice: false,
  },
};

/** Consents whose features exist today. Others appear here as their phases ship. */
export const LIVE_CONSENTS: ConsentKind[] = ["share_with_housing"];

export function consentTitle(kind: ConsentKind, office: string | null) {
  return CONSENT_COPY[kind].title.replace("{office}", office ?? "your housing office");
}

export function visibleConsents(office: string | null, live: readonly ConsentKind[] = LIVE_CONSENTS) {
  return live.filter((kind) => !CONSENT_COPY[kind].needsOffice || Boolean(office));
}

export function isConsentKind(value: string): value is ConsentKind {
  return (CONSENT_KINDS as readonly string[]).includes(value);
}
