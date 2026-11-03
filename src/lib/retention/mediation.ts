import type { CheckinTag } from "./risk";

export interface MediationPrompt {
  tag: CheckinTag;
  title: string;
  agreementSection: string;
  advice: string;
  suggestedMessage: string;
}

const MEDIATION_DATA: Record<CheckinTag, { title: string; agreementSection: string; advice: string; suggestedMessage: string }> = {
  noise: {
    title: "Noise & Quiet Hours",
    agreementSection: "Quiet Hours & Study Time",
    advice: "Check your agreement's quiet hours section. Reconnecting around specific hours (like 11 PM weeknights) works better than general complaints.",
    suggestedMessage: "Hey, are you free for a quick chat today about weeknight noise? Just wanted to make sure we're on the same page with quiet hours.",
  },
  cleanliness: {
    title: "Cleanliness & Chores",
    agreementSection: "Cleanliness & Shared Items",
    advice: "Check your agreement's chore rotation. Frame adjustments around a shared schedule (like resetting the kitchen before bed) rather than fault.",
    suggestedMessage: "Hey! Could we spend 10 mins this evening resetting the kitchen together? Want to make sure we keep up with our chore agreement.",
  },
  guests: {
    title: "Guest Limits & Overnight Visits",
    agreementSection: "Guests & Overnight Policy",
    advice: "Check your agreement's guest policy. Establishing an automatic 2-hour text heads-up helps both roommates plan their morning routines.",
    suggestedMessage: "Hey, could we give each other a quick heads up before having friends stay over? Just helps me plan my mornings.",
  },
  schedule: {
    title: "Sleep & Daily Schedule",
    agreementSection: "Sleep Schedule & Lighting",
    advice: "Check your sleep schedule section. Simple changes like using a desk lamp and headphones after midnight prevent sleep disruption.",
    suggestedMessage: "Hey, I have early 8 AM classes this term. Would you mind using headphones or desk lamp after midnight on weeknights?",
  },
  communication: {
    title: "Direct & Respectful Communication",
    agreementSection: "Conflict Resolution Preference",
    advice: "Addressing tension early in person or over coffee prevents minor misunderstandings from festering into roommate burnout.",
    suggestedMessage: "Hey! Do you have 10 minutes to grab coffee or sit in the lounge? Wanted to check in on how our room rhythm is feeling.",
  },
  other: {
    title: "Shared Living Expectations",
    agreementSection: "General Roommate Expectations",
    advice: "Revisit your signed Roommate Agreement to discuss which shared expectations need a refresher.",
    suggestedMessage: "Hey, could we take 5 minutes to review our roommate agreement? Just want to check in on how things are going.",
  },
};

/**
 * Pure function: generates structured mediation guidance tailored to the friction tags.
 */
export function getGuidedMediationTips(tags: CheckinTag[]): MediationPrompt[] {
  if (tags.length === 0) {
    return [
      {
        tag: "communication",
        ...MEDIATION_DATA.communication,
      },
    ];
  }

  return tags.map((tag) => ({
    tag,
    ...MEDIATION_DATA[tag],
  }));
}
