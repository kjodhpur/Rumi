"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { springSheet } from "@/lib/motion";

const EDGE = 28;

/**
 * Edge-swipe to go back, for installed (standalone) PWAs and Android where the
 * browser doesn't provide one. iOS Safari tabs keep their own native gesture.
 */
export function SwipeBack({ children, fallbackHref = "/" }: { children: React.ReactNode; fallbackHref?: string }) {
  const router = useRouter();
  const x = useMotionValue(0);
  const shade = useTransform(x, [0, 24, 400], [0, 0.12, 0.04]);
  const [enabled, setEnabled] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const iosBrowserTab =
      /iP(hone|ad|od)/.test(navigator.userAgent) &&
      !(navigator as Navigator & { standalone?: boolean }).standalone;
    setEnabled(touch && !iosBrowserTab);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let horizontal: boolean | null = null;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || t.clientX > EDGE) return;
      tracking = true;
      horizontal = null;
      startX = lastX = t.clientX;
      startY = t.clientY;
      lastT = e.timeStamp;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (horizontal === null && Math.hypot(dx, dy) > 8) horizontal = Math.abs(dx) > Math.abs(dy);
      if (!horizontal) {
        if (horizontal === false) tracking = false;
        return;
      }
      e.preventDefault();
      velocity = ((t.clientX - lastX) / Math.max(1, e.timeStamp - lastT)) * 1000;
      lastX = t.clientX;
      lastT = e.timeStamp;
      x.set(Math.max(0, dx));
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      const width = window.innerWidth;
      if (x.get() > width * 0.35 || velocity > 600) {
        void animate(x, width, { ...springSheet, velocity }).then(() => {
          if (window.history.length > 1) router.back();
          else router.push(fallbackHref);
          // The next page animates itself in; reset for bfcache restores.
          setTimeout(() => x.set(0), 400);
        });
      } else {
        void animate(x, 0, springSheet);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, router, x, fallbackHref]);

  return (
    <div ref={ref} className="relative">
      <motion.div style={{ x }} className="relative bg-bg">
        <motion.div
          aria-hidden
          style={{ opacity: shade }}
          className="pointer-events-none absolute inset-y-0 -left-6 w-6 bg-gradient-to-l from-black/40 to-transparent"
        />
        {children}
      </motion.div>
    </div>
  );
}
