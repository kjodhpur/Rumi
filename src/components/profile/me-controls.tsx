"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount, setPaused } from "@/app/actions/onboarding";
import {
  disconnectSpotifyAction,
  refreshSpotifyAction,
} from "@/app/actions/spotify";
import { Button } from "@/components/ui/button";

export function MeControls({
  paused,
  spotifyConnected,
}: {
  paused: boolean;
  spotifyConnected: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className="space-y-3 rounded-2xl border border-rumi-sand bg-white p-5">
      <h2 className="font-display text-xl text-asu-maroon">Account</h2>
      <p className="text-sm text-rumi-muted">
        Pause your profile when you find a roommate (you disappear from matches).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setPaused(!paused);
              router.refresh();
            })
          }
        >
          {paused ? "Unpause profile" : "I found a roommate (pause)"}
        </Button>
        {spotifyConnected ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await refreshSpotifyAction();
                  router.refresh();
                })
              }
            >
              Refresh Spotify
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await disconnectSpotifyAction();
                  router.refresh();
                })
              }
            >
              Disconnect Spotify
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (
                !confirm(
                  "Delete your Rumi account and all data? This cannot be undone.",
                )
              ) {
                return;
              }
              await deleteAccount();
              router.push("/");
            })
          }
        >
          Delete account
        </Button>
      </div>
    </section>
  );
}
