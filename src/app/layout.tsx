import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { displayFont, sansFont } from "./fonts";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ASU roommate matching`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#12100E" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${sansFont.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
