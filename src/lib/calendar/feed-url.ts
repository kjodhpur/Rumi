import { isIP } from "node:net";

/** https URL for a calendar feed (webcal:// becomes https://), or null if unusable. */
export function normalizeFeedUrl(raw: string): URL | null {
  const trimmed = raw.trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.port && url.port !== "443") return null;
  if (
    isIP(url.hostname.replace(/^\[|\]$/g, "")) &&
    !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ""))
  )
    return null;
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) return null;
  return url;
}

function ipv4Public(ip: string) {
  const [a = 0, b = 0] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  return true;
}

/** False for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isPublicAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4Public(ip);
  if (version !== 6) return false;
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Public(mapped[1]!);
  if (lower === "::" || lower === "::1") return false;
  if (/^f[cd]/.test(lower)) return false; // unique local
  if (/^fe[89ab]/.test(lower)) return false; // link-local
  if (/^ff/.test(lower)) return false; // multicast
  if (lower.startsWith("64:ff9b:") || lower.startsWith("2001:db8")) return false;
  return true;
}
