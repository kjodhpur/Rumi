/**
 * Server-side duration for intro clips (Phase 7.8), read from the file itself so a client
 * can't lie about length. Pure: MP4 via the movie header (mvhd), WebM via Segment Info
 * Duration, falling back to the last cluster's timecode (MediaRecorder writes no Duration).
 * Returns seconds, or null when the file isn't a recognisable MP4/WebM.
 */

export type MediaContainer = "mp4" | "webm";

export function sniffContainer(buf: Uint8Array): MediaContainer | null {
  if (buf.length >= 12 && String.fromCharCode(buf[4]!, buf[5]!, buf[6]!, buf[7]!) === "ftyp") return "mp4";
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm";
  return null;
}

const u32 = (b: Uint8Array, o: number) => ((b[o]! << 24) >>> 0) + (b[o + 1]! << 16) + (b[o + 2]! << 8) + b[o + 3]!;
const u64 = (b: Uint8Array, o: number) => u32(b, o) * 2 ** 32 + u32(b, o + 4);

function mp4Duration(buf: Uint8Array): number | null {
  // Walk top-level boxes to moov, then its children to mvhd.
  const find = (start: number, end: number, type: string): [number, number] | null => {
    let o = start;
    while (o + 8 <= end) {
      let size = u32(buf, o);
      const name = String.fromCharCode(buf[o + 4]!, buf[o + 5]!, buf[o + 6]!, buf[o + 7]!);
      let header = 8;
      if (size === 1) {
        size = u64(buf, o + 8);
        header = 16;
      } else if (size === 0) size = end - o;
      if (size < header) return null;
      if (name === type) return [o + header, Math.min(end, o + size)];
      o += size;
    }
    return null;
  };
  const moov = find(0, buf.length, "moov");
  if (!moov) return null;
  const mvhd = find(moov[0], moov[1], "mvhd");
  if (!mvhd) return null;
  const [p] = mvhd;
  const version = buf[p]!;
  if (version === 1) {
    const timescale = u32(buf, p + 20);
    return timescale ? u64(buf, p + 24) / timescale : null;
  }
  const timescale = u32(buf, p + 12);
  return timescale ? u32(buf, p + 16) / timescale : null;
}

/** EBML variable-length integer: returns [value, length]. Marker bit stripped for sizes. */
function vint(buf: Uint8Array, o: number, keepMarker: boolean): [number, number] | null {
  const first = buf[o];
  if (first === undefined || first === 0) return null;
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len += 1;
  if (len > 8 || o + len > buf.length) return null;
  let value = keepMarker ? first : first & (0xff >> len);
  for (let i = 1; i < len; i++) value = value * 256 + buf[o + i]!;
  return [value, len];
}

function readUint(buf: Uint8Array, o: number, len: number) {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + buf[o + i]!;
  return v;
}

function readFloat(buf: Uint8Array, o: number, len: number) {
  const view = new DataView(buf.buffer, buf.byteOffset + o, len);
  return len === 4 ? view.getFloat32(0) : view.getFloat64(0);
}

const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;
const CLUSTER = 0x1f43b675;
const CLUSTER_TIMECODE = 0xe7;
const SIMPLE_BLOCK = 0xa3;
const BLOCK_GROUP = 0xa0;
const BLOCK = 0xa1;

function webmDuration(buf: Uint8Array): number | null {
  let scale = 1_000_000; // ns per tick (default)
  let duration: number | null = null;
  let lastTimecode = -1;
  // Containers we descend into rather than skip.
  const containers = new Set([SEGMENT, INFO, CLUSTER, BLOCK_GROUP]);
  const walk = (start: number, end: number, clusterBase: number) => {
    let o = start;
    while (o < end) {
      const id = vint(buf, o, true);
      if (!id) return;
      const size = vint(buf, o + id[1], false);
      if (!size) return;
      const body = o + id[1] + size[1];
      // Unknown-size elements (all 1s) run to the end of their parent.
      const unknown = size[0] === 2 ** (7 * size[1]) - 1;
      const stop = unknown ? end : Math.min(end, body + size[0]);
      if (id[0] === TIMECODE_SCALE) scale = readUint(buf, body, stop - body);
      else if (id[0] === DURATION) duration = readFloat(buf, body, stop - body);
      else if (id[0] === CLUSTER_TIMECODE) clusterBase = readUint(buf, body, stop - body);
      else if (id[0] === SIMPLE_BLOCK || id[0] === BLOCK) {
        // Track number vint, then a signed 16-bit offset from the cluster timecode.
        const track = vint(buf, body, false);
        if (track && body + track[1] + 2 <= stop) {
          const rel = (buf[body + track[1]]! << 8) | buf[body + track[1] + 1]!;
          lastTimecode = Math.max(lastTimecode, clusterBase + (rel > 0x7fff ? rel - 0x10000 : rel));
        }
      }
      if (containers.has(id[0])) walk(body, stop, id[0] === CLUSTER ? 0 : clusterBase);
      if (unknown && !containers.has(id[0])) return;
      o = stop;
    }
  };
  walk(0, buf.length, 0);
  if (duration !== null && duration > 0) return (duration * scale) / 1e9;
  return lastTimecode >= 0 ? (lastTimecode * scale) / 1e9 : null;
}

export function mediaDurationSeconds(buf: Uint8Array): number | null {
  const kind = sniffContainer(buf);
  if (kind === "mp4") return mp4Duration(buf);
  if (kind === "webm") return webmDuration(buf);
  return null;
}
