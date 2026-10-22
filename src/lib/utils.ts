import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number) {
  return usd.format(value);
}

export function formatBudget(min: number, max: number) {
  return `${formatMoney(min)}–${formatMoney(max)}`;
}

/** "Maya R." — we never show full last names. */
export function displayName(firstName: string | null | undefined, lastInitial?: string | null) {
  const first = (firstName ?? "").trim() || "Rumi member";
  const initial = (lastInitial ?? "").trim().charAt(0).toUpperCase();
  return initial ? `${first} ${initial}.` : first;
}

export function initials(firstName?: string | null, lastInitial?: string | null) {
  return `${(firstName ?? "?").trim().charAt(0)}${(lastInitial ?? "").trim().charAt(0)}`.toUpperCase();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stable, URL-safe absolute URL for server-side redirects and emails. */
export function absoluteUrl(path = "/") {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
