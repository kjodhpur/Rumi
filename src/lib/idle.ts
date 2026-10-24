/**
 * Runs `task` once the browser is idle — for work that shouldn't compete with
 * the first paint (realtime connections, prefetching chunks). Returns a cancel function.
 */
export function whenIdle(task: () => void, timeout = 2000) {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  // Safari has no requestIdleCallback; a short delay does the same job there.
  const handle = window.setTimeout(task, Math.min(timeout, 800));
  return () => window.clearTimeout(handle);
}
