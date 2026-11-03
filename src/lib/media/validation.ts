export const MAX_MEDIA_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_MEDIA_DURATION_SECONDS = 30;

export const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm"];
export const ALLOWED_AUDIO_MIMES = [
  "audio/mp4",
  "audio/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
];

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
  const mime = input.mimeType.toLowerCase();

  const isVideo = ALLOWED_VIDEO_MIMES.includes(mime);
  const isAudio = ALLOWED_AUDIO_MIMES.includes(mime);

  if (!isVideo && !isAudio) {
    return {
      valid: false,
      error: "Only MP4 and WebM video, or standard audio clips (MP3, M4A, WebM) are supported.",
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
