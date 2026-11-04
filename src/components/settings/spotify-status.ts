"use client";

import { toast } from "sonner";
import type { Translator } from "@/lib/i18n/core";

const TONE = {
  connected: "success",
  cancelled: "info",
  error: "error",
  unavailable: "info",
} as const;
type Status = keyof typeof TONE;

/** Toasts the result of the Spotify OAuth round trip (`?spotify=…`). Returns whether one was shown. */
export function showSpotifyStatus(status: string | null | undefined, t: Translator<"accounts">) {
  if (!status || !(status in TONE)) return false;
  const key = status as Status;
  const tone = TONE[key];
  const show = tone === "success" ? toast.success : tone === "error" ? toast.error : toast;
  show(t(`spotifyStatus.${key}`), {
    id: "spotify-status",
    description: t(`spotifyStatus.${key}Hint`),
  });
  return true;
}
