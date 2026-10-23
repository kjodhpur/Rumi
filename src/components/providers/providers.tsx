"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorker } from "./service-worker";
import { spring } from "@/lib/motion";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* reducedMotion="user": transforms/layout animations are skipped when the OS asks for less motion. */}
      <MotionConfig reducedMotion="user" transition={spring}>
        <TooltipProvider delayDuration={400}>
          {children}
          <Toaster />
          <ServiceWorker />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
