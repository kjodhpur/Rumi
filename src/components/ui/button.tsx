"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[background-color,color,box-shadow,opacity] duration-150 ease-out-quint",
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-ink-inverse shadow-sm shadow-highlight hover:bg-ink/90 dark:hover:bg-ink/85",
        accent:
          "bg-accent-strong text-on-accent shadow-sm shadow-highlight hover:bg-accent-strong/90",
        secondary:
          "bg-surface text-ink shadow-xs ring-1 ring-line-strong ring-inset hover:bg-surface-hover",
        ghost: "text-ink hover:bg-surface-hover",
        subtle: "bg-surface-sunken text-ink hover:bg-surface-hover",
        danger: "bg-danger text-white shadow-sm shadow-highlight hover:bg-danger/90",
        "danger-ghost": "text-danger hover:bg-danger-soft",
        link: "h-auto px-0 text-accent-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-body-sm [&_svg]:size-4",
        md: "h-10 rounded-md px-4 text-body-sm [&_svg]:size-[18px]",
        lg: "h-12 rounded-md px-5 text-body [&_svg]:size-5",
        xl: "h-14 rounded-lg px-6 text-body [&_svg]:size-5",
        icon: "size-10 rounded-full [&_svg]:size-5",
        "icon-sm": "size-8 rounded-full [&_svg]:size-[18px]",
        "icon-lg": "size-12 rounded-full [&_svg]:size-[22px]",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "children">;

export interface ButtonProps
  extends MotionButtonProps,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  /** Renders the child element (e.g. a Link) with button styles; press feedback falls back to CSS. */
  asChild?: boolean;
  /** Shows a spinner and blocks interaction while keeping the button's width. */
  loading?: boolean;
  /** Briefly morphs the label into a checkmark to confirm an action. */
  success?: boolean;
  successLabel?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    block,
    asChild,
    loading = false,
    success = false,
    successLabel = "Done",
    disabled,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  if (asChild) {
    return (
      <Slot.Root
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, block }),
          "transition-transform active:scale-[0.97]",
          className,
        )}
        {...(props as React.HTMLAttributes<HTMLElement>)}
      >
        {children}
      </Slot.Root>
    );
  }

  const state = success ? "success" : loading ? "loading" : "idle";

  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={springSnappy}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-state={state}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-opacity duration-150",
          state !== "idle" && "opacity-0",
        )}
      >
        {children}
      </span>
      <AnimatePresence initial={false}>
        {state === "loading" ? (
          <motion.span
            key="loading"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={springSnappy}
          >
            <Spinner className="size-[18px]" />
            <span className="sr-only">Loading</span>
          </motion.span>
        ) : null}
        {state === "success" ? (
          <motion.span
            key="success"
            className="absolute inset-0 flex items-center justify-center gap-1.5"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={springSnappy}
          >
            <AnimatedCheck />
            {size === "icon" || size === "icon-sm" || size === "icon-lg" ? null : (
              <span>{successLabel}</span>
            )}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
});

/** A checkmark that draws itself — used to confirm an action in place. */
export function AnimatedCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-[18px]", className)}
      aria-hidden
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
      />
    </svg>
  );
}

export { buttonVariants };
