export type SupportedLocale = "en" | "es" | "zh" | "hi";

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  status: "complete" | "needs_professional_translation";
}

export const LOCALES: Record<SupportedLocale, LocaleInfo> = {
  en: { code: "en", name: "English", nativeName: "English", status: "complete" },
  es: { code: "es", name: "Spanish", nativeName: "Español", status: "complete" },
  zh: { code: "zh", name: "Mandarin Chinese", nativeName: "简体中文", status: "needs_professional_translation" },
  hi: { code: "hi", name: "Hindi", nativeName: "हिन्दी", status: "needs_professional_translation" },
};

export const DEFAULT_LOCALE: SupportedLocale = "en";

export interface TranslationDictionary {
  common: {
    save: string;
    cancel: string;
    back: string;
    continue: string;
    loading: string;
    verified: string;
    share: string;
    delete: string;
  };
  auth: {
    signIn: string;
    schoolEmailHint: string;
    continueWithSchool: string;
    checkEmail: string;
  };
  onboarding: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    stepBasics: string;
    stepLifestyle: string;
    stepPriorities: string;
    stepReview: string;
    finish: string;
  };
  matching: {
    mutualFit: string;
    twoWayScore: string;
    whyYouMatch: string;
    watchouts: string;
    dealbreakers: string;
    sendIntro: string;
    verifiedStudent: string;
    verifiedSocial: string;
    noSwipingPromise: string;
  };
  agreement: {
    title: string;
    subtitle: string;
    sign: string;
    signed: string;
    quietHours: string;
    cleanliness: string;
    guests: string;
    sharedItems: string;
  };
  checkin: {
    title: string;
    subtitle: string;
    ratingPrompt: string;
    frictionPrompt: string;
    shareWithRa: string;
    submit: string;
  };
  settings: {
    title: string;
    language: string;
    languageDescription: string;
    privacy: string;
    connectedAccounts: string;
  };
}
