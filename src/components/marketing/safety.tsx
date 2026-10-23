import { BadgeCheck, Download, EyeOff, Flag, MessagesSquare, ShieldAlert } from "lucide-react";
import { LAUNCH_SCHOOL } from "@/lib/school";

const ITEMS = [
  {
    icon: BadgeCheck,
    title: "Verified students only",
    body: `Every account is confirmed through an @${LAUNCH_SCHOOL.domain} inbox — and re-confirmed every year.`,
  },
  {
    icon: MessagesSquare,
    title: "Intros, not cold DMs",
    body: "Nobody can message you out of the blue. A chat opens only after you accept their intro.",
  },
  {
    icon: EyeOff,
    title: "Private by default",
    body: "Your last name, email and address are never shown. Hide your profile whenever you need a break.",
  },
  {
    icon: ShieldAlert,
    title: "Scam detection",
    body: "Requests for deposits or off-platform payments are flagged automatically and reviewed by our team.",
  },
  {
    icon: Flag,
    title: "Report or block anywhere",
    body: "Two taps from any profile or chat. Reports are confidential and reviewed by real people.",
  },
  {
    icon: Download,
    title: "Your data, your call",
    body: "Download everything we store or delete your account from settings. No ads, and we never sell data.",
  },
];

/** A dark band in both themes — it lifts slightly in dark mode instead of inverting. */
export function Safety() {
  return (
    <section id="safety" aria-labelledby="safety-title" className="px-2 sm:px-4">
      <div className="mx-auto max-w-[1280px] rounded-2xl bg-[#171614] px-4 py-20 text-[#f2efe9] ring-1 ring-white/5 sm:px-8 lg:px-12 lg:py-28 dark:bg-[#1f1e1c]">
        <div className="mx-auto max-w-[1136px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-caption font-semibold tracking-wide text-[#ff7a4d] uppercase">Trust &amp; safety</p>
              <h2 id="safety-title" className="mt-3 font-display text-[36px] !leading-[1.08] sm:text-display-xl">
                Safety isn&apos;t a feature. It&apos;s the floor.
              </h2>
            </div>
            <p className="max-w-[460px] text-body text-[#aba69d] lg:justify-self-end">
              Living with someone is a big deal. Rumi is built so the only people you meet are real students — on your
              terms, at your pace.
            </p>
          </div>
          <ul className="mt-14 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {ITEMS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="border-t border-white/10 pt-6">
                <Icon className="size-6 text-[#ff7a4d]" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-4 text-title">{title}</h3>
                <p className="mt-1.5 text-body-sm text-[#aba69d]">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
