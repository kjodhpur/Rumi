import "server-only";
import { lookup } from "node:dns/promises";
import { isPublicAddress, normalizeFeedUrl } from "./feed-url";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

export class FeedError extends Error {}

/**
 * Downloads a student's .ics feed. The URL comes from the student, so this guards against
 * server-side request forgery: https only, every hop's host must resolve to public
 * addresses, redirects are followed by hand (and re-checked), with a size cap and timeout.
 */
export async function fetchCalendarFeed(raw: string): Promise<string> {
  const first = normalizeFeedUrl(raw);
  if (!first) throw new FeedError("Use the https:// (or webcal://) link from your calendar.");
  let url: URL = first;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);
    const response: Response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "text/calendar, text/plain;q=0.8" },
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      const resolved = next ? normalizeFeedUrl(new URL(next, url).toString()) : null;
      if (!resolved) throw new FeedError("That link redirects somewhere we can't follow.");
      url = resolved;
      continue;
    }
    if (!response.ok)
      throw new FeedError("That link didn't work. Copy it again from your calendar.");
    return readCapped(response);
  }
  throw new FeedError("That link redirects too many times.");
}

async function assertPublicHost(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new FeedError("That link doesn't point to a public calendar.");
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new FeedError("That calendar is too big to import.");
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  if (!text.includes("BEGIN:VCALENDAR")) throw new FeedError("That link isn't a calendar feed.");
  return text;
}
