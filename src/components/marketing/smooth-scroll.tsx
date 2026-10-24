"use client";

import * as React from "react";
import { whenIdle } from "@/lib/idle";
import "lenis/dist/lenis.css";

/**
 * Lenis on the landing page only. It loads once the browser is idle (nobody
 * scrolls in the first frames) and is skipped when the OS asks for less motion.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: import("lenis").default | undefined;
    let cancelled = false;
    const cancelIdle = whenIdle(() => {
      void import("lenis").then(({ default: Lenis }) => {
        if (!cancelled) lenis = new Lenis({ autoRaf: true, anchors: { offset: -72 }, lerp: 0.12 });
      });
    }, 2500);
    return () => {
      cancelled = true;
      cancelIdle();
      lenis?.destroy();
    };
  }, []);
  return null;
}
