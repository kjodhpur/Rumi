import "server-only";
import { waitUntil } from "@vercel/functions";

/**
 * Runs work after the response is sent. On Vercel the function stays alive via
 * waitUntil; on a long-lived Node server the promise simply keeps running.
 */
export function runInBackground(label: string, task: () => Promise<unknown>) {
  const promise = task().catch((error) => console.error(`[background:${label}]`, error));
  try {
    waitUntil(promise);
  } catch {
    // Not in a Vercel request context — nothing to extend.
  }
}
