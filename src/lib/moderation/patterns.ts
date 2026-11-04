export type ModerationFlag = "payment" | "contact" | "abuse" | "links";

/**
 * Roommate-scam and abuse patterns. Flags never block a message — they open an
 * automatic report for admins and can surface a safety tip in the thread.
 */
const PATTERNS: { flag: ModerationFlag; re: RegExp }[] = [
  {
    flag: "payment",
    re: /\b(zelle|venmo|cash\s?app|wire\s+(the\s+)?(money|transfer)|western\s+union|money\s?gram|gift\s?cards?|deposit\s+(first|now|today|before)|send\s+(me\s+)?(the\s+)?deposit|crypto|bitcoin|usdt)\b/i,
  },
  {
    flag: "contact",
    re: /\b(whats\s?app|telegram|signal\s+me|text\s+me\s+at|\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/i,
  },
  {
    flag: "links",
    re: /\bhttps?:\/\/(?!([a-z0-9-]+\.)*(asu\.edu|zillow\.com|apartments\.com|craigslist\.org)\b)[^\s]+/i,
  },
  { flag: "abuse", re: /\b(kill\s+yourself|kys|fag+ot|retard(ed)?|n[i1]gg(a|er)|tranny)\b/i },
];

export function moderateText(text: string): ModerationFlag[] {
  return PATTERNS.filter(({ re }) => re.test(text)).map(({ flag }) => flag);
}

/** Regex flags that open a report on their own (the rest only inform). */
export function isSevere(flags: ModerationFlag[]) {
  return flags.includes("abuse") || flags.includes("payment");
}
