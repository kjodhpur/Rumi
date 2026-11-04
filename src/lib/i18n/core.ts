import { LOCALE_INFO, type Locale } from "./config";
import type { Messages } from "./messages/en";

/** A plural entry: Intl.PluralRules picks the form; "other" is the fallback. */
export interface Plural {
  one: string;
  other: string;
  zero?: string;
  few?: string;
  many?: string;
}

type Leaf = string | Plural;

/** Dotted paths to the leaves (strings or plural entries) of a namespace. */
export type KeyOf<T> = {
  [K in keyof T & string]: T[K] extends Leaf
    ? K
    : T[K] extends object
      ? `${K}.${KeyOf<T[K]>}`
      : never;
}[keyof T & string];

export type Namespace = keyof Messages;
export type Params = Record<string, string | number>;
export type Translator<N extends Namespace> = (key: KeyOf<Messages[N]>, params?: Params) => string;

function lookup(tree: unknown, path: string): unknown {
  let node = tree;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function isPlural(value: unknown): value is Plural {
  return Boolean(value) && typeof value === "object" && typeof (value as Plural).other === "string";
}

export function interpolate(text: string, params?: Params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Looks a key up in the locale's messages, falling back to English, then to the key. */
export function translate(
  locale: Locale,
  messages: Messages,
  fallback: Messages,
  key: string,
  params?: Params,
): string {
  let value = lookup(messages, key);
  if (value === undefined) value = lookup(fallback, key);
  if (typeof value === "string") return interpolate(value, params);
  if (isPlural(value)) {
    const count = Number(params?.count ?? 0);
    const form = new Intl.PluralRules(LOCALE_INFO[locale].intl).select(count) as keyof Plural;
    return interpolate(value[form] ?? value.other, params);
  }
  return key;
}

export function createTranslator<N extends Namespace>(
  locale: Locale,
  messages: Messages,
  fallback: Messages,
  namespace: N,
): Translator<N> {
  return (key, params) => translate(locale, messages, fallback, `${namespace}.${key}`, params);
}

/** Deep merge for structure-only locales: missing strings come from English. */
export function withFallback(partial: DeepPartial<Messages>, base: Messages): Messages {
  const merge = (a: unknown, b: unknown): unknown => {
    if (!a || typeof a !== "object" || isPlural(b)) return a ?? b;
    const out: Record<string, unknown> = { ...(b as Record<string, unknown>) };
    for (const [k, v] of Object.entries(a as Record<string, unknown>))
      out[k] = merge(v, (b as Record<string, unknown>)[k]);
    return out;
  };
  return merge(partial, base) as Messages;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

/** Every leaf path of a message tree, for the missing-key check. */
export function leafPaths(tree: unknown, prefix = ""): string[] {
  if (typeof tree === "string" || isPlural(tree)) return [prefix];
  if (!tree || typeof tree !== "object") return [];
  return Object.entries(tree as Record<string, unknown>).flatMap(([k, v]) =>
    leafPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

/** {placeholders} used in a string or plural entry. */
export function placeholders(value: unknown): string[] {
  const texts = typeof value === "string" ? [value] : isPlural(value) ? Object.values(value) : [];
  return [
    ...new Set(texts.flatMap((t) => [...String(t).matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))),
  ].sort();
}

export function valueAt(tree: unknown, path: string) {
  return lookup(tree, path);
}

type TemplateEntry = { key: string; pattern: RegExp | null; names: string[] };
const matchers = new WeakMap<object, { exact: Map<string, string>; entries: TemplateEntry[] }>();

function matcherFor(source: Record<string, string>) {
  let m = matchers.get(source);
  if (!m) {
    const entries = Object.entries(source).map(([key, text]) => {
      const names = [...text.matchAll(/\{(\w+)\}/g)].map((x) => x[1]!);
      if (!names.length) return { key, pattern: null, names };
      const body = text
        .split(/\{\w+\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("(.+?)");
      return { key, pattern: new RegExp(`^${body}$`), names };
    });
    m = {
      exact: new Map(entries.filter((e) => !e.pattern).map((e) => [source[e.key]!, e.key])),
      entries,
    };
    matchers.set(source, m);
  }
  return m;
}

/**
 * Text that was stored or sent in English (`source` holds the English templates) rendered
 * from `target` in another language. Null when the text matches no template.
 */
export function translateTemplate(
  text: string,
  source: Record<string, string>,
  target: Record<string, string>,
): string | null {
  const { exact, entries } = matcherFor(source);
  const key = exact.get(text);
  if (key) return target[key] ?? null;
  for (const e of entries) {
    const match = e.pattern?.exec(text);
    if (match && target[e.key])
      return interpolate(
        target[e.key]!,
        Object.fromEntries(e.names.map((name, i) => [name, match[i + 1] ?? ""])),
      );
  }
  return null;
}
