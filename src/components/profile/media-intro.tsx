"use client";

import * as React from "react";
import { Play, Pause, Volume2, Video, Captions, ChevronDown, ChevronUp, Trash2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_MEDIA_BYTES,
  MAX_MEDIA_DURATION_SECONDS,
  validateMediaUpload,
} from "@/lib/media/validation";
import {
  deleteProfileMedia,
  saveProfileMedia,
  type ProfileMediaInfo,
} from "@/app/actions/profile-media";

interface ProfileMediaIntroProps {
  media: ProfileMediaInfo;
  isSelf?: boolean;
}

export function ProfileMediaIntro({ media, isSelf }: ProfileMediaIntroProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [showTranscript, setShowTranscript] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  function togglePlay() {
    if (media.kind === "video" && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (media.kind === "audio" && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete your intro clip?")) return;
    const res = await deleteProfileMedia();
    if (res.ok) {
      toast("Intro clip removed");
      window.location.reload();
    } else {
      toast("Could not remove clip", { description: res.error });
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <span className="flex items-center gap-1.5 text-body-xs font-semibold uppercase tracking-wider text-accent">
          {media.kind === "video" ? <Video className="size-4" /> : <Volume2 className="size-4" />}
          <span>{media.kind === "video" ? "Video Intro" : "Voice Intro"}</span>
          <span className="text-ink-3">({media.durationSeconds}s)</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2.5 py-1 text-caption-xs font-semibold text-ink-2 hover:bg-surface-hover"
            aria-label="Toggle transcript"
          >
            <Captions className="size-3.5" />
            <span>Transcript</span>
            {showTranscript ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          {isSelf ? (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 text-ink-3 hover:text-rose-600"
              aria-label="Remove clip"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Media Player */}
      <div className="mt-3 overflow-hidden rounded-xl bg-black">
        {media.kind === "video" ? (
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={videoRef}
              src={media.signedUrl}
              playsInline
              onEnded={() => setIsPlaying(false)}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/20"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-white shadow-lg">
                {isPlaying ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-surface-sunken">
            <audio
              ref={audioRef}
              src={media.signedUrl}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex size-10 items-center justify-center rounded-full bg-accent text-white shadow-sm"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
              </button>
              <span className="text-body-sm font-medium text-ink">
                Voice introduction
              </span>
            </div>
            <span className="text-caption text-ink-3">{media.durationSeconds}s</span>
          </div>
        )}
      </div>

      {/* Accessible Transcript Section */}
      {showTranscript ? (
        <div className="mt-3 rounded-xl border border-line bg-surface-sunken p-3 text-body-sm text-ink-2">
          <p className="text-caption-xs font-semibold uppercase tracking-wider text-ink-3">
            Accessibility Transcript
          </p>
          <p className="mt-1 whitespace-pre-wrap">{media.transcript}</p>
        </div>
      ) : null}
    </div>
  );
}

interface MediaUploaderProps {
  onSuccess?: () => void;
}

export function MediaUploader({ onSuccess }: MediaUploaderProps) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [duration, setDuration] = React.useState<number>(0);
  const [transcript, setTranscript] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > MAX_MEDIA_BYTES) {
      toast("File too large", { description: "Maximum file size is 20 MB." });
      return;
    }

    // Determine duration via audio/video element
    const isVideo = f.type.startsWith("video/");
    const el = document.createElement(isVideo ? "video" : "audio");
    el.preload = "metadata";
    el.src = URL.createObjectURL(f);
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      const dur = Math.round(el.duration);
      if (dur > MAX_MEDIA_DURATION_SECONDS) {
        toast("Clip exceeds 30 seconds", {
          description: `Your clip is ${dur}s long. Please trim to ≤ 30s.`,
        });
        return;
      }
      setDuration(dur);
      setFile(f);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || duration <= 0) {
      toast("Please select a valid clip under 30 seconds");
      return;
    }

    const validation = validateMediaUpload({
      mimeType: file.type,
      sizeBytes: file.size,
      durationSeconds: duration,
      transcript,
    });

    if (!validation.valid || !validation.kind) {
      toast("Invalid upload", { description: validation.error });
      return;
    }

    setLoading(true);
    try {
      // Storage path
      const ext = file.name.split(".").pop() || "mp4";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `intros/${filename}`;

      // Call action
      const res = await saveProfileMedia(validation.kind, path, duration, transcript);
      if (res.ok) {
        toast("Intro clip published!");
        setOpen(false);
        setFile(null);
        setTranscript("");
        onSuccess?.();
        window.location.reload();
      } else {
        toast("Could not save intro", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5"
      >
        <Upload className="size-3.5 text-accent" />
        <span>Add Video/Voice Intro</span>
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Add video or voice intro"
        description="Share a personal 30-second introduction with potential roommates."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-body-xs font-semibold text-ink">Select clip</label>
            <input
              type="file"
              accept="video/mp4,video/webm,audio/mp4,audio/webm,audio/mpeg"
              onChange={handleFileChange}
              className="mt-1.5 block w-full text-caption text-ink-2 file:mr-3 file:rounded-xl file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-caption font-medium hover:file:bg-surface-hover"
              required
            />
            <p className="mt-1 text-caption-xs text-ink-3">
              MP4 or WebM video or audio • Max 30 seconds • Max 20 MB
            </p>
          </div>

          {file ? (
            <div className="rounded-xl border border-line bg-surface-sunken p-3 text-caption text-ink-2">
              <span className="font-semibold text-ink">{file.name}</span>
              <p className="text-caption-xs text-ink-3">
                {(file.size / (1024 * 1024)).toFixed(1)} MB • {duration}s duration
              </p>
            </div>
          ) : null}

          <div>
            <label className="text-body-xs font-semibold text-ink">
              Transcript (required for accessibility)
            </label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="A brief written version of what you say in the clip..."
              className="mt-1"
              rows={3}
              required
            />
            <p className="mt-1 text-caption-xs text-ink-3">
              Provides closed captions for students who are deaf or hard of hearing.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-white hover:opacity-90"
            disabled={loading || !file}
          >
            {loading ? "Publishing clip..." : "Save intro clip"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
