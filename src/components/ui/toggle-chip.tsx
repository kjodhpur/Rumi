"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

interface ToggleChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  icon?: React.ReactNode;
  size?: "sm" | "md";
}

/** Multi-select pill. The check slides in so selection reads at a glance. */
export function ToggleChip({
  pressed,
  onPressedChange,
  icon,
  size = "md",
  className,
  children,
  ...props
}: ToggleChipProps) {
  return (
    <motion.button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      whileTap={{ scale: 0.96 }}
      transition={springSnappy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        "transition-[background-color,color,box-shadow] duration-150 ease-out-quint",
        size === "sm" ? "h-8 px-3 text-body-sm" : "h-10 px-4 text-body-sm",
        pressed
          ? "bg-ink text-ink-inverse shadow-sm"
          : "bg-surface text-ink ring-1 ring-line-strong ring-inset hover:bg-surface-hover",
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      <AnimatePresence initial={false}>
        {pressed ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={springSnappy}
            className="-ml-0.5 inline-flex"
          >
            <Check className="size-4" strokeWidth={2.25} aria-hidden />
          </motion.span>
        ) : icon ? (
          <span className="-ml-0.5 inline-flex text-ink-2 [&_svg]:size-4">{icon}</span>
        ) : null}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}
