import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-ui text-sm font-semibold transition duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-contrast hover:bg-accent-hover shadow-elevation1",
        secondary: "bg-bg-muted text-ink hover:bg-border",
        outline: "border border-border-strong text-ink bg-transparent hover:bg-accent-soft",
        ghost: "text-ink-muted hover:bg-accent-soft hover:text-accent",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-sm px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";
