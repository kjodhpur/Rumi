import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Security",
  description: "How to report a security problem in Rumi.",
};

/** Vulnerability disclosure (0.4). */
export default function SecurityPage() {
  const email = publicEnv.supportEmail;
  return (
    <LegalPage
      title="Security"
      updated="November 2026"
      intro={
        <>
          If you think you&apos;ve found a security problem in Rumi, please tell us. Email{" "}
          <a href={`mailto:${email}?subject=${encodeURIComponent("Security report")}`}>{email}</a>{" "}
          with &ldquo;Security&rdquo; in the subject, what you found, how to reproduce it and what
          someone could do with it.
        </>
      }
    >
      <h2>What to expect</h2>
      <ul>
        <li>
          We&apos;ll confirm we got your report within three business days and keep you posted.
        </li>
        <li>
          We&apos;ll fix confirmed problems as quickly as their severity calls for, and tell you
          when they&apos;re fixed.
        </li>
        <li>
          We don&apos;t run a paid bounty, but we&apos;re glad to credit you once it&apos;s fixed.
        </li>
      </ul>
      <h2>Please</h2>
      <ul>
        <li>
          Test only with your own accounts, and don&apos;t look at other people&apos;s data beyond
          what&apos;s needed to show the problem.
        </li>
        <li>
          Don&apos;t degrade the service: no denial of service, spam or automated scanning that
          floods it.
        </li>
        <li>Give us reasonable time to fix it before telling anyone else.</li>
        <li>Social engineering and physical attacks are out of scope.</li>
      </ul>
      <h2>How Rumi protects data</h2>
      <p>
        Every table uses row-level security, housing staff see individual students only when those
        students choose to share, small totals are hidden, staff actions are logged, and sensitive
        fields such as phone numbers and check-in notes are encrypted. Rumi has no SOC 2 or other
        certification; our security documents are drafts we share with schools on request.
      </p>
    </LegalPage>
  );
}
