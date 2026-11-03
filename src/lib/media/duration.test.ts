import { describe, expect, it } from "vitest";
import { mediaDurationSeconds, sniffContainer } from "./duration";

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const box = (type: string, body: number[]) => [...be32(8 + body.length), ...[...type].map((c) => c.charCodeAt(0)), ...body];

function mp4(seconds: number, timescale = 1000) {
  const mvhd = box("mvhd", [0, 0, 0, 0, ...be32(0), ...be32(0), ...be32(timescale), ...be32(Math.round(seconds * timescale)), ...new Array(80).fill(0)]);
  return new Uint8Array([...box("ftyp", [...[..."isom"].map((c) => c.charCodeAt(0)), 0, 0, 2, 0]), ...box("moov", mvhd)]);
}

// EBML helpers: 1-byte sizes are enough for these fixtures (marker 0x80 | size).
const el = (id: number[], body: number[]) => [...id, 0x80 | body.length, ...body];
const f64 = (n: number) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, n);
  return [...b];
};

function webm(opts: { durationMs?: number; clusters?: { timecode: number; blocks: number[] }[] }) {
  const header = el([0x1a, 0x45, 0xdf, 0xa3], el([0x42, 0x82], [..."webm"].map((c) => c.charCodeAt(0))));
  const info = el([0x15, 0x49, 0xa9, 0x66], [...el([0x2a, 0xd7, 0xb1], [0x0f, 0x42, 0x40]), ...(opts.durationMs !== undefined ? el([0x44, 0x89], f64(opts.durationMs)) : [])]);
  const clusters = (opts.clusters ?? []).flatMap((c) =>
    el([0x1f, 0x43, 0xb6, 0x75], [...el([0xe7], [c.timecode >> 8, c.timecode & 255]), ...c.blocks.flatMap((rel) => el([0xa3], [0x81, (rel >> 8) & 255, rel & 255, 0x80, 0, 0]))]),
  );
  // Segment with unknown size (0x01FFFFFFFFFFFFFF), as MediaRecorder writes it.
  return new Uint8Array([...header, 0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, ...info, ...clusters]);
}

describe("media duration", () => {
  it("recognises MP4 and WebM and nothing else", () => {
    expect(sniffContainer(mp4(5))).toBe("mp4");
    expect(sniffContainer(webm({ durationMs: 1000 }))).toBe("webm");
    expect(sniffContainer(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(mediaDurationSeconds(new TextEncoder().encode("not a video at all"))).toBeNull();
  });

  it("reads the MP4 movie header", () => {
    expect(mediaDurationSeconds(mp4(12.5))).toBeCloseTo(12.5, 3);
    expect(mediaDurationSeconds(mp4(31, 600))).toBeCloseTo(31, 3);
  });

  it("reads WebM Duration when present", () => {
    expect(mediaDurationSeconds(webm({ durationMs: 28_000 }))).toBeCloseTo(28, 3);
  });

  it("falls back to the last block's timecode for recorder output without a Duration", () => {
    const clip = webm({ clusters: [{ timecode: 0, blocks: [0, 1000, 2000] }, { timecode: 30_000, blocks: [0, 1500] }] });
    expect(mediaDurationSeconds(clip)).toBeCloseTo(31.5, 3);
  });
});
