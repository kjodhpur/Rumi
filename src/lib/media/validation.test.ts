import { describe, expect, it } from "vitest";
import {
  MAX_MEDIA_BYTES,
  MAX_MEDIA_DURATION_SECONDS,
  validateMediaUpload,
} from "./validation";

describe("profile media validation", () => {
  it("approves valid MP4 video under 30s and 20MB with transcript", () => {
    const res = validateMediaUpload({
      mimeType: "video/mp4",
      sizeBytes: 5 * 1024 * 1024,
      durationSeconds: 22,
      transcript: "Hi everyone! I'm Jordan, a sophomore majoring in CS.",
    });

    expect(res.valid).toBe(true);
    expect(res.kind).toBe("video");
  });

  it("approves valid audio clip under 30s with transcript", () => {
    const res = validateMediaUpload({
      mimeType: "audio/webm",
      sizeBytes: 800 * 1024,
      durationSeconds: 15,
      transcript: "Hey! Quick intro about my morning routine and hobbies.",
    });

    expect(res.valid).toBe(true);
    expect(res.kind).toBe("audio");
  });

  it("rejects unsupported media formats (e.g. avi, flv, exe)", () => {
    const res = validateMediaUpload({
      mimeType: "video/x-msvideo",
      sizeBytes: 1024 * 1024,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("Only MP4 and WebM");
  });

  it("rejects files exceeding 20 MB limit", () => {
    const res = validateMediaUpload({
      mimeType: "video/mp4",
      sizeBytes: MAX_MEDIA_BYTES + 1,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("20 MB");
  });

  it("rejects durations exceeding 30 seconds", () => {
    const res = validateMediaUpload({
      mimeType: "video/mp4",
      sizeBytes: 5 * 1024 * 1024,
      durationSeconds: MAX_MEDIA_DURATION_SECONDS + 1,
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("30-second limit");
  });

  it("requires a non-empty transcript for accessibility", () => {
    const res = validateMediaUpload({
      mimeType: "video/mp4",
      sizeBytes: 5 * 1024 * 1024,
      durationSeconds: 15,
      transcript: "  ", // Empty
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("transcript or description is required");
  });
});
