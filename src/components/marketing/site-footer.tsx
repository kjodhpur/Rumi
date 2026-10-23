import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { publicEnv } from "@/lib/env";

export function SiteFooter() {
  const columns = [
    {
      title: "Product",
      links: [
        { href: "/#ranking", label: "How it works" },
        { href: "/#why", label: "Why you match" },
        { href: "/#safety", label: "Safety" },
        { href: "/#faq", label: "FAQ" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/login", label: "Sign in" },
        { href: "/login", label: "Create a profile" },
        { href: "/settings", label: "Settings" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: `mailto:${publicEnv.supportEmail}`, label: "Contact" },
      ],
    },
  ];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <Wordmark height={26} className="text-ink" />
          <p className="mt-3 max-w-[300px] text-body-sm text-ink-2">
            Roommates, ranked by how well you&apos;d actually live together.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-16">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-caption font-semibold tracking-wide text-ink-3 uppercase">{column.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-body-sm text-ink-2 transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 border-t border-line px-4 py-6 text-caption text-ink-3 sm:flex-row sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Rumi</span>
        <span>Independent service · Not affiliated with {LAUNCH_SCHOOL.name}</span>
      </div>
    </footer>
  );
}
