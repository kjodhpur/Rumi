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
import { MAX_MEDIA_BYTES, MAX_MEDIA_DURATION_SECONDS, validateMediaUpload } from "@/lib/media/validation";
import { deleteProfileMedia, reportProfileMedia, saveProfileMedia, type ProfileMediaInfo } from "@/app/actions/profile-media";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/** The intro clip on a profile: native, keyboard-accessible controls plus the transcript. */
export function ProfileMediaIntro({ media, isSelf }: { media: ProfileMediaInfo; isSelf: boolean }) {
  const router = useRouter();
  const [reporting, setReporting] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const transcriptId = React.useId();

  async function remove() {
    setPending(true);
    const r = await deleteProfileMedia();
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Intro removed");
    router.refresh();
  }

  return (
    <figure className="rounded-lg bg-surface p-4 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="flex items-center gap-1.5 text-body-sm font-medium text-ink">
          {media.kind === "video" ? <Video className="size-4 text-ink-3" aria-hidden /> : <Mic className="size-4 text-ink-3" aria-hidden />}
          {media.kind === "video" ? "Video intro" : "Voice intro"} · {media.durationSeconds}s
        </figcaption>
        {isSelf ? (
          <Button variant="ghost" size="icon-sm" aria-label="Remove your intro" loading={pending} onClick={() => void remove()}>
            <Trash2 aria-hidden />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setReporting(true)}>
            <Flag aria-hidden /> Report
          </Button>
        )}
      </div>
      <div className="mt-3 overflow-hidden rounded-md bg-surface-sunken">
        {media.kind === "video" ? (
          <video src={media.signedUrl} controls playsInline preload="metadata" aria-describedby={transcriptId} className="aspect-video w-full bg-ink">
            <track kind="captions" label="Transcript" default={false} />
          </video>
        ) : (
          <audio src={media.signedUrl} controls preload="metadata" aria-describedby={transcriptId} className="w-full" />
        )}
      </div>
      <details className="mt-3 group">
        <summary className="cursor-pointer rounded-sm text-caption font-medium text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-focus">Transcript</summary>
        <p id={transcriptId} className="mt-2 whitespace-pre-wrap text-body-sm text-ink-2">
          {media.transcript}
        </p>
      </details>
      {!isSelf ? <ReportSheet open={reporting} onOpenChange={setReporting} ownerId={media.userId} /> : null}
    </figure>
  );
}

function ReportSheet({ open, onOpenChange, ownerId }: { open: boolean; onOpenChange: (o: boolean) => void; ownerId: string }) {
  const router = useRouter();
  const [reason, setReason] = React.useState<"inappropriate" | "harassment" | "spam" | "not_them" | "other">("inappropriate");
  const [pending, setPending] = React.useState(false);
  async function submit() {
    setPending(true);
    const r = await reportProfileMedia({ ownerId, reason });
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Thanks. We'll review it.");
    onOpenChange(false);
    router.refresh();
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Report this intro" description="Reports are confidential. Two reports hide a clip until it's reviewed." footer={<Button block loading={pending} onClick={() => void submit()}>Send report</Button>}>
      <ChoiceChips
        aria-label="Reason"
        value={reason}
        onValueChange={setReason}
        options={[
          { value: "inappropriate", label: "Inappropriate" },
          { value: "harassment", label: "Harassment" },
          { value: "spam", label: "Spam or a scam" },
          { value: "not_them", label: "Not this person" },
          { value: "other", label: "Something else" },
        ]}
      />
    </Sheet>
  );
}

const pickMime = (kind: "video" | "audio") => {
  const options = kind === "video" ? ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"] : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
};

