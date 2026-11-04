"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Circle, Flag, Mic, Square, Trash2, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ChoiceChips } from "@/components/ui/choice";
import {
  MAX_MEDIA_BYTES,
  MAX_MEDIA_DURATION_SECONDS,
  validateMediaUpload,
} from "@/lib/media/validation";
import {
  deleteProfileMedia,
  reportProfileMedia,
  saveProfileMedia,
  type ProfileMediaInfo,
} from "@/app/actions/profile-media";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLocalizeError, useT } from "@/components/providers/i18n";

/** The intro clip on a profile: native, keyboard-accessible controls plus the transcript. */
export function ProfileMediaIntro({ media, isSelf }: { media: ProfileMediaInfo; isSelf: boolean }) {
  const router = useRouter();
  const t = useT("profile");
  const [reporting, setReporting] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const transcriptId = React.useId();

  async function remove() {
    setPending(true);
    const r = await deleteProfileMedia();
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success(t("media.removed"));
    router.refresh();
  }

  return (
    <figure className="rounded-lg bg-surface p-4 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="flex items-center gap-1.5 text-body-sm font-medium text-ink">
          {media.kind === "video" ? (
            <Video className="size-4 text-ink-3" aria-hidden />
          ) : (
            <Mic className="size-4 text-ink-3" aria-hidden />
          )}
          {media.kind === "video" ? t("media.video") : t("media.voice")} · {media.durationSeconds}s
        </figcaption>
        {isSelf ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("media.removeYours")}
            loading={pending}
            onClick={() => void remove()}
          >
            <Trash2 aria-hidden />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setReporting(true)}>
            <Flag aria-hidden /> {t("media.reportShort")}
          </Button>
        )}
      </div>
      <div className="mt-3 overflow-hidden rounded-md bg-surface-sunken">
        {media.kind === "video" ? (
          <video
            src={media.signedUrl}
            controls
            playsInline
            preload="metadata"
            aria-describedby={transcriptId}
            className="aspect-video w-full bg-ink"
          >
            <track kind="captions" label={t("media.transcript")} default={false} />
          </video>
        ) : (
          <audio
            src={media.signedUrl}
            controls
            preload="metadata"
            aria-describedby={transcriptId}
            className="w-full"
          />
        )}
      </div>
      <details className="group mt-3">
        <summary className="cursor-pointer rounded-sm text-caption font-medium text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-focus">
          {t("media.transcript")}
        </summary>
        <p id={transcriptId} className="mt-2 text-body-sm whitespace-pre-wrap text-ink-2">
          {media.transcript}
        </p>
      </details>
      {!isSelf ? (
        <ReportSheet open={reporting} onOpenChange={setReporting} ownerId={media.userId} />
      ) : null}
    </figure>
  );
}

function ReportSheet({
  open,
  onOpenChange,
  ownerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ownerId: string;
}) {
  const router = useRouter();
  const t = useT("profile");
  const [reason, setReason] = React.useState<
    "inappropriate" | "harassment" | "spam" | "not_them" | "other"
  >("inappropriate");
  const [pending, setPending] = React.useState(false);
  async function submit() {
    setPending(true);
    const r = await reportProfileMedia({ ownerId, reason });
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success(t("media.reportThanks"));
    onOpenChange(false);
    router.refresh();
  }
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("media.reportTitle")}
      description={t("media.reportBody")}
      footer={
        <Button block loading={pending} onClick={() => void submit()}>
          {t("media.sendReport")}
        </Button>
      }
    >
      <ChoiceChips
        aria-label={t("media.reason")}
        value={reason}
        onValueChange={setReason}
        options={[
          { value: "inappropriate", label: t("media.reasons.inappropriate") },
          { value: "harassment", label: t("media.reasons.harassment") },
          { value: "spam", label: t("media.reasons.spam") },
          { value: "not_them", label: t("media.reasons.not_them") },
          { value: "other", label: t("media.reasons.other") },
        ]}
      />
    </Sheet>
  );
}

const pickMime = (kind: "video" | "audio") => {
  const options =
    kind === "video"
      ? ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return (
    options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ??
    ""
  );
};

