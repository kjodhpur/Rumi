import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
  /** Hero-scale brand lockup vs compact nav/logo */
  size?: "hero" | "lg" | "md" | "sm";
  as?: "span" | "p" | "h1" | "div";
};

const sizeClass: Record<NonNullable<WordmarkProps["size"]>, string> = {
  hero: "text-5xl sm:text-6xl md:text-7xl",
  lg: "text-3xl",
  md: "text-2xl",
  sm: "text-xl",
};

/** Live-text Rumi lockup — Inter, tight tracking, lowercase "rumi". */
export function Wordmark({ className, size = "md", as: Tag = "span" }: WordmarkProps) {
  return (
    <Tag className={cn("rumi-wordmark", sizeClass[size], className)}>
      {APP_NAME.toLowerCase()}
    </Tag>
  );
}
