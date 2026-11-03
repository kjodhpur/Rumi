import "server-only";

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BEDROCK_EFFORT,
  buildWhyYouMatchPrompt,
  readBedrockConfig,
  redactSecret,
  resolveWhyYouMatch,
  type WhyYouMatchInput,
  type WhyYouMatchResult,
} from "./why-you-match";

export type { WhyYouMatchInput, WhyYouMatchResult };

/** Max effort thinks before the three sentences, so this waits longer than a short reply. */
const TIMEOUT_MS = 60_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 100;
/**
 * Thinking tokens count toward maxTokens. Opus 5.5 cannot turn thinking off.
 * Stay under 21,333 so non-streaming Converse is still allowed.
 */
const MAX_TOKENS = 16_000;

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
        inferenceConfig: { maxTokens: MAX_TOKENS },
        // Adaptive thinking stays on. Opus 5.5 rejects thinking.type "disabled".
        outputConfig: { effort: BEDROCK_EFFORT },
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