/** Record in the browser (MediaRecorder) or upload an MP4/WebM clip, with a required transcript. */
export function MediaUploader() {
  const router = useRouter();
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
      stream.current = await navigator.mediaDevices.getUserMedia(kind === "video" ? { video: { width: 640, height: 480 }, audio: true } : { audio: true });
    } catch {
      return setError("Allow camera or microphone access in your browser to record, or upload a clip instead.");
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
      const blob = new Blob(chunks, { type: (rec.mimeType || mime || `${kind}/webm`).split(";")[0] });
      setClip({ blob, url: URL.createObjectURL(blob), seconds: Math.min(MAX_MEDIA_DURATION_SECONDS, Math.round((Date.now() - began) / 1000)) });
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
    if (file.size > MAX_MEDIA_BYTES) return setError("Clips can be up to 20 MB.");
    const check = validateMediaUpload({ mimeType: file.type, sizeBytes: file.size });
    if (!check.valid) return setError(check.error ?? "Use an MP4 or WebM clip.");
    const url = URL.createObjectURL(file);
    const probe = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const seconds = Math.round(probe.duration);
      if (Number.isFinite(seconds) && seconds > MAX_MEDIA_DURATION_SECONDS) return setError(`That clip is ${seconds}s. Trim it to ${MAX_MEDIA_DURATION_SECONDS}s or less.`);
      setKind(file.type.startsWith("video/") ? "video" : "audio");
      setClip({ blob: file, url, seconds: Number.isFinite(seconds) ? seconds : 0 });
    };
    probe.onerror = () => setError("We couldn't read that file. Try an MP4 or WebM clip.");
    probe.src = url;
  }

  async function save() {
    if (!clip) return;
    const check = validateMediaUpload({ mimeType: clip.blob.type, sizeBytes: clip.blob.size, transcript });
    if (!check.valid) return setError(check.error ?? "Check the clip and transcript.");
    setPending(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      return setError("Please sign in again.");
    }
    const ext = clip.blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage.from("intros-media").upload(path, clip.blob, { contentType: clip.blob.type.split(";")[0], upsert: false });
    if (upload.error) {
      setPending(false);
      return setError("Upload failed. Check your connection and try again.");
    }
    const result = await saveProfileMedia({ path, transcript });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success("Intro added to your profile");
    setOpen(false);
    setTranscript("");
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Upload aria-hidden /> Add intro
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Add a video or voice intro"
        description={`Up to ${MAX_MEDIA_DURATION_SECONDS} seconds. Only verified students who can see your profile can play it.`}
        footer={<Button block loading={pending} disabled={!clip || recording} onClick={() => void save()}>Save intro</Button>}
      >
        <div className="flex flex-col gap-5">
          <SegmentedControl aria-label="How" value={mode} onValueChange={(m) => { stop(); setMode(m); setClip(null); }} options={[{ value: "record", label: "Record" }, { value: "upload", label: "Upload" }]} />
          {mode === "record" ? (
            <div className="flex flex-col gap-3">
              <SegmentedControl aria-label="Type" size="sm" value={kind} onValueChange={(k) => { stop(); setKind(k); setClip(null); }} options={[{ value: "video", label: "Video" }, { value: "audio", label: "Voice only" }]} />
              {kind === "video" ? <video ref={preview} muted playsInline className="aspect-video w-full rounded-md bg-ink" aria-label="Camera preview" /> : null}
              <div className="flex items-center gap-3">
                {recording ? (
                  <Button variant="danger" onClick={stop}>
                    <Square aria-hidden /> Stop
                  </Button>
                ) : (
                  <Button onClick={() => void start()}>
                    <Circle aria-hidden /> {clip ? "Record again" : "Start recording"}
                  </Button>
                )}
                <span className="text-body-sm text-ink-2 tabular-nums" aria-live="polite">
                  {recording ? `${elapsed}s of ${MAX_MEDIA_DURATION_SECONDS}s` : ""}
                </span>
              </div>
            </div>
          ) : (
            <Field label="Clip" hint="MP4 or WebM, video or audio, up to 20 MB.">
              {({ id, describedBy }) => <input id={id} aria-describedby={describedBy} type="file" accept="video/mp4,video/webm,audio/mp4,audio/webm" onChange={(e) => choose(e.target.files?.[0])} className="text-body-sm text-ink-2 file:mr-3 file:h-9 file:rounded-full file:border-0 file:bg-surface-sunken file:px-4 file:text-body-sm file:font-medium file:text-ink" />}
            </Field>
          )}
          {clip ? (
            kind === "video" ? <video src={clip.url} controls playsInline className="aspect-video w-full rounded-md bg-ink" /> : <audio src={clip.url} controls className="w-full" />
          ) : null}
          <Field label="Transcript" hint="Required, so everyone can follow along. What do you say in the clip?">
            {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={3} maxLength={1000} value={transcript} onChange={(e) => setTranscript(e.target.value)} />}
          </Field>
          {error ? <p role="alert" className="text-body-sm text-danger">{error}</p> : null}
        </div>
      </Sheet>
    </>
  );
}