/** Record in the browser (MediaRecorder) or upload an MP4/WebM clip, with a required transcript. */
export function MediaUploader() {
  const router = useRouter();
  const t = useT("profile");
  const localizeError = useLocalizeError();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"record" | "upload">("record");
  const [kind, setKind] = React.useState<"video" | "audio">("video");
  const [clip, setClip] = React.useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [transcript, setTranscript] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const recorder = React.useRef<MediaRecorder | null>(null);
  const stream = React.useRef<MediaStream | null>(null);
  const preview = React.useRef<HTMLVideoElement | null>(null);
  const timer = React.useRef<number | null>(null);

  const stopTracks = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  React.useEffect(() => () => stopTracks(), []);
  React.useEffect(() => {
    if (!open) {
      stopTracks();
      setClip(null);
      setError(null);
      setRecording(false);
    }
  }, [open]);

  async function start() {
    setError(null);
    setClip(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia(
        kind === "video" ? { video: { width: 640, height: 480 }, audio: true } : { audio: true },
      );
    } catch {
      return setError(t("media.permission"));
    }
    if (preview.current && kind === "video") {
      preview.current.srcObject = stream.current;
      void preview.current.play();
    }
    const mime = pickMime(kind);
    const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const began = Date.now();
    rec.onstop = () => {
      const blob = new Blob(chunks, {
        type: (rec.mimeType || mime || `${kind}/webm`).split(";")[0],
      });
      setClip({
        blob,
        url: URL.createObjectURL(blob),
        seconds: Math.min(MAX_MEDIA_DURATION_SECONDS, Math.round((Date.now() - began) / 1000)),
      });
      stopTracks();
      if (preview.current) preview.current.srcObject = null;
    };
    recorder.current = rec;
    rec.start(1000);
    setRecording(true);
    setElapsed(0);
    timer.current = window.setInterval(() => {
      const s = Math.round((Date.now() - began) / 1000);
      setElapsed(s);
      if (s >= MAX_MEDIA_DURATION_SECONDS) stop();
    }, 250);
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    recorder.current?.state === "recording" && recorder.current.stop();
    setRecording(false);
  }

  function choose(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) return setError(t("media.tooBig"));
    const check = validateMediaUpload({ mimeType: file.type, sizeBytes: file.size });
    if (!check.valid) return setError(check.error ? localizeError(check.error) : t("media.format"));
    const url = URL.createObjectURL(file);
    const probe = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const seconds = Math.round(probe.duration);
      if (Number.isFinite(seconds) && seconds > MAX_MEDIA_DURATION_SECONDS)
        return setError(t("media.tooLong", { seconds, max: MAX_MEDIA_DURATION_SECONDS }));
      setKind(file.type.startsWith("video/") ? "video" : "audio");
      setClip({ blob: file, url, seconds: Number.isFinite(seconds) ? seconds : 0 });
    };
    probe.onerror = () => setError(t("media.unreadable"));
    probe.src = url;
  }

  async function save() {
    if (!clip) return;
    const check = validateMediaUpload({
      mimeType: clip.blob.type,
      sizeBytes: clip.blob.size,
      transcript,
    });
    if (!check.valid) return setError(check.error ? localizeError(check.error) : t("media.check"));
    setPending(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      return setError(t("media.signIn"));
    }
    const ext = clip.blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage
      .from("intros-media")
      .upload(path, clip.blob, { contentType: clip.blob.type.split(";")[0], upsert: false });
    if (upload.error) {
      setPending(false);
      return setError(t("media.uploadFailed"));
    }
    const result = await saveProfileMedia({ path, transcript });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success(t("media.added"));
    setOpen(false);
    setTranscript("");
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Upload aria-hidden /> {t("media.addIntro")}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t("media.addTitle")}
        description={t("media.addBody", { max: MAX_MEDIA_DURATION_SECONDS })}
        footer={
          <Button block loading={pending} disabled={!clip || recording} onClick={() => void save()}>
            {t("media.saveIntro")}
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <SegmentedControl
            aria-label={t("media.how")}
            value={mode}
            onValueChange={(m) => {
              stop();
              setMode(m);
              setClip(null);
            }}
            options={[
              { value: "record", label: t("media.record") },
              { value: "upload", label: t("media.upload") },
            ]}
          />
          {mode === "record" ? (
            <div className="flex flex-col gap-3">
              <SegmentedControl
                aria-label={t("media.type")}
                size="sm"
                value={kind}
                onValueChange={(k) => {
                  stop();
                  setKind(k);
                  setClip(null);
                }}
                options={[
                  { value: "video", label: t("media.videoOption") },
                  { value: "audio", label: t("media.voiceOnly") },
                ]}
              />
              {kind === "video" ? (
                <video
                  ref={preview}
                  muted
                  playsInline
                  className="aspect-video w-full rounded-md bg-ink"
                  aria-label={t("media.cameraPreview")}
                />
              ) : null}
              <div className="flex items-center gap-3">
                {recording ? (
                  <Button variant="danger" onClick={stop}>
                    <Square aria-hidden /> {t("media.stop")}
                  </Button>
                ) : (
                  <Button onClick={() => void start()}>
                    <Circle aria-hidden /> {clip ? t("media.recordAgain") : t("media.start")}
                  </Button>
                )}
                <span className="text-body-sm text-ink-2 tabular-nums" aria-live="polite">
                  {recording
                    ? t("media.elapsed", { elapsed, max: MAX_MEDIA_DURATION_SECONDS })
                    : ""}
                </span>
              </div>
            </div>
          ) : (
            <Field label={t("media.clip")} hint={t("media.clipHint")}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  type="file"
                  accept="video/mp4,video/webm,audio/mp4,audio/webm"
                  onChange={(e) => choose(e.target.files?.[0])}
                  className="text-body-sm text-ink-2 file:mr-3 file:h-9 file:rounded-full file:border-0 file:bg-surface-sunken file:px-4 file:text-body-sm file:font-medium file:text-ink"
                />
              )}
            </Field>
          )}
          {clip ? (
            kind === "video" ? (
              <video
                src={clip.url}
                controls
                playsInline
                className="aspect-video w-full rounded-md bg-ink"
              />
            ) : (
              <audio src={clip.url} controls className="w-full" />
            )
          ) : null}
          <Field label={t("media.transcript")} hint={t("media.transcriptHint")}>
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                rows={3}
                maxLength={1000}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            )}
          </Field>
          {error ? (
            <p role="alert" className="text-body-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
