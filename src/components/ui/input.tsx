import * as React from "react";
import { cn } from "@/lib/utils";

export const inputBase = [
  "w-full min-w-0 rounded-md bg-surface text-body text-ink shadow-xs",
  "ring-1 ring-line-strong ring-inset outline-none",
  "transition-[box-shadow,background-color] duration-150 ease-out-quint",
  "placeholder:text-ink-3",
  "hover:ring-ink-3/40",
  "focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
  "aria-invalid:ring-2 aria-invalid:ring-danger",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, type = "text", ...props },
  ref,
) {
  if (!leading && !trailing) {
    return (
      <input ref={ref} type={type} className={cn(inputBase, "h-11 px-3.5", className)} {...props} />
    );
  }
  return (
    <div className={cn("relative flex items-center", className)}>
      {leading ? (
        <span className="pointer-events-none absolute left-3.5 flex items-center text-ink-3 [&_svg]:size-[18px]">
          {leading}
        </span>
      ) : null}
      <input
        ref={ref}
        type={type}
        className={cn(inputBase, "h-11", leading ? "pl-10" : "pl-3.5", trailing ? "pr-11" : "pr-3.5")}
        {...props}
      />
      {trailing ? (
        <span className="absolute right-1.5 flex items-center text-ink-3">{trailing}</span>
      ) : null}
    </div>
  );
});
