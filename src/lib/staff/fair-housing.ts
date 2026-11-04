/**
 * Fair Housing guard for school-added questions (Phase 1 term configuration). Pure.
 * Questions may not ask about protected characteristics (race, color, religion, national
 * origin, sex, familial status, disability, and common state additions). The denylist runs
 * on the server, and a housing admin must also sign off a review before students see it.
 * This is a safety net, not legal advice: the reviewer decides.
 */

const TOPICS: { topic: string; pattern: RegExp }[] = [
  {
    topic: "race or ethnicity",
    pattern:
      /\b(race|racial|ethnic\w*|skin colou?r|black|white people|hispanic|latin[oax]|asian|caucasian)\b/i,
  },
  {
    topic: "religion",
    pattern:
      /\b(religio\w*|church|mosque|synagogue|temple|pray\w*|christian|muslim|jewish|hindu|buddhis\w*|atheis\w*|faith)\b/i,
  },
  {
    topic: "national origin or citizenship",
    pattern:
      /\b(national origin|nationality|citizenship|citizen|immigra\w*|visa status|country of (birth|origin)|native language|accent)\b/i,
  },
  {
    topic: "disability or health",
    pattern:
      /\b(disabilit\w*|disabled|handicap\w*|mental (health|illness)|diagnos\w*|medical condition|medication|wheelchair|autis\w*|adhd|depress\w*|anxiety disorder)\b/i,
  },
  {
    topic: "familial status or pregnancy",
    pattern: /\b(pregnan\w*|children|kids|family status|familial|married|marital|single parent)\b/i,
  },
  {
    topic: "sex, sexual orientation or gender identity",
    pattern: /\b(sexual orientation|gay|lesbian|bisexual|transgender|gender identity|straight)\b/i,
  },
  { topic: "age", pattern: /\b(how old|your age|birth ?date|date of birth|year of birth)\b/i },
  { topic: "veteran or military status", pattern: /\b(veteran|military status|armed forces)\b/i },
  {
    topic: "political views",
    pattern: /\b(politic\w*|democrat|republican|conservative|liberal|vote\w*)\b/i,
  },
];

/** Protected topics the text touches (empty when none). */
export function protectedTopics(text: string): string[] {
  return TOPICS.filter((t) => t.pattern.test(text)).map((t) => t.topic);
}
