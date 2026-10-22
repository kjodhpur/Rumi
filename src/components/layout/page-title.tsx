"use client";

import * as React from "react";

interface PageTitleState {
  title: string;
  /** True while the page's large title is scrolled under the top bar. */
  collapsed: boolean;
}

const PageTitleContext = React.createContext<{
  state: PageTitleState;
  setState: React.Dispatch<React.SetStateAction<PageTitleState>>;
} | null>(null);

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PageTitleState>({ title: "", collapsed: false });
  const value = React.useMemo(() => ({ state, setState }), [state]);
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageTitleState() {
  return React.useContext(PageTitleContext)?.state ?? { title: "", collapsed: false };
}

/**
 * Registers a page's large title. The mobile top bar shows a compact copy once
 * the large title scrolls out of view — the iOS large-title pattern.
 */
export function useLargeTitle(title: string) {
  const ctx = React.useContext(PageTitleContext);
  const ref = React.useRef<HTMLHeadingElement>(null);
  const setState = ctx?.setState;

  React.useEffect(() => {
    if (!setState) return;
    setState({ title, collapsed: false });
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setState((s) => ({ ...s, title, collapsed: !entry.isIntersecting })),
      { rootMargin: "-56px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setState({ title: "", collapsed: false });
    };
  }, [title, setState]);

  return ref;
}
