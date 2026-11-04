import { en } from "./messages/en";
import type { Translator } from "./core";

type Key = keyof typeof en.scenarios;

/** Rumi's own scenario questions have translations; school-added ones show as written. */
export function isBuiltInScenario(key: string): key is Key {
  return Object.hasOwn(en.scenarios, key);
}

export function localizeScenario<
  Q extends {
    key: string;
    stem: string;
    builtIn?: boolean;
    choices: { key: string; label: string }[];
  },
>(q: Q, t: Translator<"scenarios">): Q {
  if (!q.builtIn || !isBuiltInScenario(q.key)) return q;
  const key = q.key;
  const choices = en.scenarios[key].choices as Record<string, unknown>;
  return {
    ...q,
    stem: t(`${key}.stem`),
    choices: q.choices.map((c) =>
      Object.hasOwn(choices, c.key)
        ? { ...c, label: t(`${key}.choices.${c.key}.label` as never) }
        : c,
    ),
  };
}
