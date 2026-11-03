import "server-only";

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import {
  buildWhyYouMatchPrompt,
  readBedrockConfig,
  redactSecret,
  resolveWhyYouMatch,
  type WhyYouMatchInput,
  type WhyYouMatchResult,
} from "./why-you-match";

export type { WhyYouMatchInput, WhyYouMatchResult };

const TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 100;

/**
 * Claude Sonnet 5.5 thinks before answering unless told otherwise, and it
 * rejects thinking.type "disabled". `between_tools` is the lowest setting and
 * skips up-front thinking when the request has no tools. Effort stays at low
 * so a three-sentence blurb does not spend a long reasoning budget.
 * https://platform.claude.com/docs/en/build-with-claude/thinking
 */
const THINKING_OFF = { type: "between_tools" } as const;

let runtime: BedrockRuntimeClient | null = null;
let runtimeKey = "";
let announcedMissingConfig = false;

const successCache = new Map<string, { sentences: string[]; expires: number }>();

function clientFor(
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
): BedrockRuntimeClient {
  const key = `${region}:${accessKeyId}`;
  if (!runtime || runtimeKey !== key) {
    runtime = new BedrockRuntimeClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    runtimeKey = key;
  }
  return runtime;
}

function textFromContent(blocks: ContentBlock[] | undefined): string {
  if (!blocks) return "";
  return blocks
    .map((block) => ("text" in block && typeof block.text === "string" ? block.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function cachedSentences(key: string): string[] | null {
  const hit = successCache.get(key);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    successCache.delete(key);
    return null;
  }
  return hit.sentences;
}

function remember(key: string, sentences: string[]) {
  if (successCache.size >= CACHE_MAX) {
    const oldest = successCache.keys().next().value;
    if (oldest) successCache.delete(oldest);
  }
  successCache.set(key, { sentences, expires: Date.now() + CACHE_TTL_MS });
}

async function converseText(
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  args: { system: string; user: string; modelId: string },
): Promise<string> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const response = await clientFor(region, accessKeyId, secretAccessKey).send(
      new ConverseCommand({
        modelId: args.modelId,
        system: [{ text: args.system }],
        messages: [{ role: "user", content: [{ text: args.user }] }],
        inferenceConfig: { maxTokens: 320 },
        outputConfig: { effort: "low" },
        additionalModelRequestFields: { thinking: THINKING_OFF },
      }),
      { abortSignal: abort.signal },
    );
    const output = response.output;
    const content = output && "message" in output ? output.message?.content : undefined;
    return textFromContent(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bedrock request failed.";
    throw new Error(redactSecret(redactSecret(message, secretAccessKey), accessKeyId));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Three short "why you match" sentences from the stored breakdown.
 * Missing credentials or a failed call return `source: "fallback"` and the
 * existing reason labels — callers keep rendering those.
 * Credentials are read from the environment only (`readBedrockConfig`).
 */
export async function generateWhyYouMatch(input: WhyYouMatchInput): Promise<WhyYouMatchResult> {
  try {
    const config = readBedrockConfig();
    if (!config.ok) {
      if (!announcedMissingConfig) {
        announcedMissingConfig = true;
        console.info(`[bedrock] ${config.error}`);
      }
      return resolveWhyYouMatch(input, {
        configured: false,
        modelId: "",
        unavailableError: config.error,
      });
    }

    const prompt = buildWhyYouMatchPrompt(input);
    const cacheKey = `${config.modelId}\n${prompt.system}\n${prompt.user}`;
    const hit = cachedSentences(cacheKey);
    if (hit) return { sentences: hit, source: "bedrock" };

    const result = await resolveWhyYouMatch(input, {
      configured: true,
      modelId: config.modelId,
      converse: (args) =>
        converseText(config.region, config.accessKeyId, config.secretAccessKey, args),
    });
    if (result.source === "bedrock") remember(cacheKey, result.sentences);
    else if (result.error?.startsWith("Bedrock request failed")) {
      console.info(`[bedrock] ${result.error.replace(/\s+/g, " ").slice(0, 300)}`);
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bedrock request failed.";
    console.info(`[bedrock] ${message}`);
    return resolveWhyYouMatch(input, {
      configured: false,
      modelId: "",
      unavailableError: `Bedrock request failed: ${message}`,
    });
  }
}
