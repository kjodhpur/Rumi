import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using Rumi.",
};

export default function TermsPage() {
  const support = publicEnv.supportEmail;
  return (
    <LegalPage
      title="Terms of use"
      updated="October 23, 2026"
      intro={
        <p>
          These terms are an agreement between you and Rumi. They&apos;re written to be read: by creating an account, you
          agree to them and to our <Link href="/privacy" className="font-medium text-ink underline underline-offset-4">Privacy policy</Link>.
        </p>
      }
    >
      <h2>Who can use Rumi</h2>
      <p>
        You must be a currently enrolled student at a participating school, at least 18 years old, and able to verify a
        school email address (for example @{LAUNCH_SCHOOL.domain}). One account per person. Rumi is an independent
        service and is not affiliated with or endorsed by {LAUNCH_SCHOOL.name}.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your profile honest and up to date — real photos of you, real preferences.</li>
        <li>You&apos;re responsible for activity on your account. Sign-in codes are for you alone.</li>
        <li>You can delete your account at any time from Settings.</li>
      </ul>

      <h2>Community rules</h2>
      <p>To keep Rumi safe and useful, you agree not to:</p>
      <ul>
        <li>Impersonate anyone, use someone else&apos;s photos, or misrepresent who you are.</li>
        <li>Harass, threaten, discriminate against, or demean anyone.</li>
        <li>Ask for money, deposits, gift cards or payment details through Rumi, or run any scam.</li>
        <li>Post sexual, violent, hateful or illegal content.</li>
        <li>Advertise, spam, or use Rumi for anything other than finding a roommate for yourself.</li>
        <li>Scrape, copy or misuse other students&apos; information, or try to break or bypass our security.</li>
      </ul>
      <p>
        We may remove content, limit features, or suspend or ban accounts that break these rules, at our discretion. If
        you think we got it wrong, email us and we&apos;ll take another look.
      </p>

      <h2>Meeting people and making arrangements</h2>
      <p>
        Rumi helps you find and talk to potential roommates. <strong>We don&apos;t run background checks</strong>, verify
        housing listings, or take part in any lease or payment between users. Compatibility scores are estimates based on
        what people tell us — not guarantees.
      </p>
      <ul>
        <li>Meet in public places first, and tell a friend where you&apos;re going.</li>
        <li>Never send a deposit or payment before you&apos;ve seen a place in person and signed a real lease.</li>
        <li>Report anything that feels off — reports are confidential.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You own what you post. You give Rumi a limited license to host, display and process it so the service works — for
        example, showing your photos to your matches. That license ends when you delete the content or your account,
        except where others have already received it in a chat.
      </p>

      <h2>Our service</h2>
      <p>
        Rumi is free. We work hard to keep it available and secure, but it&apos;s provided &quot;as is&quot; without
        warranties of any kind. To the fullest extent the law allows, Rumi isn&apos;t liable for indirect or consequential
        damages, or for the conduct of other users, on or off the platform. Nothing in these terms limits rights you have
        that can&apos;t be waived by law.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as Rumi evolves. If a change is material, we&apos;ll tell you in the app before it takes
        effect. Continuing to use Rumi after that means you accept the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${support}`}>{support}</a>.
      </p>
    </LegalPage>
  );
}
