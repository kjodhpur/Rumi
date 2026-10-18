import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
      <Link href="/" className="text-sm text-asu-maroon">
        ← {APP_NAME}
      </Link>
      <h1 className="font-display text-3xl font-semibold text-asu-maroon">Privacy Policy</h1>
      <p className="rounded-xl bg-asu-gold/30 px-3 py-2 text-sm">
        Placeholder — to be reviewed by counsel before production use.
      </p>
      <div className="space-y-3 text-sm text-rumi-muted">
        <p>
          {APP_NAME} collects your ASU email, profile preferences, optional Spotify listening data,
          and messages you send to other students. We use this to power roommate matching and
          safety tooling.
        </p>
        <p>
          We do not sell personal data. Profile photos are stored in Supabase Storage. Spotify
          tokens are encrypted at rest. You may delete your account from Settings (/me), which
          removes your profile and related data.
        </p>
      </div>
    </div>
  );
}
