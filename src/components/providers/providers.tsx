"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorker } from "./service-worker";
import { spring } from "@/lib/motion";

export function Providers({ children }: { children: React.ReactNode }) {
  // A stable signal that the page is interactive (used by end-to-end tests).
  React.useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* reducedMotion="user": transforms/layout animations are skipped when the OS asks for less motion. */}
      <MotionConfig reducedMotion="user" transition={spring}>
        {children}
        <Toaster />
        <ServiceWorker />
      </MotionConfig>
    </ThemeProvider>
  );
}
