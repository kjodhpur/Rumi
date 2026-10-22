"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 6;

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  const size = Math.min(crop.width, crop.height);
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    size,
    size,
    0,
    0,
    800,
    800,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/jpeg",
      0.9,
    );
  });
}

export function PhotoUploader({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (urls: string[]) => void;
}) {
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function uploadCropped() {
    if (!rawSrc || !croppedArea) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(rawSrc, croppedArea);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const photoId = crypto.randomUUID();
      const path = `${user.id}/${photoId}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
      onChange([...photos, pub.publicUrl].slice(0, MAX_PHOTOS));
      setRawSrc(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 rounded bg-ink/70 px-1.5 text-[10px] text-white"
              onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
            {i === 0 ? (
              <span className="font-ui absolute bottom-1 left-1 rounded bg-accent px-1 text-[9px] text-accent-contrast">
                Primary
              </span>
            ) : null}
          </div>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <label className="font-ui flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-border-strong text-xs text-ink-muted hover:bg-bg-muted">
            + Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setRawSrc(String(reader.result));
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      <p className="text-xs text-ink-muted">Up to {MAX_PHOTOS} photos. Crop to a square — first is primary.</p>

      {rawSrc ? (
        <div className="space-y-3 rounded-lg border border-border bg-bg-elevated p-3">
          <div className="relative h-64 w-full overflow-hidden rounded-md bg-bg-muted">
            <Cropper
              image={rawSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <label className="font-ui flex items-center gap-3 text-sm">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" disabled={busy} onClick={uploadCropped}>
              {busy ? "Uploading…" : "Use photo"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRawSrc(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
