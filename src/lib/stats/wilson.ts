/** 95% Wilson score interval and the pilot's small-count rule. */

export interface Interval {
  low: number;
  high: number;
}

/** Wilson interval for k successes in n trials. Returns null when n is 0. */
export function wilson(k: number, n: number, z = 1.96): Interval | null {
  if (n <= 0 || k < 0 || k > n) return null;
  const phat = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (phat + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n))) / denom;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

/** Counts from 1 to 4 are hidden. Zero stays zero. */
export function suppressCount(n: number): number | "<5" {
  if (n > 0 && n < 5) return "<5";
  return n;
}

/** Conservative: non-overlapping 95% intervals count as a difference. */
export function intervalsDiffer(a: Interval | null, b: Interval | null) {
  if (!a || !b) return false;
  return a.high < b.low || b.high < a.low;
}
