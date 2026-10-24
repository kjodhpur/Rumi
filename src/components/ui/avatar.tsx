import Image from "next/image";
import { cn, initials } from "@/lib/utils";
import { imagePlaceholder } from "@/lib/photos";

interface AvatarProps {
  src?: string | null;
  firstName?: string | null;
  lastInitial?: string | null;
  size?: number;
  className?: string;
  placeholder?: string | null;
  /** Small presence dot (online now). */
  online?: boolean;
}

export function Avatar({
  src,
  firstName,
  lastInitial,
  size = 40,
  className,
  placeholder,
  online,
}: AvatarProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-surface-sunken ring-1 ring-line">
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes={`${size * 2}px`}
            className="object-cover"
            placeholder={imagePlaceholder(placeholder)}
          />
        ) : (
          <span
            className="font-semibold text-ink-2"
            style={{ fontSize: Math.max(11, size * 0.36) }}
            aria-hidden
          >
            {initials(firstName, lastInitial)}
          </span>
        )}
      </span>
      {online ? (
        <span
          className="absolute right-0 bottom-0 block rounded-full bg-success ring-2 ring-surface"
          style={{ width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24) }}
        >
          <span className="sr-only">Online</span>
        </span>
      ) : null}
    </span>
  );
}
