import { cn } from "@/lib/utils";

const PALETTES = [
  ["#F3E3D3", "#E6C3A6"], // sand → clay
  ["#E2EADF", "#BFD1B8"], // sage
  ["#EEDAD3", "#D9AFA2"], // rose clay
  ["#DFE5EC", "#B8C6D6"], // mist
  ["#F1E6C6", "#DEC48E"], // wheat
  ["#E9DFD7", "#CBB8A8"], // stone
] as const;

const DARK_PALETTES = [
  ["#3A2E25", "#4D3A2C"],
  ["#2B3428", "#384634"],
  ["#3A2A26", "#4C342D"],
  ["#262D36", "#323C49"],
  ["#3A3322", "#4B4129"],
  ["#332C27", "#423830"],
] as const;

export function paletteIndex(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % PALETTES.length;
}

/**
 * Typographic stand-in for a photo: a warm gradient with a serif initial.
 * Used in marketing mockups and wherever an image is missing.
 */
export function Monogram({
  name,
  seed,
  className,
  rounded = "rounded-full",
}: {
  name: string;
  seed?: string;
  className?: string;
  rounded?: string;
}) {
  const index = paletteIndex(seed ?? name);
  const [from, to] = PALETTES[index];
  const [dFrom, dTo] = DARK_PALETTES[index];
  return (
    <span
      aria-hidden
      className={cn("relative flex items-center justify-center overflow-hidden", rounded, className)}
      style={
        {
          "--m-from": from,
          "--m-to": to,
          "--m-dfrom": dFrom,
          "--m-dto": dTo,
        } as React.CSSProperties
      }
    >
      <span className="absolute inset-0 bg-[linear-gradient(145deg,var(--m-from),var(--m-to))] dark:bg-[linear-gradient(145deg,var(--m-dfrom),var(--m-dto))]" />
      <span
        className="relative font-display leading-none text-ink/75 select-none"
        style={{ fontSize: "min(46cqw, 46cqh)" }}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    </span>
  );
}
