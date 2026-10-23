import { Accordion } from "@/components/ui/accordion";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { Eyebrow, SectionTitle } from "./section-heading";

const ITEMS = [
  {
    id: "free",
    question: "Is Rumi really free?",
    answer: "Yes. No subscriptions, no paid boosts, no ads. Rumi exists to help students find good roommates.",
  },
  {
    id: "who",
    question: "Who can join?",
    answer: `Current ${LAUNCH_SCHOOL.shortName} students with an @${LAUNCH_SCHOOL.domain} email. You verify it with a one-time code, and every sign-in with that inbox keeps your verification current.`,
  },
  {
    id: "score",
    question: "How is my match score calculated?",
    answer:
      "We compare how you each answered about budget, neighborhoods, move-in timing, sleep, cleanliness, noise, guests and more — weighted by how important you said each one is. Scores are mutual: a high score means you fit what they want, too. Anything you marked as a dealbreaker removes that person from your list entirely.",
  },
  {
    id: "see",
    question: "What do other students see about me?",
    answer:
      "Your first name and last initial, photos, year and major, your bio, and the lifestyle and housing answers that drive matching. Never your last name, email or address. You can hide your profile at any time.",
  },
  {
    id: "place",
    question: "I already have a place. Can I use Rumi to fill a room?",
    answer:
      "Yes. Set your budget to your rent share, pick your neighborhood and move-in date, and mention the place in your bio. You can also start a group and invite people to join you.",
  },
  {
    id: "intros",
    question: "How do intros work?",
    answer:
      "Send a short note to someone you'd like to meet. If they accept, a private chat opens for both of you. If they decline, nothing happens — they won't get any more messages from you.",
  },
  {
    id: "affiliated",
    question: `Is Rumi affiliated with ${LAUNCH_SCHOOL.name}?`,
    answer: `No. Rumi is an independent service built for students. We use your @${LAUNCH_SCHOOL.domain} email only to confirm you're a current student.`,
  },
  {
    id: "delete",
    question: "Can I delete my account?",
    answer:
      "Anytime, from Settings → Delete account. It permanently removes your profile, photos, matches and messages. You can download a copy of your data first.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <SectionTitle id="faq-title">Questions, answered.</SectionTitle>
        </div>
        <Accordion items={ITEMS} />
      </div>
    </section>
  );
}
