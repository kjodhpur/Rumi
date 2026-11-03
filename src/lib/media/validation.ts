export const MAX_MEDIA_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_MEDIA_DURATION_SECONDS = 30;

export const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm"];
/** MP4 or WebM only (spec 7.8); MediaRecorder produces one of these in every major browser. */
export const ALLOWED_AUDIO_MIMES = ["audio/mp4", "audio/webm"];

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  kind?: "video" | "audio";
}

/**
 * Validates file upload for profile video/voice intros.
 */
export function validateMediaUpload(input: {
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  transcript?: string;
}): MediaValidationResult {
  // Browsers report codecs too ("video/webm;codecs=vp9"); only the type matters here.
  const mime = input.mimeType.toLowerCase().split(";")[0]!.trim();

  const isVideo = ALLOWED_VIDEO_MIMES.includes(mime);
  const isAudio = ALLOWED_AUDIO_MIMES.includes(mime);

  if (!isVideo && !isAudio) {
    return {
      valid: false,
      error: "Use an MP4 or WebM clip (video or audio).",
    };
  }

  if (input.sizeBytes > MAX_MEDIA_BYTES) {
    return {
      valid: false,
      error: "Media file exceeds the 20 MB maximum size limit.",
    };
  }

  if (input.durationSeconds !== undefined) {
    if (input.durationSeconds <= 0 || isNaN(input.durationSeconds)) {
      return {
        valid: false,
        error: "Invalid media duration.",
      };
    }
    if (input.durationSeconds > MAX_MEDIA_DURATION_SECONDS) {
      return {
        valid: false,
        error: `Clip duration exceeds the ${MAX_MEDIA_DURATION_SECONDS}-second limit.`,
      };
    }
  }

  if (input.transcript !== undefined) {
    const trimmed = input.transcript.trim();
    if (trimmed.length < 3) {
      return {
        valid: false,
        error: "A brief transcript or description is required for accessibility.",
      };
    }
    if (trimmed.length > 1000) {
      return {
        valid: false,
        error: "Transcript cannot exceed 1,000 characters.",
      };
    }
  }

  return {
    valid: true,
    kind: isVideo ? "video" : "audio",
  };
}
