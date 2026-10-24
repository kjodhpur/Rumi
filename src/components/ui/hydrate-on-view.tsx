"use client";

import * as React from "react";

/**
 * Keeps server-rendered HTML as-is during the initial hydration and hydrates it
 * only when it comes near the viewport. React skips hydrating children under
 * `dangerouslySetInnerHTML`, so off-screen content costs nothing at load.
 * Anything mounted after the page has hydrated (new list items, client
 * navigations) renders immediately.
 */
export function HydrateOnView({
  children,
  margin = "800px",
  className,
  style,
}: {
  children: React.ReactNode;
  margin?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(
    () => typeof window === "undefined" || document.documentElement.dataset.hydrated === "true",
  );

  React.useEffect(() => {
    if (active) return;
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) return setActive(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setActive(true);
        }
      },
      { rootMargin: `${margin} 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, margin]);

  if (!active) {
    return <div ref={ref} className={className} style={style} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />;
  }
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Same idea for chrome that CSS shows at only one breakpoint (the desktop
 * sidebar, the mobile tab bar): it hydrates only where it's actually visible.
 */
export function HydrateForMedia({ query, children, className }: { query: string; children: React.ReactNode; className?: string }) {
  const [active, setActive] = React.useState(
    () => typeof window === "undefined" || document.documentElement.dataset.hydrated === "true",
  );

  React.useEffect(() => {
    if (active) return;
    const media = window.matchMedia(query);
    if (media.matches) return setActive(true);
    const onChange = (event: MediaQueryListEvent) => event.matches && setActive(true);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [active, query]);

  if (!active) return <div className={className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />;
  return <div className={className}>{children}</div>;
}
