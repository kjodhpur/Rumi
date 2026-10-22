import localFont from "next/font/local";

/** Inter (variable, optical sizes) — all UI text. */
export const inter = localFont({
  src: [
    { path: "../fonts/InterVariable-latin.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/InterVariable-latin-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: "Arial",
});

/** Instrument Serif — display moments: page titles, names, headlines. */
export const instrumentSerif = localFont({
  src: [
    { path: "../fonts/InstrumentSerif-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/InstrumentSerif-latin-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
