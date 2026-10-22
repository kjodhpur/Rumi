import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "./input";

/**
 * Native select, styled. On phones this opens the OS picker — the most
 * thumb-friendly control there is — and it is fully accessible for free.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className={cn("relative", className)}>
      <select
        ref={ref}
        className={cn(inputBase, "h-11 appearance-none pr-10 pl-3.5")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-[18px] -translate-y-1/2 text-ink-3"
        strokeWidth={1.75}
        aria-hidden
      />
    </div>
  );
});
