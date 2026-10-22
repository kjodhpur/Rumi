import { cn } from "@/lib/utils";
import { MARK_R, WORDMARK } from "./glyphs";

interface WordmarkProps {
  /** Rendered height in px; width follows the wordmark's proportions. */
  height?: number;
  className?: string;
  title?: string;
}

/** The "rumi" wordmark as outlined vector paths — identical on every platform. */
export function Wordmark({ height = 24, className, title = "Rumi" }: WordmarkProps) {
  const width = (WORDMARK.width / WORDMARK.height) * height;
  return (
    <svg
      viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
      width={width}
      height={height}
      role="img"
      aria-label={title}
      className={cn("shrink-0 fill-current", className)}
    >
      {WORDMARK.letters.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** The "r" mark on an Ember tile — favicon / app icon / compact logo. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const glyphHeight = size * 0.54;
  const scale = glyphHeight / MARK_R.height;
  const w = MARK_R.width * scale;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width={size} height={size} rx={size * 0.24} fill="var(--accent)" />
      <path
        d={MARK_R.d}
        fill="#FFF8F2"
        transform={`translate(${(size - w) / 2 + size * 0.015} ${(size - glyphHeight) / 2}) scale(${scale})`}
      />
    </svg>
  );
}
