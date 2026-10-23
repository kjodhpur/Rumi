"use client";

import * as React from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/** Lenis on the landing page only; skipped entirely when the OS asks for less motion. */
export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -72 }, lerp: 0.12 });
    return () => lenis.destroy();
  }, []);
  return null;
}
