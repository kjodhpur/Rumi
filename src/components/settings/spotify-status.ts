"use client";

import { toast } from "sonner";

const STATUS: Record<string, { tone: "success" | "error" | "info"; title: string; description?: string }> = {
  connected: { tone: "success", title: "Spotify connected", description: "Your top artists are on your profile and your matches are re-ranked." },
  cancelled: { tone: "info", title: "Spotify wasn't connected", description: "No changes were made." },
  error: { tone: "error", title: "Couldn't connect Spotify", description: "Something went wrong on the way back. Please try again." },
  unavailable: { tone: "info", title: "Spotify isn't available yet", description: "It hasn't been set up for Rumi on this server." },
};

/** Toasts the result of the Spotify OAuth round trip (`?spotify=…`). Returns whether one was shown. */
export function showSpotifyStatus(status: string | null | undefined) {
  const entry = status ? STATUS[status] : undefined;
  if (!entry) return false;
  const show = entry.tone === "success" ? toast.success : entry.tone === "error" ? toast.error : toast;
  show(entry.title, { id: "spotify-status", description: entry.description });
  return true;
}
