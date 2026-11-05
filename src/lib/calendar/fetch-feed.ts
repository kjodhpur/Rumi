import "server-only";
import { request } from "node:https";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import { isPublicAddress, normalizeFeedUrl } from "./feed-url";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

export class FeedError extends Error {}

const NOT_PUBLIC = "That link doesn't point to a public calendar.";

/**
 * A DNS lookup for the connection itself that refuses private, loopback and link-local
 * addresses. Checking inside the connection's own lookup (rather than resolving first and
 * connecting later) closes the DNS-rebinding window: the address checked is the address used.
 */
export function publicOnlyLookup(resolve: typeof dnsLookup = dnsLookup): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, { all: true, verbatim: true }, (error, addresses: LookupAddress[]) => {
      if (error) return callback(error, "", 4);
      if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
        return callback(new FeedError(NOT_PUBLIC), "", 4);
      if (options.all) {
        (callback as unknown as (e: null, all: LookupAddress[]) => void)(null, addresses);
        return;
      }
      const wanted = options.family === 6 ? 6 : options.family === 4 ? 4 : 0;
      const pick = addresses.find((a) => !wanted || a.family === wanted) ?? addresses[0]!;
      callback(null, pick.address, pick.family);
    });
  };
}

interface Hop {
  status: number;
  location: string | null;
  body: string | null;
}

/**
 * Downloads a student's .ics feed. The URL comes from the student, so this guards against
 * server-side request forgery: https only, every hop's connection may only reach public
 * addresses (checked at connect time), redirects are followed by hand and re-checked, with a
 * size cap and a timeout.
 */
export async function fetchCalendarFeed(raw: string): Promise<string> {
  const first = normalizeFeedUrl(raw);
  if (!first) throw new FeedError("Use the https:// (or webcal://) link from your calendar.");
  let url: URL = first;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await get(url);
    if (response.status >= 300 && response.status < 400) {
      const resolved = response.location
        ? normalizeFeedUrl(new URL(response.location, url).toString())
        : null;
      if (!resolved) throw new FeedError("That link redirects somewhere we can't follow.");
      url = resolved;
      continue;
    }
    if (response.status < 200 || response.status >= 300 || response.body === null)
      throw new FeedError("That link didn't work. Copy it again from your calendar.");
    if (!response.body.includes("BEGIN:VCALENDAR"))
      throw new FeedError("That link isn't a calendar feed.");
    return response.body;
  }
  throw new FeedError("That link redirects too many times.");
}

function get(url: URL): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        lookup: publicOnlyLookup(),
        headers: { accept: "text/calendar, text/plain;q=0.8" },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location ?? null, body: null });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status, location: null, body: null });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.byteLength;
          if (size > MAX_BYTES) {
            req.destroy(new FeedError("That calendar is too big to import."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status,
            location: null,
            body: new TextDecoder().decode(Buffer.concat(chunks)),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () =>
      req.destroy(new FeedError("That calendar took too long to answer. Try again later.")),
    );
    req.on("error", (error) =>
      reject(
        error instanceof FeedError
          ? error
          : new FeedError("That link didn't work. Copy it again from your calendar."),
      ),
    );
    req.end();
  });
}
