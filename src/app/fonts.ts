/**
 * Typography (approved amendment):
 * - Inter — headings, nav, buttons, UI chrome (geometric)
 * - DM Sans — body paragraphs and reading text (humanist)
 * Both via next/font/google — no commercial license blockers.
 */
import { Inter, DM_Sans } from "next/font/google";

export const displayFont = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const sansFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
