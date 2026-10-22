"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useLargeTitle } from "./page-title";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Visually smaller title for nested pages. */
  size?: "lg" | "md";
}

export function PageHeader({ title, description, actions, className, size = "lg" }: PageHeaderProps) {
  const ref = useLargeTitle(title);
  return (
    <header className={cn("flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between lg:pb-8", className)}>
      <div className="min-w-0">
        <h1
          ref={ref}
          className={cn(
            "font-display text-ink",
            size === "lg" ? "text-display-md lg:text-display-lg" : "text-display-sm lg:text-display-md",
          )}
        >
          {title}
        </h1>
        {description ? <p className="mt-1.5 text-body-sm text-ink-2 lg:text-body">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
