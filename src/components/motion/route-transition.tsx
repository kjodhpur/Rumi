"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import { spring } from "@/lib/motion";

// Survives template remounts: the path we're navigating *from*.
let previousPath: string | null = null;

function depth(path: string) {
  return path.split("/").filter(Boolean).length;
}

/**
 * Native-feeling route changes: drilling deeper slides in from the right,
 * going back slides in from the left, switching tabs is a quick fade.
 * Only transform + opacity animate, and the first paint never animates.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [initial] = React.useState<TargetAndTransition | false>(() => {
    const from = previousPath;
    previousPath = pathname;
    if (!from || from === pathname) return false;
    const d = depth(pathname) - depth(from);
    if (d > 0) return { opacity: 0, x: 28 };
    if (d < 0) return { opacity: 0, x: -28 };
    return { opacity: 0, y: 6 };
  });

  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={initial} animate={{ opacity: 1, x: 0, y: 0 }} transition={spring}>
      {children}
    </motion.div>
  );
}
