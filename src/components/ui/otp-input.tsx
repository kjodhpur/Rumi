"use client";

import * as React from "react";
import { motion, useAnimationControls } from "motion/react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  "aria-describedby"?: string;
}

/**
 * One real input (so paste, autofill and `one-time-code` suggestions work)
 * rendered as separate boxes. Shakes horizontally when marked invalid.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  autoFocus,
  ...aria
}: OtpInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const controls = useAnimationControls();

  React.useEffect(() => {
    if (invalid) {
      void controls.start({ x: [0, -8, 8, -6, 6, -3, 0], transition: { duration: 0.4 } });
    }
  }, [invalid, controls]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <motion.div animate={controls} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={`${length}-digit code`}
        aria-invalid={invalid || undefined}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
        {...aria}
      />
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-hidden>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? "";
          const isActive = focused && i === activeIndex && value.length < length;
          return (
            <div
              key={i}
              className={cn(
                "relative flex h-14 items-center justify-center rounded-md bg-surface text-display-sm font-semibold text-ink tabular shadow-xs",
                "ring-1 ring-line-strong ring-inset transition-shadow duration-150",
                isActive && "ring-2 ring-focus",
                invalid && "ring-2 ring-danger",
                disabled && "opacity-60",
              )}
            >
              {char ? (
                <motion.span
                  key={char + i}
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {char}
                </motion.span>
              ) : isActive ? (
                <span className="h-6 w-px animate-pulse bg-ink" />
              ) : null}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
