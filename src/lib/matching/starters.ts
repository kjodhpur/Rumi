import type { FactorKey } from "@/lib/options";

/**
 * Conversation starters (4.1): each watch-out between two students becomes a few
 * ready-to-send, editable openers. Template-based and direction-aware, never AI.
 */

export interface StarterPrefs {
  sleepSchedule: number;
  cleanliness: number;
  noise: number;
  guests: number;
  smoking: string;
  drinking: string;
  pets: string;
  housingType: string;
}

export interface StarterGroup {
  key: FactorKey;
  lines: string[];
}

const higher = (mine: number, theirs: number) => theirs > mine;

export function startersFor(key: FactorKey, me: StarterPrefs, them: StarterPrefs): string[] {
  switch (key) {
    case "sleep":
      return higher(me.sleepSchedule, them.sleepSchedule)
        ? [
            "You're up later than me. How would you feel about quiet hours after 11 on weeknights?",
            "I'm usually asleep earlier. Would a lamp instead of the big light work for late nights?",
          ]
        : [
            "I tend to stay up later than you. What time would you want things quiet on weeknights?",
            "Would it bother you if I'm up until 1 sometimes? I'm happy to keep it quiet.",
          ];
    case "cleanliness":
      return higher(me.cleanliness, them.cleanliness)
        ? [
            "You sound tidier than me. What would a fair chore split look like to you?",
            "What's your line on dishes left in the sink overnight?",
          ]
        : [
            "I like shared spaces pretty tidy. Would a weekly cleaning rotation work for you?",
            "How do you feel about doing dishes the same day?",
          ];
    case "noise":
      return higher(me.noise, them.noise)
        ? [
            "I like it on the quieter side. Could we agree on quiet hours for weeknights?",
            "How loud do you usually play music or games at home?",
          ]
        : [
            "I can be on the louder side with music and calls. What quiet hours would you want?",
            "Would headphones after 10 work for you?",
          ];
    case "guests":
      return higher(me.guests, them.guests)
        ? [
            "How often do you usually have friends over? I'd love a quick heads-up rule.",
            "How do you feel about overnight guests on weeknights?",
          ]
        : [
            "I have people over fairly often. Would a text heads-up first work for you?",
            "What's a reasonable number of overnight guests a week for you?",
          ];
    case "smoking":
      return them.smoking === "never"
        ? [
            "I smoke sometimes. Would outside-only, away from windows, work for you?",
            "Is smoke smell something that really bothers you?",
          ]
        : [
            "How do you feel about a smoke-free inside rule?",
            "Where do you usually smoke? I'd love to keep the place smoke-free inside.",
          ];
    case "drinking":
      return [
        "How do you feel about drinking at home: weekends only, or whenever?",
        "Are you okay with friends over for drinks sometimes, with a heads-up?",
      ];
    case "pets":
      return them.pets === "none"
        ? [
            "I have or want a pet. Would that work for you? Happy to tell you what they're like.",
            "Do you have any pet allergies I should know about?",
          ]
        : [
            "Tell me about your pet! What would they need in a shared place?",
            "Could we talk through allergies and who takes care of what?",
          ];
    case "study":
      return [
        "Where do you usually study? I want to know if you need the place quiet at certain times.",
        "During finals, would you want the place quiet in the evenings?",
      ];
    case "budget":
      return [
        "Our budgets don't quite overlap. What's the most you'd stretch for the right place?",
        "Would a smaller room for a lower rent work for you?",
      ];
    case "areas":
      return [
        "We haven't picked the same neighborhoods yet. Which areas would you consider?",
        "How important is being walkable to campus for you?",
      ];
    case "move_in":
      return [
        "Our move-in dates are a bit apart. How flexible is yours?",
        "Would a short sublet to bridge the gap work for you?",
      ];
    case "lease":
      return [
        "We want different lease lengths. What's behind yours?",
        "Would a 12-month lease with a summer sublet work for you?",
      ];
    case "housing_type":
      return them.housingType === "on_campus"
        ? [
            "You're leaning on campus and I'm leaning off. What's pulling you toward campus?",
            "Would you consider an off-campus place close to campus?",
          ]
        : [
            "You're leaning off campus and I'm leaning on. What's pulling you off campus?",
            "Would you consider on-campus housing if we found a good fit?",
          ];
    case "music":
      return [
        "Our music taste is pretty different. What are you listening to lately?",
        "Headphones in shared spaces, speakers in our rooms?",
      ];
  }
}

/** Starters for a chat: up to three watch-outs, two openers each. */
export function conversationStarters(
  watchouts: FactorKey[],
  me: StarterPrefs,
  them: StarterPrefs,
): StarterGroup[] {
  return [...new Set(watchouts)]
    .slice(0, 3)
    .map((key) => ({ key, lines: startersFor(key, me, them).slice(0, 2) }));
}
