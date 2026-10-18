import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ASU_EMAIL_DOMAIN } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAsuEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ASU_EMAIL_DOMAIN}`);
}

export function displayName(firstName: string, lastInitial: string): string {
  const initial = lastInitial.trim().replace(/\.$/, "").charAt(0).toUpperCase();
  return `${firstName.trim()} ${initial}.`;
}

export function instagramUrl(handle: string): string {
  const clean = handle.replace(/^@/, "").trim();
  return `https://instagram.com/${clean}`;
}

export function formatBudget(min: number, max: number): string {
  return `$${min.toLocaleString()}–$${max.toLocaleString()}/mo`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function jaccardWeighted(
  a: Array<{ id: string; weight: number }>,
  b: Array<{ id: string; weight: number }>,
): number {
  const mapA = new Map(a.map((x) => [x.id, x.weight]));
  const mapB = new Map(b.map((x) => [x.id, x.weight]));
  const ids = new Set<string>([
    ...Array.from(mapA.keys()),
    ...Array.from(mapB.keys()),
  ]);
  let intersection = 0;
  let union = 0;
  for (const id of Array.from(ids)) {
    const wa = mapA.get(id) ?? 0;
    const wb = mapB.get(id) ?? 0;
    intersection += Math.min(wa, wb);
    union += Math.max(wa, wb);
  }
  if (union === 0) return 0;
  return intersection / union;
}

export function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
): number {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of Array.from(keys)) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function budgetsOverlap(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
): boolean {
  return aMin <= bMax && bMin <= aMax;
}

export function areasCompatible(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return true;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.some((area) => setB.has(area.toLowerCase()));
}

export function moveInCompatible(a: string, b: string): boolean {
  if (a === "ASAP" || b === "ASAP") return true;
  return a === b;
}

export function genderCompatible(
  aOwn: string,
  aPref: string,
  bOwn: string,
  bPref: string,
): boolean {
  const matches = (own: string, pref: string, otherOwn: string): boolean => {
    if (pref === "any" || pref === "no-preference") return true;
    if (pref === "same-gender") {
      if (own === "prefer-not-to-say" || otherOwn === "prefer-not-to-say") return true;
      return own === otherOwn;
    }
    return true;
  };
  return matches(aOwn, aPref, bOwn) && matches(bOwn, bPref, aOwn);
}
