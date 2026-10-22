"use client";

import * as React from "react";
import Image from "next/image";
import Cropper, { type Area } from "react-easy-crop";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ImagePlus, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { registerPhoto, removePhoto, reorderPhotos, type PhotoRecord } from "@/app/actions/photos";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const MAX_PHOTOS = 6;
const ASPECT = 4 / 5;
const OUTPUT_WIDTH = 1200;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

interface Uploading {
  key: string;
  preview: string;
}

export function PhotoManager({
  userId,
  photos,
  onChange,
  error,
}: {
  userId: string;
  photos: PhotoRecord[];
  onChange: (photos: PhotoRecord[]) => void;
  error?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [source, setSource] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<Area | null>(null);
  const [uploading, setUploading] = React.useState<Uploading[]>([]);
  const [processing, setProcessing] = React.useState(false);

  const sorted = [...photos].sort((a, b) => a.position - b.position);
  const slotsLeft = MAX_PHOTOS - sorted.length - uploading.length;

  function pickFile() {
    inputRef.current?.click();
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("That file isn't an image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("That photo is over 20 MB. Try a smaller one.");
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSource(URL.createObjectURL(file));
  }

  function closeCropper() {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
  }

  async function confirmCrop() {
    if (!source || !area) return;
    setProcessing(true);
    let rendered: Awaited<ReturnType<typeof renderCrop>>;
    try {
      rendered = await renderCrop(source, area);
    } catch {
      setProcessing(false);
      toast.error("Couldn't read that photo. Try another one.");
      return;
    }
    setProcessing(false);
    closeCropper();

    const key = crypto.randomUUID();
    const preview = URL.createObjectURL(rendered.blob);
    setUploading((u) => [...u, { key, preview }]);

    try {
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = getSupabaseBrowser();
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, rendered.blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (uploadError) throw uploadError;
      const result = await registerPhoto({
        path,
        width: rendered.width,
        height: rendered.height,
        placeholder: rendered.placeholder,
      });
      if (!result.ok) throw new Error(result.error);
      onChange([...photos, result.data]);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading((u) => u.filter((x) => x.key !== key));
      URL.revokeObjectURL(preview);
    }
  }

  async function move(id: string, to: number) {
    const ids = sorted.map((p) => p.id);
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const previous = photos;
    onChange(ids.map((pid, index) => ({ ...photos.find((p) => p.id === pid)!, position: index })));
    const result = await reorderPhotos(ids);
    if (!result.ok) {
      onChange(previous);
      toast.error(result.error);
    }
  }

  async function remove(id: string) {
    const previous = photos;
    const rest = sorted.filter((p) => p.id !== id).map((p, index) => ({ ...p, position: index }));
    onChange(rest);
    const result = await removePhoto(id);
    if (!result.ok) {
      onChange(previous);
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <LayoutGroup>
        <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Your photos">
          <AnimatePresence initial={false} mode="popLayout">
            {sorted.map((photo, index) => (
              <motion.li
                key={photo.id}
                layout
                transition={spring}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-sunken ring-1 ring-line"
              >
                <Image
                  src={photoUrl(photo.storage_path)!}
                  alt={index === 0 ? "Your cover photo" : `Photo ${index + 1}`}
                  fill
                  sizes="(min-width: 640px) 180px, 33vw"
                  className="object-cover"
                  placeholder={photo.placeholder ? "blur" : "empty"}
                  blurDataURL={photo.placeholder ?? undefined}
                />
                {index === 0 ? (
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-micro font-semibold text-white">
                    Cover
                  </span>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Options for photo ${index + 1}`}
                    className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <MoreHorizontal className="size-4" strokeWidth={2} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {index > 0 ? (
                      <DropdownMenuItem onSelect={() => void move(photo.id, 0)}>
                        <Star /> Make cover photo
                      </DropdownMenuItem>
                    ) : null}
                    {index > 0 ? (
                      <DropdownMenuItem onSelect={() => void move(photo.id, index - 1)}>
                        <ArrowLeft /> Move earlier
                      </DropdownMenuItem>
                    ) : null}
                    {index < sorted.length - 1 ? (
                      <DropdownMenuItem onSelect={() => void move(photo.id, index + 1)}>
                        <ArrowRight /> Move later
                      </DropdownMenuItem>
                    ) : null}
                    {sorted.length > 1 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem destructive onSelect={() => void remove(photo.id)}>
                      <Trash2 /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.li>
            ))}
          </AnimatePresence>
          {uploading.map((u) => (
            <li key={u.key} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.preview} alt="" className="size-full object-cover opacity-60" />
              <span className="absolute inset-0 flex items-center justify-center text-white">
                <Spinner className="size-6" label="Uploading photo" />
              </span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, slotsLeft) }).map((_, i) => (
            <li key={`empty-${i}`} className="aspect-[4/5]">
              <button
                type="button"
                onClick={pickFile}
                className={cn(
                  "flex size-full flex-col items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed text-ink-3 outline-none",
                  "transition-colors duration-150 hover:border-ink-3 hover:bg-surface hover:text-ink-2 focus-visible:ring-2 focus-visible:ring-focus",
                  error && i === 0 ? "border-danger text-danger" : "border-line-strong",
                )}
                aria-label="Add a photo"
              >
                <ImagePlus className="size-6" strokeWidth={1.5} aria-hidden />
                {i === 0 ? <span className="text-caption font-medium">Add photo</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </LayoutGroup>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="text-body-sm text-ink-3">
          Clear, recent photos of you. Group shots are fine after the first. Up to {MAX_PHOTOS}.
        </p>
      )}

      <Sheet
        open={Boolean(source)}
        onOpenChange={(open) => !open && closeCropper()}
        title="Crop your photo"
        description="Drag to reposition. Pinch or use the slider to zoom."
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={closeCropper}>
              Cancel
            </Button>
            <Button size="lg" className="flex-1" onClick={() => void confirmCrop()} loading={processing}>
              Use photo
            </Button>
          </div>
        }
      >
        {source ? (
          <div className="flex flex-col gap-4">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-lg bg-black">
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                objectFit="cover"
                showGrid={false}
              />
            </div>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={([z]) => setZoom(z)}
              thumbLabels={["Zoom"]}
              className="mx-auto max-w-[360px]"
            />
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Crops, downsizes to a sensible width, encodes JPEG, and makes a tiny blur placeholder. */
async function renderCrop(src: string, area: Area) {
  const img = await loadImage(src);
  const width = Math.min(OUTPUT_WIDTH, Math.round(area.width));
  const height = Math.round(width / ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.86),
  );

  const tiny = document.createElement("canvas");
  tiny.width = 12;
  tiny.height = 15;
  tiny.getContext("2d")?.drawImage(canvas, 0, 0, 12, 15);
  const placeholder = tiny.toDataURL("image/jpeg", 0.6);

  return { blob, width, height, placeholder };
}
