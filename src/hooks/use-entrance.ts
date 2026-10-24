"use client";

import { useState } from "react";

/**
 * Entrance class for list items. Items that arrived with the server HTML settle
 * in with transform only (fully opaque from the first frame, so they never delay
 * Largest Contentful Paint); anything added afterwards fades up.
 */
export function useEntrance(initialIds: readonly string[]) {
  const [state] = useState(() => ({
    hydrating: typeof document === "undefined" || document.documentElement.dataset.hydrated !== "true",
    ids: new Set(initialIds),
  }));
  return (id: string) => (state.hydrating && state.ids.has(id) ? "animate-settle" : "animate-reveal");
}
