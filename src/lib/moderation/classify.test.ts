import { describe, expect, it, vi } from "vitest";
import {
  claudeClassifier,
  ClassifierFallback,
  modelReportReason,
  screenText,
  type Classifier,
  type MessagesParser,
  type ModelVerdict,
} from "./classify";
import { isSevere } from "./patterns";

const fixed = (verdict: ModelVerdict): Classifier => ({ classify: vi.fn(async () => verdict) });

describe("screenText", () => {
  it("uses the regex alone when no classifier is allowed (flag off or school opted out)", async () => {
    const result = await screenText("Send the deposit first", { classifier: null, timeoutMs: 50 });
    expect(result).toEqual({ flags: ["payment"], verdict: null, fallback: null });
  });

  it("doesn't ask the model when the regex already reports", async () => {
    const classifier = fixed({ category: "scam", confidence: 0.99 });
    const result = await screenText("Pay with Zelle", { classifier, timeoutMs: 50 });
    expect(classifier.classify).not.toHaveBeenCalled();
    expect(result.verdict).toBeNull();
  });

  it("returns the model verdict, clamped to 0–1", async () => {
    const result = await screenText("hello", {
      classifier: fixed({ category: "none", confidence: 1.4 }),
      timeoutMs: 50,
    });
    expect(result.verdict).toEqual({ category: "none", confidence: 1 });
    expect(result.fallback).toBeNull();
  });

  it("falls back to regex on timeout and aborts the request", async () => {
    let aborted = false;
    const slow: Classifier = {
      classify: (_text, signal) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => (aborted = true));
          setTimeout(() => resolve({ category: "threat", confidence: 1 }), 500);
        }),
    };
    const result = await screenText("text me at 480-555-0199", { classifier: slow, timeoutMs: 20 });
    expect(result).toEqual({ flags: ["contact"], verdict: null, fallback: "timeout" });
    expect(aborted).toBe(true);
  });

  it("falls back to regex on an API error, refusal or unparseable output", async () => {
    const failing = (error: Error): Classifier => ({ classify: async () => Promise.reject(error) });
    for (const [error, reason] of [
      [new Error("529 overloaded"), "error"],
      [new ClassifierFallback("refusal"), "refusal"],
      [new ClassifierFallback("invalid"), "invalid"],
    ] as const) {
      const result = await screenText("hi", { classifier: failing(error), timeoutMs: 50 });
      expect(result).toEqual({ flags: [], verdict: null, fallback: reason });
    }
  });
});

describe("modelReportReason", () => {
  it("reports at or above the threshold and maps categories to report reasons", () => {
    expect(modelReportReason({ category: "harassment", confidence: 0.8 }, 0.8)).toBe("harassment");
    expect(modelReportReason({ category: "threat", confidence: 0.95 }, 0.8)).toBe("safety");
    expect(modelReportReason({ category: "scam", confidence: 0.9 }, 0.8)).toBe("scam");
  });

  it("never reports below the threshold, for 'none', or without a verdict", () => {
    expect(modelReportReason({ category: "threat", confidence: 0.79 }, 0.8)).toBeNull();
    expect(modelReportReason({ category: "none", confidence: 1 }, 0.8)).toBeNull();
    expect(modelReportReason(null, 0.8)).toBeNull();
  });
});

/**
 * A small labelled corpus with recorded model verdicts. It checks the pipeline's decision
 * (regex report, else model at threshold), not the model itself: no network calls.
 */
const CORPUS: { text: string; report: boolean; verdict: ModelVerdict }[] = [
  {
    text: "Send the deposit first and I'll hold the room",
    report: true,
    verdict: { category: "scam", confidence: 0.97 },
  },
  {
    text: "I'm overseas, my agent will mail the keys once you pay",
    report: true,
    verdict: { category: "scam", confidence: 0.91 },
  },
  {
    text: "You're disgusting and everyone on your floor hates you",
    report: true,
    verdict: { category: "harassment", confidence: 0.93 },
  },
  {
    text: "I know which building you're in. Watch yourself.",
    report: true,
    verdict: { category: "threat", confidence: 0.9 },
  },
  { text: "kys", report: true, verdict: { category: "harassment", confidence: 0.99 } },
  {
    text: "I'll venmo you my half of the electric bill",
    report: false,
    verdict: { category: "none", confidence: 0.9 },
  },
  {
    text: "I don't want a roommate who smokes, sorry",
    report: false,
    verdict: { category: "none", confidence: 0.95 },
  },
  {
    text: "lol that exam killed me",
    report: false,
    verdict: { category: "none", confidence: 0.97 },
  },
  {
    text: "Are you a night owl or early bird?",
    report: false,
    verdict: { category: "none", confidence: 0.99 },
  },
  {
    text: "Your music was kind of loud last night, can we talk?",
    report: false,
    verdict: { category: "harassment", confidence: 0.35 },
  },
];

describe("pipeline on the fixture corpus", () => {
  it("catches what the regex misses without adding false reports", async () => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let regexOnlyTp = 0;
    for (const item of CORPUS) {
      const result = await screenText(item.text, {
        classifier: fixed(item.verdict),
        timeoutMs: 50,
      });
      const reported = isSevere(result.flags) || modelReportReason(result.verdict, 0.8) !== null;
      if (reported && item.report) tp++;
      if (reported && !item.report) fp++;
      if (!reported && item.report) fn++;
      if (isSevere(result.flags) && item.report) regexOnlyTp++;
    }
    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    expect(recall).toBe(1);
    expect(recall).toBeGreaterThan(regexOnlyTp / (tp + fn));
    // "venmo" for a real shared bill is a known regex false positive; the model can't undo it.
    expect(precision).toBeGreaterThanOrEqual(0.8);
  });
});

describe("claudeClassifier", () => {
  const stub = (response: { stop_reason: string; parsed_output: ModelVerdict | null }) => {
    const parse = vi.fn(async () => response);
    return { client: { messages: { parse } } as unknown as MessagesParser, parse };
  };

  it("sends the message as data with structured output, low effort and no retries", async () => {
    const { client, parse } = stub({
      stop_reason: "end_turn",
      parsed_output: { category: "none", confidence: 0.9 },
    });
    const signal = new AbortController().signal;
    await expect(
      claudeClassifier(client, "anthropic/claude-opus-5.5").classify("hi", signal),
    ).resolves.toEqual({
      category: "none",
      confidence: 0.9,
    });
    const [params, options] = parse.mock.calls[0] as unknown as [
      { model: string; messages: { content: string }[]; output_config: { effort: string } },
      { signal: AbortSignal; maxRetries: number },
    ];
    expect(params.model).toBe("anthropic/claude-opus-5.5");
    expect(params.messages[0]?.content).toBe("<message>\nhi\n</message>");
    expect(params.output_config.effort).toBe("low");
    expect(options).toEqual({ signal, maxRetries: 0 });
  });

  it("turns a refusal or missing output into a fallback", async () => {
    const signal = new AbortController().signal;
    await expect(
      claudeClassifier(stub({ stop_reason: "refusal", parsed_output: null }).client, "m").classify(
        "x",
        signal,
      ),
    ).rejects.toMatchObject({ reason: "refusal" });
    await expect(
      claudeClassifier(
        stub({ stop_reason: "max_tokens", parsed_output: null }).client,
        "m",
      ).classify("x", signal),
    ).rejects.toMatchObject({ reason: "invalid" });
  });
});
