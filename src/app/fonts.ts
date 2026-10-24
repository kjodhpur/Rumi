import localFont from "next/font/local";

/**
 * Inter — all UI text. Instanced from Inter Variable (text optical size,
 * weights 400–700, Latin) to halve the download; the app uses 400/500/600.
 */
export const inter = localFont({
  src: [{ path: "../fonts/Inter-latin-text-400-700.woff2", weight: "400 700", style: "normal" }],
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
