import type { Metadata, Viewport } from "next";
import { inter, instrumentSerif } from "./fonts";
import { Providers } from "@/components/providers/providers";
import { cn } from "@/lib/utils";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { LaunchSplash } from "@/components/brand/splash";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Rumi — Find a roommate you'll actually like living with",
    template: "%s · Rumi",
  },
  description:
    `Free roommate matching for ${LAUNCH_SCHOOL.shortName} students. Set your preferences once and get a ranked list of compatible roommates — with a clear score and the reasons you match. No swiping.`,
  applicationName: "Rumi",
  keywords: [`${LAUNCH_SCHOOL.shortName} roommates`, `${LAUNCH_SCHOOL.name} roommate finder`, `${LAUNCH_SCHOOL.city} roommates`, "college roommate matching"],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Rumi", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Rumi",
    title: "Rumi — Roommates, ranked by how well you'd live together",
    description: `Free for ${LAUNCH_SCHOOL.shortName} students. A ranked list of compatible roommates with the reasons you match.`,
    url: appUrl,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, instrumentSerif.variable)}>
      <body>
        <LaunchSplash />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
