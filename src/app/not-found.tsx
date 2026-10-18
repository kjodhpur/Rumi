import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-rumi-cream px-4 text-center">
      <h1 className="font-display text-3xl font-black tracking-brand text-asu-maroon">
        Page not found
      </h1>
      <p className="text-rumi-muted">That page doesn&apos;t exist on {APP_NAME}.</p>
      <Link href="/" className="font-semibold text-asu-maroon underline">
        Go home
      </Link>
    </div>
  );
}
