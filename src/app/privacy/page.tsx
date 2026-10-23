import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Rumi collects, why, who can see it, and how to delete it.",
};

export default function PrivacyPage() {
  const support = publicEnv.supportEmail;
  return (
    <LegalPage
      title="Privacy"
      updated="October 23, 2026"
      intro={
        <p>
          Rumi helps students find compatible roommates. To do that we need some information about how you live — and we
          treat it carefully. We don&apos;t sell your data, we don&apos;t show ads, and you can delete everything at any
          time.
        </p>
      }
    >
      <h2>What we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          <strong>Account:</strong> your school email address, used to sign you in and to confirm you&apos;re a current
          student.
        </li>
        <li>
          <strong>Profile:</strong> first name, last name (private — only your last initial is shown), pronouns, gender,
          class year, major, bio and photos.
        </li>
        <li>
          <strong>Preferences:</strong> budget, neighborhoods, move-in date, lease length, housing type, roommate gender
          preference, lifestyle answers (sleep, cleanliness, noise, guests, smoking, drinking, pets, study habits),
          dealbreakers and how important each factor is to you.
        </li>
        <li>
          <strong>Messages and activity:</strong> intros, chat messages, groups, saved profiles, blocks and reports you
          file.
        </li>
      </ul>
      <h3>Optional connections</h3>
      <p>
        If you connect Spotify, we receive read-only access to your top artists and genres and your Spotify display name.
        We store the access tokens encrypted and never post anything or read your playlists.
      </p>
      <h3>Collected automatically</h3>
      <p>
        Basic technical information needed to run the service — when you were last active, session cookies that keep you
        signed in, and server logs (IP address, browser type) kept for security and abuse prevention. We don&apos;t use
        third-party advertising or tracking cookies.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To compute compatibility scores and rank matches for you and for other students.</li>
        <li>To deliver intros, messages and notifications you&apos;ve turned on (in the app and by email).</li>
        <li>To keep Rumi safe: verifying students, detecting scams and abuse, and reviewing reports.</li>
        <li>To operate, secure and improve the service.</li>
      </ul>

      <h2>Who can see what</h2>
      <p>
        Other verified students at your school can see your first name and last initial, photos, pronouns, class year,
        major, bio, and the housing and lifestyle answers that drive matching, plus your compatibility score with them.
        They never see your email address, your last name, your notification and privacy settings, or who you&apos;ve
        saved or blocked.
      </p>
      <ul>
        <li>
          <strong>Hide your profile</strong> any time in Settings → Privacy &amp; safety. You&apos;ll disappear from
          matches and groups; existing chats keep working.
        </li>
        <li>
          <strong>Verified students only</strong> (on by default) limits your profile to students whose school email is
          currently verified.
        </li>
        <li>
          <strong>Blocking</strong> hides you from each other everywhere on Rumi and closes any chat between you.
        </li>
      </ul>
      <p>
        A small team of Rumi moderators can access account information when reviewing reports or investigating abuse.
        Messages are only reviewed when they&apos;re reported or automatically flagged for safety.
      </p>

      <h2>Service providers</h2>
      <p>We share data only with providers that help us run Rumi, under contracts that limit how they use it:</p>
      <ul>
        <li>Supabase — database, authentication, file storage and real-time messaging.</li>
        <li>Vercel — application hosting.</li>
        <li>Our email delivery provider — sign-in codes and notification emails.</li>
        <li>Spotify — only if you choose to connect it.</li>
      </ul>
      <p>
        We don&apos;t sell or rent personal information, and we don&apos;t share it with your school. We may disclose
        information if required by law or to protect someone&apos;s safety.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        We keep your information while your account is active. When you delete your account (Settings → Delete account),
        we permanently remove your profile, photos, preferences, matches, saves, intros, direct messages, Spotify data and
        notifications. Messages you sent in a group chat are removed with your account. Server logs are kept for up to 30
        days, and backups roll over within 30 days.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          <strong>Access and portability:</strong> download everything we store about you as a JSON file from Settings
          → Your data.
        </li>
        <li>
          <strong>Correction:</strong> edit your profile and preferences any time in Settings.
        </li>
        <li>
          <strong>Deletion:</strong> delete your account in Settings, or email us.
        </li>
        <li>
          <strong>Notifications:</strong> choose exactly which in-app and email notifications you receive.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, row-level security rules ensure students can only read what they&apos;re allowed
        to, third-party tokens are encrypted at rest, and sign-in uses one-time codes instead of passwords. No system is
        perfect — if you notice something off, tell us.
      </p>

      <h2>Students and age</h2>
      <p>
        Rumi is for current {LAUNCH_SCHOOL.shortName} students who are at least 18. We don&apos;t knowingly collect
        information from anyone younger.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If we make material changes we&apos;ll let you know in the app before they take effect. Questions or requests?
        Email <a href={`mailto:${support}`}>{support}</a>. See also our <Link href="/terms">Terms</Link>.
      </p>
    </LegalPage>
  );
}
