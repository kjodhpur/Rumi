import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
      <Link href="/" className="text-sm text-asu-maroon">
        ← {APP_NAME}
      </Link>
      <h1 className="font-display text-3xl font-semibold text-asu-maroon">Terms of Use</h1>
      <p className="rounded-xl bg-asu-gold/30 px-3 py-2 text-sm">
        Placeholder — to be reviewed by counsel before production use.
      </p>
      <div className="space-y-3 text-sm text-rumi-muted">
        <p>
          {APP_NAME} is a free roommate-matching tool for Arizona State University students with a
          valid @asu.edu email. It is not an official ASU service. Be respectful; harassment,
          spam, and fake profiles may result in suspension.
        </p>
        <p>
          Matching scores are estimates, not guarantees. You are responsible for your own housing
          decisions and offline interactions.
        </p>
      </div>
    </div>
  );
}
