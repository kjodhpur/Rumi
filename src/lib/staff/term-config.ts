import { FACTORS, type FactorKey, type Importance } from "@/lib/options";

/** A term's matching configuration (Phase 1). Pure. */
export interface TermConfig {
  /** School question keys students must answer before finishing their profile. */
  requiredQuestions: string[];
  /** Highest importance students may give a factor (0 skip … 3 must). */
  maxImportance: Partial<Record<FactorKey, Importance>>;
}

export function parseTermConfig(value: unknown): TermConfig {
  const v = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const required = Array.isArray(v.requiredQuestions) ? v.requiredQuestions.filter((k): k is string => typeof k === "string" && /^[a-z0-9_]{3,40}$/.test(k)).slice(0, 20) : [];
  const maxImportance: Partial<Record<FactorKey, Importance>> = {};
  const raw = v.maxImportance && typeof v.maxImportance === "object" ? (v.maxImportance as Record<string, unknown>) : {};
  for (const f of FACTORS) {
    const n = raw[f];
    if (n === 0 || n === 1 || n === 2) maxImportance[f] = n;
  }
  return { requiredQuestions: [...new Set(required)], maxImportance };
}
