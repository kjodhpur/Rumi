"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-surface",
        "ring-1 ring-line-strong transition-colors duration-150 ring-inset",
        "data-[state=checked]:bg-ink data-[state=checked]:ring-ink",
        "data-[state=indeterminate]:bg-ink data-[state=indeterminate]:ring-ink",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-ink-inverse data-[state=checked]:animate-in data-[state=checked]:zoom-in-50">
        {props.checked === "indeterminate" ? (
          <Minus className="size-3.5" strokeWidth={2.5} />
        ) : (
          <Check className="size-3.5" strokeWidth={2.5} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
